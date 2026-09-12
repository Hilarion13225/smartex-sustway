"""
Résistance aux hallucinations — contre le vrai modèle.

Les tests à double éprouvent le recoupement : ce que l'agent fait d'une sortie
donnée. Ils ne disent rien du prompt, puisqu'ils décident eux-mêmes de la
réponse. Or c'est précisément le prompt qui doit empêcher le modèle de
transformer une attente en constat, et cela ne se démontre que par une
exécution réelle.

Chaque document ci-dessous est synthétique, fictif, et construit pour tendre
un piège précis : mentionner sans démontrer. Aucune donnée client, aucune
mission, aucune écriture — ces tests ne font qu'appeler le modèle et lire sa
réponse.

Ils sont ignorés si Gemini n'est pas configuré. C'est délibéré : une suite qui
échouerait faute de clé sur un poste de développement ferait désactiver le
fichier entier, et la garantie disparaîtrait sans bruit.
"""

from __future__ import annotations

import asyncio
import base64
import os

import pytest

from app.agents import document_agent_v2
from app.agents.document_agent_v2 import AttenteDocumentaire, DocumentAgentRequestV2
from app.models.contrat_v2 import Critere, Piece
from app.services.gemini_client import get_client

pytestmark = pytest.mark.skipif(
    not os.environ.get("SMARTEX_GEMINI_API_KEY"),
    reason="Gemini non configuré : test réel ignoré",
)


@pytest.fixture(autouse=True)
def client_neuf_par_test():
    """
    Un client Gemini neuf pour chaque test.

    `get_client` est mis en cache par `lru_cache`, et le pool de connexions du
    client se lie à la boucle asyncio qui l'a créé. Chaque test ouvrant la
    sienne via `asyncio.run`, le second réutiliserait un pool attaché à une
    boucle déjà fermée — « Event loop is closed », qui n'apprend rien sur
    l'agent. Vider le cache isole les tests les uns des autres.

    Le cache reste pertinent en production, où une seule boucle vit tout le
    temps du service.
    """
    get_client.cache_clear()
    yield
    get_client.cache_clear()

CRITERE = Critere(
    code="D1-01",
    libelle="Avez-vous formalisé un code de conduite et d'éthique validé par la direction ?",
)

ATTENTE = AttenteDocumentaire(
    reference="D1-01-E1-P1",
    type="POLITIQUE",
    libelle="Code de conduite et d'éthique",
    description="Document daté, validé par la direction, couvrant les parties prenantes.",
    obligatoire=True,
    elements_attendus=[
        "validation ou approbation par la direction",
        "date d'entrée en vigueur",
        "parties prenantes internes",
        "parties prenantes externes",
    ],
)


def lire(texte: str, nom: str = "document-de-test.txt"):
    contenu = texte.encode("utf-8")
    demande = DocumentAgentRequestV2(
        piece=Piece(
            reference="p1",
            nom=nom,
            type_mime="text/plain",
            taille=len(contenu),
            contenu_base64=base64.b64encode(contenu).decode("ascii"),
        ),
        critere=CRITERE,
        attentes=[ATTENTE],
    )
    return asyncio.run(document_agent_v2.analyser(demande))


def texte_complet(resultat) -> str:
    """Tout ce que l'agent a écrit, pour y chercher une invention."""
    morceaux = [resultat.resume]
    for constat in resultat.constats:
        morceaux.extend(constat.elements_releves)
        morceaux.extend(constat.elements_manquants)
    return " ".join(morceaux).lower()


# === Les pièges ============================================================


def test_reel_un_seul_mot_ne_fait_pas_une_preuve():
    """« éthique » seul : rien n'est démontré."""
    resultat = lire("Éthique.")

    constat = resultat.constats[0]
    assert constat.reference == "D1-01-E1-P1"
    assert constat.presence in ("ABSENT", "PARTIEL", "NON_VERIFIABLE"), constat
    assert constat.presence != "PRESENT"


def test_reel_une_validation_sans_auteur_nest_pas_une_validation_par_la_direction():
    resultat = lire(
        "POLITIQUE INTERNE\n\n"
        "Le présent document a fait l'objet d'une validation.\n"
        "Il énonce les principes applicables au sein de l'organisation."
    )

    constat = resultat.constats[0]
    assert constat.presence != "PRESENT", constat
    # L'agent ne doit pas attribuer la validation à la direction.
    texte = texte_complet(resultat)
    assert not ("validé par la direction" in texte and "aucun" not in texte), texte


def test_reel_une_politique_sans_signature_ne_devient_pas_signee():
    resultat = lire(
        "CODE DE CONDUITE\n\n"
        "L'organisation s'engage à respecter des principes d'intégrité.\n"
        "Ce document s'applique à l'ensemble des collaborateurs.\n"
        "Aucune autre mention ne figure dans ce document."
    )

    constat = resultat.constats[0]
    assert constat.presence != "PRESENT", constat
    assert constat.elements_manquants, "L'absence de signature doit être relevée"


def test_reel_une_date_isolee_ne_devient_pas_une_date_dentree_en_vigueur():
    resultat = lire(
        "CODE DE CONDUITE\n\n"
        "12/03/2024\n\n"
        "Principes généraux applicables aux collaborateurs."
    )

    texte = texte_complet(resultat)
    # La date existe, mais rien ne dit ce qu'elle représente. L'agent peut la
    # relever ; il ne doit pas la qualifier d'entrée en vigueur.
    assert "entrée en vigueur" not in texte or "aucune" in texte or "ne précise" in texte, texte


def test_reel_un_nom_de_dirigeant_ne_vaut_pas_signature():
    resultat = lire(
        "CODE DE CONDUITE\n\n"
        "Rédigé sous la responsabilité de la Direction Générale.\n"
        "Directrice Générale : A. Koffi\n\n"
        "Principes d'intégrité applicables à tous."
    )

    constat = resultat.constats[0]
    texte = texte_complet(resultat)
    # Un nom mentionné n'est pas une signature apposée.
    assert not ("signé par" in texte and "aucune" not in texte and "non" not in texte), texte
    assert constat.presence != "PRESENT" or constat.elements_manquants, constat


def test_reel_aucune_localisation_inventee():
    """Le contrat n'offre aucun champ de localisation ; le texte ne doit pas en fabriquer."""
    resultat = lire(
        "CODE DE CONDUITE\n\nSection 1 — Valeurs.\nSection 2 — Parties prenantes.\n"
        "Validation : néant."
    )

    texte = texte_complet(resultat)
    for invention in ("page 1", "page 2", "paragraphe 1", "en page"):
        assert invention not in texte, f"localisation inventée : {invention} — {texte}"


def test_reel_un_document_lisible_et_vide_garde_une_confiance_de_lecture_elevee():
    """
    Le point le plus subtil : confiance de LECTURE, pas de conformité.

    Ce document est parfaitement lisible et ne démontre rien. La confiance de
    lecture doit rester haute — la confondre avec la conformité ferait qu'un
    scan net et vide passerait pour aussi probant qu'un document complet.
    """
    resultat = lire(
        "NOTE INTERNE\n\n"
        "Ce document ne contient aucune information relative à l'éthique, "
        "à la conduite des affaires ou aux parties prenantes.\n"
        "Il s'agit d'une note de service concernant les horaires d'ouverture."
    )

    assert resultat.constats[0].presence in ("ABSENT", "NON_VERIFIABLE")
    assert resultat.confiance_lecture is not None
    assert resultat.confiance_lecture >= 0.5, (
        f"Document lisible : la confiance de lecture ne doit pas s'effondrer "
        f"parce que le contenu ne démontre rien ({resultat.confiance_lecture})"
    )


def test_reel_toute_reference_rendue_est_une_reference_soumise():
    resultat = lire("CODE DE CONDUITE\n\nPrincipes d'intégrité. Validation : néant.")

    assert [c.reference for c in resultat.constats] == ["D1-01-E1-P1"]
