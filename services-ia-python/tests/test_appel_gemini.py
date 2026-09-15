"""
Tests de l'enrobage commun des appels au fournisseur.

Aucun appel réel ici : un faux client suffit, parce que ce qui est éprouvé
n'est pas la qualité d'une réponse mais la fidélité de la trace. Les
vérifications contre le vrai Gemini vivent dans les fichiers `*_reel.py`.

Deux propriétés sont surveillées de près, parce qu'elles sont faciles à
casser sans que rien ne le signale :

  - **le modèle servi n'est pas le modèle demandé** — c'est tout l'objet du
    champ `served_model`, et le confondre avec `requested_model` viderait la
    traçabilité de son sens ;
  - **un compteur absent reste nul** — le remplacer par zéro affirmerait
    qu'aucun jeton n'a été consommé, ce qui est une autre affirmation.
"""

import asyncio
import logging

import pytest

from app.services.appel_gemini import (
    PROVIDER,
    AppelTrace,
    StatutAppel,
    TypeErreurAppel,
    appeler_gemini,
    classer_erreur,
)
from app.services.gemini_client import GeminiNonConfigure

MODELE_DEMANDE = "gemini-3.5-flash-lite"


def executer(coroutine):
    """
    Exécute une coroutine dans une boucle neuve.

    Le projet n'embarque aucun greffon asyncio pour pytest ; ce helper évite
    d'en ajouter un pour quelques tests.
    """
    return asyncio.run(coroutine)


class _FauxUsage:
    def __init__(self, prompt=None, candidats=None, total=None):
        self.prompt_token_count = prompt
        self.candidates_token_count = candidats
        self.total_token_count = total


class _FauxReponse:
    def __init__(self, *, model_version=MODELE_DEMANDE, response_id="r-123", usage=None,
                 text="{}"):
        self.model_version = model_version
        self.response_id = response_id
        self.usage_metadata = usage
        self.text = text


class _FauxClient:
    """
    Reproduit la seule surface du SDK que l'enrobage touche.

    Il compte ses appels : c'est ainsi qu'on démontre l'absence de reprise
    automatique, laquelle ne se voit pas dans le résultat.
    """

    def __init__(self, reponse=None, erreur=None):
        self._reponse = reponse if reponse is not None else _FauxReponse()
        self._erreur = erreur
        self.appels = []

    @property
    def aio(self):
        return self

    @property
    def models(self):
        return self

    async def generate_content(self, **kwargs):
        self.appels.append(kwargs)
        if self._erreur is not None:
            raise self._erreur
        return self._reponse


def appeler(client, **kwargs):
    parametres = {"agent": "EVIDENCE", "contents": "prompt"}
    parametres.update(kwargs)
    return executer(appeler_gemini(client=client, **parametres))


# --- Ce que la trace rapporte -------------------------------------------


def test_la_trace_porte_l_agent_et_le_fournisseur():
    appel = appeler(_FauxClient(), agent="DOCUMENT")

    assert appel.trace.agent == "DOCUMENT"
    assert appel.trace.provider == PROVIDER
    assert appel.trace.statut is StatutAppel.TERMINE


def test_le_modele_servi_est_lu_sur_la_reponse_pas_sur_la_demande():
    """Le cas qui justifie tout le module : le fournisseur a servi autre chose."""
    client = _FauxClient(_FauxReponse(model_version="gemini-3.6-flash"))

    appel = appeler(client)

    assert appel.trace.requested_model == MODELE_DEMANDE
    assert appel.trace.served_model == "gemini-3.6-flash"


def test_un_ecart_entre_modele_demande_et_servi_est_journalise(caplog):
    client = _FauxClient(_FauxReponse(model_version="gemini-3.6-flash"))

    with caplog.at_level(logging.WARNING, logger="app.services.appel_gemini"):
        appeler(client)

    assert any("Modèle servi différent" in enregistrement.getMessage()
               for enregistrement in caplog.records)


def test_le_response_id_est_repris_tel_quel():
    appel = appeler(_FauxClient(_FauxReponse(response_id="n-eiauSlM7fPvdIPpebtiQo")))

    assert appel.trace.response_id == "n-eiauSlM7fPvdIPpebtiQo"


def test_les_trois_compteurs_de_jetons_sont_releves():
    client = _FauxClient(_FauxReponse(usage=_FauxUsage(prompt=812, candidats=214, total=1026)))

    appel = appeler(client)

    assert appel.trace.usage is not None
    assert appel.trace.usage.prompt_token_count == 812
    assert appel.trace.usage.candidates_token_count == 214
    assert appel.trace.usage.total_token_count == 1026


def test_un_usage_absent_reste_nul_et_ne_devient_pas_zero():
    appel = appeler(_FauxClient(_FauxReponse(usage=None)))

    assert appel.trace.usage is None


def test_un_compteur_manquant_reste_nul_sans_etre_comble():
    client = _FauxClient(_FauxReponse(usage=_FauxUsage(prompt=100, total=150)))

    appel = appeler(client)

    assert appel.trace.usage.candidates_token_count is None
    assert appel.trace.usage.prompt_token_count == 100


def test_la_duree_est_mesuree_et_les_horodatages_sont_ordonnes():
    appel = appeler(_FauxClient())

    assert appel.trace.duration_ms >= 0
    assert appel.trace.finished_at >= appel.trace.started_at
    assert appel.trace.started_at.tzinfo is not None


def test_le_champ_create_time_n_est_jamais_fabrique():
    """
    Le fournisseur rend `create_time` nul — vérifié en phase 5.5.

    La trace n'a donc pas ce champ : en inventer un à partir de l'horloge
    locale le ferait passer pour une donnée fournisseur.
    """
    assert "create_time" not in AppelTrace.model_fields


# --- Ce que l'enrobage transmet -----------------------------------------


def test_le_contenu_et_la_configuration_sont_transmis_sans_relecture():
    client = _FauxClient()
    config = {"response_mime_type": "application/json", "response_schema": {"type": "object"}}

    appeler(client, contents=["binaire", "prompt"], config=config)

    assert client.appels[0]["contents"] == ["binaire", "prompt"]
    assert client.appels[0]["config"] is config


def test_sans_configuration_aucun_argument_config_n_est_passe():
    """Le Document Agent V1 appelle sans `config` ; lui en poser un le changerait."""
    client = _FauxClient()

    appeler(client, config=None)

    assert "config" not in client.appels[0]


def test_le_modele_peut_etre_impose_par_l_appelant():
    client = _FauxClient(_FauxReponse(model_version="gemini-3.6-flash"))

    appel = appeler(client, model="gemini-3.6-flash")

    assert client.appels[0]["model"] == "gemini-3.6-flash"
    assert appel.trace.requested_model == "gemini-3.6-flash"


def test_la_reference_de_piece_est_recopiee_sans_interpretation():
    appel = appeler(_FauxClient(), agent="DOCUMENT", piece_reference="p2")

    assert appel.trace.piece_reference == "p2"


def test_sans_reference_de_piece_le_champ_reste_nul():
    appel = appeler(_FauxClient())

    assert appel.trace.piece_reference is None


# --- Ce qui se passe quand ça échoue ------------------------------------


def test_l_exception_d_origine_est_relancee_telle_quelle():
    """
    Aucun échec n'est converti en succès, ni même en une autre exception.

    Les appelants — routeurs et agents — trient déjà sur le type ; le
    remplacer casserait leur gestion sans rien apporter.
    """
    client = _FauxClient(erreur=GeminiNonConfigure("clé absente"))

    with pytest.raises(GeminiNonConfigure):
        appeler(client)


def test_l_echec_attache_une_trace_lisible_a_l_exception():
    client = _FauxClient(erreur=RuntimeError("panne"))

    with pytest.raises(RuntimeError) as capture:
        appeler(client, agent="RISK")

    trace = capture.value.trace_appel
    assert trace.statut is StatutAppel.ERREUR
    assert trace.agent == "RISK"
    assert trace.served_model is None
    assert trace.usage is None
    assert trace.duration_ms >= 0


def test_aucune_reprise_automatique_apres_un_echec():
    """Un quota dépassé rappelé aussitôt ne ferait qu'aggraver le dépassement."""
    client = _FauxClient(erreur=RuntimeError("429"))

    with pytest.raises(RuntimeError):
        appeler(client)

    assert len(client.appels) == 1


def test_une_cle_api_dans_le_message_d_erreur_n_atteint_pas_la_trace():
    client = _FauxClient(erreur=RuntimeError("refus pour api_key=AIzaSyB1234567890abcdefghijklmnop"))

    with pytest.raises(RuntimeError) as capture:
        appeler(client)

    message = capture.value.trace_appel.error.message
    assert "AIzaSyB1234567890abcdefghijklmnop" not in message
    assert "masqué" in message


# --- Classement des erreurs ---------------------------------------------


def test_une_configuration_absente_est_reconnue():
    assert classer_erreur(GeminiNonConfigure("x")) is TypeErreurAppel.CONFIGURATION_MANQUANTE


def test_une_expiration_reseau_est_reconnue():
    assert classer_erreur(TimeoutError()) is TypeErreurAppel.EXPIRATION


def test_un_statut_429_est_classe_en_quota():
    erreur = RuntimeError("trop de requêtes")
    erreur.code = 429

    assert classer_erreur(erreur) is TypeErreurAppel.QUOTA


def test_un_nom_canonique_dans_le_message_sert_de_repli():
    """
    Quand l'exception ne porte pas de code, le nom `google.rpc.Code` sert.

    C'est une heuristique assumée : on ne lit que les identifiants
    normalisés, jamais la prose autour, laquelle peut changer sans préavis.
    """
    assert classer_erreur(RuntimeError("429 RESOURCE_EXHAUSTED")) is TypeErreurAppel.QUOTA
    assert (
        classer_erreur(RuntimeError("PERMISSION_DENIED"))
        is TypeErreurAppel.AUTHENTIFICATION_FOURNISSEUR
    )


def test_le_code_de_statut_prime_sur_le_texte_du_message():
    """Une donnée structurée l'emporte toujours sur une reconnaissance de texte."""
    erreur = RuntimeError("le message mentionne RESOURCE_EXHAUSTED")
    erreur.code = 404

    assert classer_erreur(erreur) is TypeErreurAppel.MODELE_INDISPONIBLE


def test_une_erreur_inconnue_retombe_sur_interne():
    """Le repli ne doit jamais prétendre en savoir plus qu'il n'en sait."""
    assert classer_erreur(ValueError("cause indéterminée")) is TypeErreurAppel.INTERNE


# --- Intégration : un agent réel traversant l'enrobage ------------------


def test_un_agent_v1_passe_effectivement_par_l_enrobage(monkeypatch):
    """
    Le Document Agent V1 branché sur un faux client.

    Ce test vérifie ce qu'aucun test unitaire de l'enrobage ne peut montrer :
    que l'agent y passe réellement, avec la forme d'appel qui lui est propre
    — un contenu binaire et **aucune** configuration.
    """
    from app.agents import document_agent
    from app.services import appel_gemini as module

    client = _FauxClient(_FauxReponse(text="Résumé factuel du document."))
    monkeypatch.setattr(module, "get_client", lambda: client)

    resume = executer(document_agent.extraire(b"%PDF-1.4 contenu", "application/pdf", "note.pdf"))

    assert resume == "Résumé factuel du document."
    assert len(client.appels) == 1
    assert client.appels[0]["model"] == MODELE_DEMANDE
    assert "config" not in client.appels[0]
