"""
Point de passage unique vers le fournisseur de modèle.

Neuf appels à `generate_content` existent dans ce service, chacun avec sa
propre gestion — ou son absence — du temps, de l'erreur et de la trace.
Aucun ne relève ce que le fournisseur a réellement servi. Or le modèle
demandé est aujourd'hui `gemini-3.5-flash-lite`, valeur temporaire posée
pour contourner un quota (voir `app/config.py`) : le jour où elle changera,
rien dans les résultats déjà produits ne dira sous quel modèle ils l'ont
été. C'est la raison d'être de ce module.

**Ce module ne connaît pas le métier.** Il ignore ce qu'est un critère, une
exigence, une preuve, un risque ou une recommandation. Il reçoit un contenu
déjà construit, appelle le fournisseur, mesure, et rend la réponse
accompagnée de sa trace. Le sens de ce qui a été demandé reste chez
l'appelant — c'est ce qui permet aux neuf sites d'appel de passer par ici
sans qu'aucune règle métier ne remonte dans cette couche.

Ce qu'il ne fait délibérément pas :

  - **aucune reprise automatique** — un quota dépassé rappelé aussitôt
    aggrave le dépassement, et un appel réussi au second essai masquerait
    une instabilité qu'il faut voir ;
  - **aucune transformation d'échec en succès** — l'exception d'origine est
    relancée telle quelle ;
  - **aucune journalisation du prompt, du contenu, ou de la réponse brute**
    — ils portent les données du client.

La trace suit le contrat arrêté en phase 5.5 §19 (`appels[]`).
"""

from __future__ import annotations

import contextvars
import logging
import re
import time
from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.config import get_settings
from app.services.assainissement import assainir, type_exception
from app.services.gemini_client import GeminiNonConfigure, get_client

logger = logging.getLogger(__name__)

# Version du contrat de trace, distincte de celle du contrat métier V2 : les
# deux évoluent pour des raisons différentes et ne doivent pas se contraindre.
CONTRAT_EXECUTION_VERSION = "1.0"

# Un second fournisseur reste possible ; la constante évite qu'une trace
# devienne ambiguë le jour où il arrive.
PROVIDER = "google-genai"


class StatutAppel(str, Enum):
    TERMINE = "TERMINE"
    ERREUR = "ERREUR"


class TypeErreurAppel(str, Enum):
    """
    Typologie des échecs d'appel (phase 5.5 §11.2).

    Seuls `CONFIGURATION_MANQUANTE` et `EXPIRATION` sont établis avec
    certitude : le premier vient d'une exception que ce service lève
    lui-même, le second d'une expiration réseau standard. Les trois
    catégories fournisseur — quota, authentification, modèle indisponible —
    reposent sur le code de statut HTTP porté par l'exception du SDK, et ce
    point n'a **pas été démontré contre le fournisseur réel** : il n'a été
    éprouvé que contre des exceptions synthétiques en test. Toute erreur non
    reconnue tombe sur `INTERNE`, qui reste le repli sûr.
    """

    CONFIGURATION_MANQUANTE = "CONFIGURATION_MANQUANTE"
    QUOTA = "QUOTA"
    AUTHENTIFICATION_FOURNISSEUR = "AUTHENTIFICATION_FOURNISSEUR"
    MODELE_INDISPONIBLE = "MODELE_INDISPONIBLE"
    EXPIRATION = "EXPIRATION"
    INTERNE = "INTERNE"


# Correspondance entre statut HTTP et catégorie. À CONFIRMER contre le
# fournisseur réel — voir la note de `TypeErreurAppel`.
_STATUTS_HTTP: dict[int, TypeErreurAppel] = {
    401: TypeErreurAppel.AUTHENTIFICATION_FOURNISSEUR,
    403: TypeErreurAppel.AUTHENTIFICATION_FOURNISSEUR,
    404: TypeErreurAppel.MODELE_INDISPONIBLE,
    429: TypeErreurAppel.QUOTA,
}

# Repli sur les noms canoniques de `google.rpc.Code`, cherchés dans le texte
# de l'exception. C'est une heuristique, et elle n'intervient qu'après le
# code de statut : on ne s'appuie sur ces noms que parce qu'ils sont
# normalisés et sans ambiguïté — contrairement au reste du message, qui est
# de la prose fournisseur susceptible de changer sans préavis.
_NOMS_CANONIQUES: tuple[tuple[re.Pattern[str], TypeErreurAppel], ...] = (
    (re.compile(r"\bRESOURCE_EXHAUSTED\b"), TypeErreurAppel.QUOTA),
    (re.compile(r"\bUNAUTHENTICATED\b"), TypeErreurAppel.AUTHENTIFICATION_FOURNISSEUR),
    (re.compile(r"\bPERMISSION_DENIED\b"), TypeErreurAppel.AUTHENTIFICATION_FOURNISSEUR),
    (re.compile(r"\bNOT_FOUND\b"), TypeErreurAppel.MODELE_INDISPONIBLE),
    (re.compile(r"\bDEADLINE_EXCEEDED\b"), TypeErreurAppel.EXPIRATION),
)


class UsageAppel(BaseModel):
    """
    Jetons consommés, tels que rapportés par le fournisseur.

    Les trois compteurs présents ici sont ceux qui se sont révélés
    réellement peuplés lors des vérifications réelles de la phase 5.5. Les
    autres champs exposés par le SDK (`thoughts_token_count`,
    `cached_content_token_count`, `traffic_type`) sont revenus nuls et ne
    sont pas repris : une colonne toujours vide est une fausse promesse.
    """

    model_config = ConfigDict(extra="forbid")

    prompt_token_count: int | None = None
    candidates_token_count: int | None = None
    total_token_count: int | None = None


class ErreurAppel(BaseModel):
    """Cause d'un échec, sous une forme transmissible et déjà assainie."""

    model_config = ConfigDict(extra="forbid")

    type: TypeErreurAppel
    message: str


class AppelTrace(BaseModel):
    """
    Ce qu'un appel au fournisseur laisse comme témoignage.

    `agent` et `piece_reference` sont de simples étiquettes : le module ne
    les interprète pas, il les recopie. C'est ce qui lui permet de rester
    ignorant du métier tout en produisant une trace qui, elle, est lisible
    par le métier.
    """

    model_config = ConfigDict(extra="forbid")

    agent: str
    piece_reference: str | None = None
    statut: StatutAppel
    provider: str = PROVIDER
    requested_model: str
    # Le modèle réellement servi. Nul en cas d'échec — et c'est une
    # information : personne n'a répondu.
    served_model: str | None = None
    response_id: str | None = None
    started_at: datetime
    finished_at: datetime
    duration_ms: int
    usage: UsageAppel | None = None
    error: ErreurAppel | None = None

    def resume_journalisable(self) -> dict[str, Any]:
        """
        Vue destinée au journal : que des identifiants et des mesures.

        Aucun champ de cette vue ne peut porter de donnée client — c'est
        vérifié par un test dédié.
        """
        return {
            "agent": self.agent,
            "piece": self.piece_reference,
            "statut": self.statut.value,
            "provider": self.provider,
            "requested_model": self.requested_model,
            "served_model": self.served_model,
            "response_id": self.response_id,
            "duration_ms": self.duration_ms,
            "total_token_count": self.usage.total_token_count if self.usage else None,
            "error_type": self.error.type.value if self.error else None,
        }


class ResultatAppel(BaseModel):
    """Le couple indissociable rendu par l'enrobage."""

    model_config = ConfigDict(extra="forbid", arbitrary_types_allowed=True)

    reponse: Any = Field(repr=False)
    trace: AppelTrace


def _collecteur_neuf() -> list["AppelTrace"]:
    return []


# Collecte optionnelle des traces, par tâche asyncio.
#
# Les agents ne rendent pas leur trace : leur signature rend un résultat
# métier, et la modifier obligerait à toucher quatre agents figés et
# éprouvés. Un orchestrateur qui a besoin des traces ouvre donc une
# collecte, et l'enrobage y dépose ce qu'il produit.
#
# `ContextVar` et non une variable de module : deux requêtes concurrentes
# doivent avoir chacune la sienne. Une liste partagée mélangerait les
# traces de deux missions, et le défaut ne se verrait que sous charge.
_collecte: contextvars.ContextVar[list["AppelTrace"] | None] = contextvars.ContextVar(
    "smartex_traces_appel", default=None
)


def ouvrir_collecte() -> list["AppelTrace"]:
    """Démarre une collecte de traces pour la tâche courante et la rend."""
    traces: list[AppelTrace] = _collecteur_neuf()
    _collecte.set(traces)
    return traces


def fermer_collecte() -> None:
    """Referme la collecte. À appeler dans un `finally`."""
    _collecte.set(None)


def traces_collectees() -> list["AppelTrace"] | None:
    """La collecte en cours, ou `None` si aucune n'est ouverte."""
    return _collecte.get()


def classer_erreur(exc: BaseException) -> TypeErreurAppel:
    """
    Range une exception dans la typologie, sans jamais deviner au-delà.

    L'ordre est celui de la certitude décroissante : ce que ce service lève
    lui-même, puis les expirations standard, puis le code HTTP du SDK, puis
    le repli.
    """
    if isinstance(exc, GeminiNonConfigure):
        return TypeErreurAppel.CONFIGURATION_MANQUANTE
    if isinstance(exc, TimeoutError):
        return TypeErreurAppel.EXPIRATION

    code = getattr(exc, "code", None)
    if isinstance(code, int) and code in _STATUTS_HTTP:
        return _STATUTS_HTTP[code]

    statut = getattr(exc, "status_code", None)
    if isinstance(statut, int) and statut in _STATUTS_HTTP:
        return _STATUTS_HTTP[statut]

    texte = str(exc)
    for motif, categorie in _NOMS_CANONIQUES:
        if motif.search(texte):
            return categorie

    return TypeErreurAppel.INTERNE


def _lire_usage(reponse: Any) -> UsageAppel | None:
    """
    Relève les compteurs de jetons, sans jamais en inventer.

    `usage_metadata` peut manquer entièrement, et chacun de ses champs peut
    être nul. Un compteur absent reste nul : il n'est pas remplacé par zéro,
    qui affirmerait à tort qu'aucun jeton n'a été consommé.
    """
    metadonnees = getattr(reponse, "usage_metadata", None)
    if metadonnees is None:
        return None

    usage = UsageAppel(
        prompt_token_count=getattr(metadonnees, "prompt_token_count", None),
        candidates_token_count=getattr(metadonnees, "candidates_token_count", None),
        total_token_count=getattr(metadonnees, "total_token_count", None),
    )
    if usage.prompt_token_count is None and usage.total_token_count is None:
        return None
    return usage


def _texte(valeur: Any) -> str | None:
    """Normalise un champ de métadonnée qui peut arriver sous n'importe quoi."""
    if valeur is None:
        return None
    texte = str(valeur).strip()
    return texte or None


async def appeler_gemini(
    *,
    agent: str,
    contents: Any,
    config: Any = None,
    piece_reference: str | None = None,
    model: str | None = None,
    client: Any = None,
) -> ResultatAppel:
    """
    Appelle le fournisseur, mesure, trace, et rend la réponse telle quelle.

    `contents` et `config` sont transmis sans être lus : ce module n'a pas à
    savoir s'il s'agit d'un texte, d'un document binaire ou d'un schéma de
    sortie. Cette indifférence est ce qui permet aux neuf sites d'appel — de
    formes différentes — de partager le même point de passage.

    `client` sert à deux fins. Les tests y substituent un faux client sans
    toucher à la configuration réelle ; les agents V2 y passent le client
    qu'ils ont eux-mêmes résolu, pour que l'absence de configuration reste
    détectée avant l'appel — comportement qu'ils avaient déjà. Nul, le
    client partagé est utilisé.

    L'exception d'origine est relancée intacte en cas d'échec. La trace lui
    est attachée sous `trace_appel` quand c'est possible, pour que
    l'appelant qui rattrape puisse encore la lire — sans que le type de
    l'exception, lui, change.
    """
    settings = get_settings()
    requested_model = model or settings.gemini_model

    started_at = datetime.now(timezone.utc)
    # Deux horloges, chacune pour ce qu'elle sait faire : l'horloge murale
    # date l'appel, l'horloge monotone le mesure. Mesurer une durée sur
    # l'horloge murale la rendrait sensible aux ajustements NTP, et une
    # durée négative dans une trace est indéfendable.
    debut = time.monotonic()

    def _duree() -> int:
        return int((time.monotonic() - debut) * 1000)

    try:
        appelant = client if client is not None else get_client()
        reponse = await appelant.aio.models.generate_content(
            model=requested_model,
            contents=contents,
            **({"config": config} if config is not None else {}),
        )
    except Exception as exc:
        trace = AppelTrace(
            agent=agent,
            piece_reference=piece_reference,
            statut=StatutAppel.ERREUR,
            requested_model=requested_model,
            started_at=started_at,
            finished_at=datetime.now(timezone.utc),
            duration_ms=_duree(),
            error=ErreurAppel(
                type=classer_erreur(exc),
                # Le message du fournisseur peut porter un fragment d'URL
                # authentifiée ou de requête : il ne sort jamais brut.
                message=assainir(f"{type_exception(exc)}: {exc}"),
            ),
        )
        # `logger.error` et non `logger.exception` : la pile complète peut
        # contenir des variables locales rendues par les repr, et le prompt
        # est l'une d'elles. Le type et le message assaini suffisent au
        # diagnostic.
        logger.error("Appel fournisseur en échec : %s", trace.resume_journalisable())
        try:
            exc.trace_appel = trace  # type: ignore[attr-defined]
        except Exception:  # pragma: no cover - exceptions sans __dict__
            pass
        raise

    trace = AppelTrace(
        agent=agent,
        piece_reference=piece_reference,
        statut=StatutAppel.TERMINE,
        requested_model=requested_model,
        # Le seul témoin de ce qui a réellement répondu. S'il diffère du
        # modèle demandé, c'est lui qui fait foi.
        served_model=_texte(getattr(reponse, "model_version", None)),
        response_id=_texte(getattr(reponse, "response_id", None)),
        started_at=started_at,
        finished_at=datetime.now(timezone.utc),
        duration_ms=_duree(),
        usage=_lire_usage(reponse),
    )

    if trace.served_model and trace.served_model != requested_model:
        # Non bloquant, mais jamais silencieux : un basculement de modèle en
        # cours de passe explique des écarts de résultat autrement
        # incompréhensibles.
        logger.warning(
            "Modèle servi différent du modèle demandé : demandé=%s servi=%s agent=%s",
            requested_model,
            trace.served_model,
            agent,
        )

    logger.info("Appel fournisseur : %s", trace.resume_journalisable())

    collecte = _collecte.get()
    if collecte is not None:
        collecte.append(trace)

    return ResultatAppel(reponse=reponse, trace=trace)
