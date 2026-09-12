"""
Assainissement des messages techniques avant journalisation ou exposition.

Une exception venue d'un SDK réseau n'est pas un texte neutre : elle peut
porter un fragment d'URL authentifiée, un en-tête `Authorization`, une clé
d'API reprise de la configuration, ou un extrait de la requête — donc du
contenu client. Le service concatène aujourd'hui ce texte tel quel dans sa
réponse HTTP, ce qui l'expose à l'appelant.

Ce module ne cherche pas à décider si un texte est sensible : il **retire
systématiquement les formes qui le sont**, puis borne la longueur. C'est un
filtre, pas un classificateur — un classificateur se tromperait un jour, un
filtre ne laisse passer que ce qu'il ne reconnaît pas comme dangereux.

Deux usages distincts, et il ne faut pas les confondre :

  `assainir`         pour un journal interne — garde la cause technique
  `message_public`   pour une réponse HTTP — ne garde qu'une phrase générique

Le journal a besoin de la cause pour diagnostiquer ; l'appelant n'en a pas
besoin et ne doit pas l'obtenir.
"""

from __future__ import annotations

import re

REDACTION = "[masqué]"

# Longueur au-delà de laquelle un message est tronqué. Une exception de SDK
# peut embarquer une requête entière ; la borne évite qu'un journal devienne
# le lieu de stockage involontaire d'un payload.
LONGUEUR_MAXIMALE = 400

# Chaque motif vise une forme de secret, pas un secret précis. L'ordre
# compte : les motifs les plus spécifiques d'abord, sans quoi un motif large
# masquerait le contexte qui rend les autres reconnaissables.
_MOTIFS: tuple[tuple[re.Pattern[str], str], ...] = (
    # En-tête d'autorisation, quel que soit le schéma.
    (re.compile(r"(?i)\b(authorization)\s*[:=]\s*\S+"), r"\1: " + REDACTION),
    (re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._\-]+"), "Bearer " + REDACTION),
    # Clés et jetons passés en paramètre — de requête, de formulaire ou JSON.
    (
        re.compile(r"(?i)\b(api[_-]?key|apikey|access[_-]?token|id[_-]?token|"
                   r"refresh[_-]?token|token|secret|password|mot[_-]?de[_-]?passe)"
                   r"\s*[:=]\s*[\"']?[^\s\"'&,;)}\]]+"),
        r"\1=" + REDACTION,
    ),
    # Jeton JWT reconnaissable à sa structure en trois segments.
    (re.compile(r"\beyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]+"), REDACTION),
    # Clé d'API Google : préfixe documenté, suivi d'une longue chaîne opaque.
    (re.compile(r"\bAIza[0-9A-Za-z_\-]{20,}"), REDACTION),
    # Bloc base64 volumineux : un document encodé, jamais autre chose à cette
    # longueur. Le seuil est haut pour ne pas confondre avec un identifiant.
    (re.compile(r"\b[A-Za-z0-9+/]{120,}={0,2}"), "[contenu masqué]"),
    # Clé privée en clair — ne devrait jamais transiter, mais le coût du
    # motif est nul et l'oubli serait irréversible.
    (re.compile(r"(?s)-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----"),
     REDACTION),
)

# Une URL est traitée à part : on garde le schéma et l'hôte — utiles au
# diagnostic — et on retire tout ce qui suit, où vivent les paramètres
# authentifiés.
_URL = re.compile(r"\b(https?://[^\s/?#]+)(?:[^\s]*)")


def assainir(texte: str | None, *, tronquer: bool = True) -> str:
    """
    Retire les formes sensibles d'un texte technique, puis le borne.

    Destiné au journal interne : la cause reste lisible, les secrets non.

    `tronquer=False` sert au filtre global de journalisation, qui traverse
    des messages applicatifs légitimement longs : là, seul le masquage est
    voulu, pas la mise au format d'un message d'exception.
    """
    if not texte:
        return ""

    resultat = str(texte)
    for motif, remplacement in _MOTIFS:
        resultat = motif.sub(remplacement, resultat)
    resultat = _URL.sub(r"\1/…", resultat)

    if not tronquer:
        return resultat

    resultat = " ".join(resultat.split())
    if len(resultat) > LONGUEUR_MAXIMALE:
        resultat = resultat[:LONGUEUR_MAXIMALE] + "…"
    return resultat


def type_exception(exc: BaseException) -> str:
    """Le nom de la classe, seule information de forme utile à l'appelant."""
    return type(exc).__name__


def message_public(exc: BaseException, contexte: str, categorie: str | None = None) -> str:
    """
    Ce que l'appelant HTTP reçoit : le contexte et une catégorie, jamais le détail.

    Le message d'une exception réseau ne renseigne pas utilement l'appelant —
    il ne peut rien en faire — et peut le renseigner sur ce qu'il ne doit pas
    savoir. Une catégorie stable le sert mieux : elle lui permet de
    distinguer un quota épuisé d'une réponse non conforme, ce dont il a
    réellement besoin, sans dépendre de la prose du fournisseur.

    `categorie` vient de `appel_gemini.classer_erreur`. Elle est passée par
    l'appelant plutôt que calculée ici : l'assainissement ne doit rien savoir
    du fournisseur. À défaut, on retombe sur le nom de la classe.
    """
    return f"{contexte} ({categorie or type_exception(exc)})"
