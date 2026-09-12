"""
Configuration de la journalisation applicative.

Ce service journalise depuis longtemps — `logger.info`, `logger.warning`,
`logger.exception` sont présents dans les agents V2 — mais **rien de tout
cela n'apparaît nulle part**. Uvicorn ne configure que ses propres
enregistreurs (`uvicorn`, `uvicorn.access`) ; le logger racine, lui, n'a
aucun gestionnaire, et Python jette silencieusement tout message qui n'en
trouve pas. Conséquence observée en phase 5.5 : ni les échecs de pipeline,
ni les rejets d'authentification interservice ne laissaient de trace.

`configurer_journalisation()` répare cela en posant un gestionnaire unique
sur la racine. Elle est idempotente : appelée deux fois — au démarrage puis
depuis un test — elle ne double pas les lignes.

Le filtre `MasquageSecrets` est monté sur le gestionnaire, pas sur un
enregistreur particulier : il doit couvrir aussi les messages venus des
bibliothèques tierces, qui n'ont aucune raison de connaître nos règles. Il
constitue un dernier rempart, non une dispense — un message ne doit pas
contenir de secret en premier lieu.
"""

from __future__ import annotations

import logging
import os
import sys

from app.services.assainissement import assainir

FORMAT = "%(asctime)s %(levelname)-8s %(name)s : %(message)s"

# Nom du drapeau posé sur le gestionnaire pour le reconnaître. Comparer sur
# le type ne suffirait pas : uvicorn installe lui aussi des StreamHandler.
_MARQUEUR = "_smartex_journalisation"


class MasquageSecrets(logging.Filter):
    """
    Retire d'un enregistrement les formes reconnues comme sensibles.

    Le message est rendu une première fois ici, puis remplacé par sa version
    assainie et privé de ses arguments : sans cela, le formateur les
    réappliquerait plus tard sur un message qui ne contient plus de
    marqueurs de substitution.

    Le texte n'est pas tronqué : un message applicatif long est légitime, et
    le couper masquerait de l'information utile sans rien protéger de plus.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            rendu = record.getMessage()
        except Exception:  # pragma: no cover - message mal formé
            return True

        assaini = assainir(rendu, tronquer=False)
        if assaini != rendu:
            record.msg = assaini
            record.args = ()

        # `exc_info` porte la pile, dont les repr de variables locales — donc
        # potentiellement un prompt entier ou un document. On la retire :
        # le type et le message assaini restent dans la ligne.
        if record.exc_info:
            record.msg = f"{record.msg} [pile masquée]"
            record.exc_info = None
            record.exc_text = None

        return True


def configurer_journalisation(niveau: str | None = None) -> None:
    """
    Pose un gestionnaire unique sur le logger racine, s'il n'y en a pas déjà.

    Le niveau vient de `SMARTEX_LOG_LEVEL` et vaut `INFO` par défaut. Il
    n'est pas dans `Settings` à dessein : la journalisation doit pouvoir
    être configurée avant que la configuration elle-même ait été lue, sans
    quoi une erreur de configuration resterait invisible.
    """
    racine = logging.getLogger()

    for existant in racine.handlers:
        if getattr(existant, _MARQUEUR, False):
            racine.setLevel(niveau or os.getenv("SMARTEX_LOG_LEVEL", "INFO"))
            return

    gestionnaire = logging.StreamHandler(sys.stdout)
    gestionnaire.setFormatter(logging.Formatter(FORMAT))
    gestionnaire.addFilter(MasquageSecrets())
    setattr(gestionnaire, _MARQUEUR, True)

    racine.addHandler(gestionnaire)
    racine.setLevel(niveau or os.getenv("SMARTEX_LOG_LEVEL", "INFO"))

    # Le SDK HTTP sous-jacent journalise les requêtes sortantes en DEBUG,
    # URL comprise. Le filtre masquerait la clé, mais le plus sûr est que
    # ces lignes ne soient pas produites : on borne ces enregistreurs à
    # WARNING plutôt que de compter sur le masquage.
    for bavard in ("httpx", "httpcore", "google_genai", "google.genai", "urllib3"):
        logging.getLogger(bavard).setLevel(logging.WARNING)
