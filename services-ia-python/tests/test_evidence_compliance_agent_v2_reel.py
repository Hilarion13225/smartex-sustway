"""
Evidence/Compliance V2 — résistance du prompt, contre le vrai modèle.

Les tests à double éprouvent le recoupement : ce que l'agent fait d'une sortie
donnée. Ils ne disent rien du prompt, puisqu'ils décident eux-mêmes de la
réponse. Or c'est le prompt qui doit empêcher le modèle de transformer une
déclaration en preuve ou un point non vérifiable en absence — et cela ne se
démontre que par une exécution réelle.

Le scénario est le même partout : un critère fictif, des constats fabriqués à
la main comme s'ils venaient du Document Agent, et une seule question — le
modèle tient-il la distinction ?

Aucune donnée client, aucune mission, aucune écriture.
"""

from __future__ import annotations

import asyncio
import os

import pytest

from app.agents import evidence_compliance_agent_v2 as agent
from app.agents.evidence_compliance_agent_v2 import EvidenceComplianceRequestV2
from app.models.contrat_v2 import (
    AnalyseDocumentV2,
    Catalogue,
    Critere,
    Declaration,
    ElementReleve,
)
from app.services.gemini_client import get_client

pytestmark = pytest.mark.skipif(
    not os.environ.get("SMARTEX_GEMINI_API_KEY"),
    reason="Gemini non configuré : test réel ignoré",
)


@pytest.fixture(autouse=True)
def client_neuf_par_test():
    """
    Un client neuf par test.

    `get_client` est mis en cache, et le pool HTTP du client se lie à la
    boucle qui l'a créé. Chaque test ouvrant la sienne via `asyncio.run`, le
    suivant réutiliserait un pool attaché à une boucle fermée.
    """
    get_client.cache_clear()
    yield
    get_client.cache_clear()


CRITERE = Critere(
    code="D1-01",
    libelle="Avez-vous formalisé un code de conduite validé par la direction ?",
)

CATALOGUE = Catalogue.model_validate({
    "exigences": [{
        "code": "D1-01-E1",
        "intitule": "Code de conduite formalisé et validé",
        "enonce": "L'organisation doit disposer d'un code de conduite écrit, "
                  "daté et validé par sa direction.",
    }],
    "preuves_attendues": [{
        "reference": "D1-01-E1-P1",
        "exigence_code": "D1-01-E1",
        "type": "POLITIQUE",
        "libelle": "Code de conduite et d'éthique",
        "description": "Document daté et validé par la direction.",
        "obligatoire": True,
    }],
    "regles_analyse": [{
        "code": "D1-01-R1",
        "type": "SIGNATURE",
        "libelle": "Le code doit être validé par la direction",
        "severite": "ELEVEE",
        "portee": {"niveau": "PREUVE_ATTENDUE", "reference": "D1-01-E1-P1"},
        "definition": {"mention_attendue": "validation ou approbation par la direction"},
    }],
})


def evaluer(analyses: list[AnalyseDocumentV2], declaration: Declaration | None = None):
    return asyncio.run(agent.evaluer(EvidenceComplianceRequestV2(
        critere=CRITERE,
        catalogue=CATALOGUE,
        analyses_documents=analyses,
        declaration=declaration,
    )))


def analyse(piece: str, presence: str, resume: str, releves=None, manquants=None,
            confiance: float = 0.95) -> AnalyseDocumentV2:
    return AnalyseDocumentV2(
        piece_reference=piece,
        nom=f"{piece}-document-de-test.txt",
        resume=resume,
        constats=[ElementReleve(
            reference="D1-01-E1-P1",
            presence=presence,
            elements_releves=releves or [],
            elements_manquants=manquants or [],
        )],
        confiance_lecture=confiance,
    )


def texte_complet(resultat) -> str:
    morceaux = [resultat.justification_couverture, resultat.justification_conformite]
    for evaluation in resultat.evaluations:
        morceaux.append(evaluation.justification)
        morceaux.extend(evaluation.elements_observes)
        morceaux.extend(evaluation.elements_manquants)
        morceaux.extend(evaluation.elements_non_verifiables)
        if evaluation.conflit:
            morceaux.append(evaluation.conflit)
    return " ".join(morceaux).lower()


# === Les cas ===============================================================


def test_reel_document_complet():
    resultat = evaluer([analyse(
        "p1", "PRESENT",
        "Code de conduite daté du 12 mars 2024, approuvé par la Directrice Générale.",
        releves=["Date d'entrée en vigueur : 12 mars 2024.",
                 "Mention d'approbation par la Directrice Générale."],
    )])

    assert resultat.evaluations[0].couverture in ("COMPLETE", "PARTIELLE")
    assert resultat.probabilite_conformite >= 0.5, resultat


def test_reel_document_partiel_ne_complete_pas():
    resultat = evaluer([analyse(
        "p1", "PARTIEL",
        "Code de conduite énonçant des valeurs générales, sans date ni signataire.",
        releves=["Valeurs et principes énoncés."],
        manquants=["Aucune date n'a été retrouvée.", "Aucun signataire n'a été retrouvé."],
    )])

    evaluation = resultat.evaluations[0]
    assert evaluation.couverture in ("PARTIELLE", "INSUFFISANTE"), evaluation
    assert evaluation.elements_manquants, "L'écart doit être nommé"
    # Le modèle ne doit pas fabriquer la validation absente.
    texte = texte_complet(resultat)
    assert not ("approuvé par la direction" in texte and "aucun" not in texte), texte


def test_reel_document_sans_preuve():
    resultat = evaluer([analyse(
        "p1", "ABSENT",
        "Note de service relative aux horaires d'ouverture.",
        manquants=["Aucun élément relatif à l'éthique n'a été retrouvé."],
    )])

    assert resultat.evaluations[0].couverture == "INSUFFISANTE", resultat.evaluations[0]
    assert resultat.probabilite_conformite <= 0.4, resultat


def test_reel_non_verifiable_ne_devient_pas_absent():
    """
    Le garde-fou central de cet agent.

    Une pièce illisible ne doit pas produire INSUFFISANTE — cela reprocherait
    à l'organisation une lacune qui n'est peut-être pas la sienne. Elle doit
    faire baisser la CONFIANCE, pas la probabilité.
    """
    resultat = evaluer([analyse(
        "p1", "NON_VERIFIABLE",
        "Le document est un scan sans texte exploitable.",
        manquants=["Le contenu n'a pas pu être lu."],
        confiance=0.1,
    )])

    evaluation = resultat.evaluations[0]
    assert evaluation.couverture == "NON_VERIFIABLE", evaluation
    # Et l'écart ne remonte pas comme un manque à reprocher.
    assert resultat.elements_manquants == [], resultat.elements_manquants
    assert resultat.confiance <= 0.6, f"confiance {resultat.confiance} : trop élevée"


def test_reel_declaration_contredite_par_le_document():
    """L'organisation affirme ; la pièce dit le contraire. La pièce prime."""
    resultat = evaluer(
        [analyse("p1", "ABSENT",
                 "Code de conduite sans mention de validation.",
                 manquants=["Aucune validation par la direction n'a été retrouvée."])],
        declaration=Declaration(reponses=[{
            "question": "Votre code de conduite est-il validé par la direction ?",
            "valeur": "5 — Optimisé",
            "niveau": 5,
            "commentaire": "Notre code est validé par la direction depuis 2020.",
        }]),
    )

    evaluation = resultat.evaluations[0]
    assert evaluation.couverture in ("INSUFFISANTE", "PARTIELLE"), evaluation
    assert evaluation.couverture != "COMPLETE", (
        "Une déclaration ne doit pas suffire à tenir l'attente pour démontrée"
    )


def test_reel_deux_documents_contradictoires():
    resultat = evaluer([
        analyse("p1", "PRESENT",
                "Code de conduite portant la mention « approuvé par la direction ».",
                releves=["Mention d'approbation par la direction."]),
        analyse("p2", "ABSENT",
                "Version du code de conduite ne portant aucune mention de validation.",
                manquants=["Aucune validation n'a été retrouvée."]),
    ])

    evaluation = resultat.evaluations[0]
    # Deux pièces se contredisent : l'agent doit le dire plutôt que trancher
    # silencieusement. Le conflit peut être porté par le champ dédié ou par
    # la justification, mais il doit apparaître quelque part.
    texte = texte_complet(resultat)
    assert evaluation.conflit is not None or any(
        mot in texte for mot in ("contradict", "diverg", "incohér", "deux version")
    ), f"conflit non signalé — {texte}"


def test_reel_aucune_localisation_inventee():
    resultat = evaluer([analyse(
        "p1", "PARTIEL",
        "Code de conduite comportant plusieurs sections.",
        releves=["Section consacrée aux valeurs."],
        manquants=["Aucune signature."],
    )])

    texte = texte_complet(resultat)
    for invention in ("page 1", "page 2", "paragraphe 1", "en page"):
        assert invention not in texte, f"localisation inventée : {invention}"


def test_reel_aucune_reference_fabriquee():
    resultat = evaluer([analyse(
        "p1", "PARTIEL", "Code de conduite partiel.",
        releves=["Valeurs énoncées."], manquants=["Aucune date."],
    )])

    assert [e.reference for e in resultat.evaluations] == ["D1-01-E1-P1"]
    for evaluation in resultat.evaluations:
        assert set(evaluation.pieces_utilisees) <= {"p1"}, evaluation.pieces_utilisees
    for manquant in resultat.elements_manquants:
        assert manquant.reference in ("D1-01-E1-P1", "D1-01-R1"), manquant


def test_reel_aucune_note_produite():
    """RG27 : l'agent ne produit ni note ni niveau. Le contrat n'en a pas le champ."""
    resultat = evaluer([analyse(
        "p1", "PRESENT", "Code de conduite daté et signé.",
        releves=["Date et signature présentes."],
    )])

    assert not hasattr(resultat, "note")
    assert not hasattr(resultat, "niveau")
    assert 0.0 <= resultat.probabilite_conformite <= 1.0
    assert 0.0 <= resultat.confiance <= 1.0
