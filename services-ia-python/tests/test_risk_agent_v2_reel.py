"""
Risk Agent V2 — comportement sémantique contre le vrai modèle.

Les tests à double éprouvent le recoupement : ce que l'agent fait d'une sortie
donnée. Ils ne disent rien du prompt, puisqu'ils décident eux-mêmes de la
réponse. Ce fichier éprouve l'autre moitié — le modèle tient-il les
distinctions qu'on lui demande de tenir ?

Trois d'entre elles comptent plus que le reste :

  NON_VERIFIABLE ne doit pas devenir un manquement.
  Une déclaration ne doit pas devenir une preuve.
  Le secteur ne doit pas produire d'obligation légale inventée.

Fixtures synthétiques, aucune donnée de production, aucune écriture.
"""

from __future__ import annotations

import asyncio
import os

import pytest

from app.agents import risk_agent_v2 as agent
from app.agents.risk_agent_v2 import CatalogueRisque, RiskAgentRequestV2
from app.models.contrat_v2 import (
    Critere,
    Declaration,
    EvaluationPreuve,
    Organisation,
    Rattachement,
    ResultatEvidenceV2,
)
from app.services.gemini_client import get_client

pytestmark = pytest.mark.skipif(
    not os.environ.get("SMARTEX_GEMINI_API_KEY"),
    reason="Gemini non configuré : test réel ignoré",
)


@pytest.fixture(autouse=True)
def client_neuf_par_test():
    """Le pool HTTP se lie à la boucle créatrice ; chaque test ouvre la sienne."""
    get_client.cache_clear()
    yield
    get_client.cache_clear()


CRITERE = Critere(
    code="D1-01",
    libelle="Avez-vous formalisé un code de conduite validé par la direction ?",
)

CATALOGUE = CatalogueRisque.model_validate({
    "preuves_attendues": [{
        "reference": "D1-01-E1-P1", "exigence_code": "D1-01-E1",
        "type": "POLITIQUE", "libelle": "Code de conduite et d'éthique",
        "description": "Document daté et validé par la direction.",
        "obligatoire": True,
    }],
    "regles_analyse": [{
        "code": "D1-01-R1", "type": "SIGNATURE",
        "libelle": "Le code doit être validé par la direction",
        "severite": "ELEVEE",
        "portee": {"niveau": "PREUVE_ATTENDUE", "reference": "D1-01-E1-P1"},
        "definition": {"mention_attendue": "validation par la direction"},
    }],
})


def analyser(evaluation: EvaluationPreuve, probabilite: float, confiance: float,
             declaration: Declaration | None = None,
             organisation: Organisation | None = None,
             manquants=None, catalogue: CatalogueRisque = CATALOGUE):
    resultat_evidence = ResultatEvidenceV2(
        couverture_preuve=True,
        justification_couverture="Les pièces concernent le critère.",
        probabilite_conformite=probabilite,
        confiance=confiance,
        justification_conformite="Diagnostic de conformité établi.",
        elements_manquants=manquants or [],
        evaluations=[evaluation],
    )
    return asyncio.run(agent.evaluer(RiskAgentRequestV2(
        critere=CRITERE, catalogue=catalogue, resultat_evidence=resultat_evidence,
        declaration=declaration, organisation=organisation)))


def texte_complet(resultat) -> str:
    morceaux = [resultat.justification or ""]
    for s in resultat.signaux:
        morceaux.append(s.justification)
    return " ".join(morceaux).lower()


# === Les cas ===============================================================


def test_reel_conformite_solide():
    """Une attente pleinement couverte n'est pas un risque."""
    resultat = analyser(
        EvaluationPreuve(
            reference="D1-01-E1-P1", couverture="COMPLETE", pieces_utilisees=["p1"],
            elements_observes=["Date d'entrée en vigueur : 12 mars 2024.",
                               "Approuvé et signé par la Directrice Générale."],
            justification="L'attente est pleinement démontrée."),
        probabilite=0.92, confiance=0.9)

    assert resultat.signal_risque is False, resultat
    assert resultat.signaux == [], resultat.signaux


def test_reel_preuve_absente():
    resultat = analyser(
        EvaluationPreuve(
            reference="D1-01-E1-P1", couverture="INSUFFISANTE", pieces_utilisees=["p1"],
            elements_manquants=["Aucune validation par la direction n'a été constatée.",
                                "Aucune date n'a été constatée."],
            justification="Rien de probant n'a été constaté."),
        probabilite=0.1, confiance=0.9,
        manquants=[Rattachement(niveau="PREUVE_ATTENDUE", reference="D1-01-E1-P1"),
                   Rattachement(niveau="REGLE", reference="D1-01-R1")])

    assert resultat.signal_risque is True, resultat
    assert resultat.signaux, "Un manquement établi doit produire un signal détaillé"
    assert resultat.categorie != "INFORMATION_NON_VERIFIABLE"


def test_reel_preuve_partielle():
    resultat = analyser(
        EvaluationPreuve(
            reference="D1-01-E1-P1", couverture="PARTIELLE", pieces_utilisees=["p1"],
            elements_observes=["Valeurs et principes énoncés."],
            elements_manquants=["Aucun signataire n'a été constaté."],
            justification="Partiellement démontrée."),
        probabilite=0.45, confiance=0.85)

    assert resultat.signal_risque is True, resultat
    # Le signal doit se rattacher à ce qui manque, pas flotter.
    assert any(s.rattachement is not None for s in resultat.signaux), resultat.signaux


def test_reel_non_verifiable_ne_devient_pas_un_manquement():
    """
    Le garde-fou central.

    Une pièce illisible ne prouve aucune lacune. Si le modèle la classe
    INFORMATION_MANQUANTE, la chaîne reproche à l'organisation un mauvais
    scan.
    """
    resultat = analyser(
        EvaluationPreuve(
            reference="D1-01-E1-P1", couverture="NON_VERIFIABLE", pieces_utilisees=["p1"],
            elements_non_verifiables=["Le document ne comporte aucun texte exploitable."],
            justification="Les pièces ne permettent pas de conclure."),
        probabilite=0.5, confiance=0.2)

    categories = {s.categorie for s in resultat.signaux} | {resultat.categorie}
    assert "INFORMATION_MANQUANTE" not in categories, (
        f"Une impossibilité de lecture ne doit pas devenir un manquement — {categories}"
    )
    # L'incertitude doit se lire dans la confiance du diagnostic.
    assert resultat.confiance <= 0.6, f"confiance {resultat.confiance} : trop élevée"


def test_reel_declaration_contradictoire():
    resultat = analyser(
        EvaluationPreuve(
            reference="D1-01-E1-P1", couverture="INSUFFISANTE", pieces_utilisees=["p1"],
            elements_manquants=["Aucune validation par la direction n'a été constatée."],
            justification="Rien ne démontre la validation."),
        probabilite=0.1, confiance=0.9,
        declaration=Declaration(reponses=[{
            "question": "Votre code de conduite est-il validé par la direction ?",
            "valeur": "5 — Optimisé", "niveau": 5,
            "commentaire": "Notre code est validé par la direction depuis 2020."}]))

    assert resultat.signal_risque is True
    categories = {s.categorie for s in resultat.signaux} | {resultat.categorie}
    assert categories & {"CONTRADICTION_AVEC_EVALUATION", "DECLARATION_NON_CORROBOREE",
                         "INFORMATION_MANQUANTE"}, categories
    # La déclaration ne doit pas être reprise comme un fait établi.
    texte = texte_complet(resultat)
    assert not ("est validé par la direction depuis 2020" in texte
                and "déclar" not in texte and "affirm" not in texte), texte


def test_reel_conflit_entre_pieces():
    resultat = analyser(
        EvaluationPreuve(
            reference="D1-01-E1-P1", couverture="PARTIELLE",
            pieces_utilisees=["p1", "p2"],
            elements_observes=["Une version mentionne une approbation."],
            elements_manquants=["Une autre version n'en mentionne aucune."],
            conflit="p1 porte la mention d'approbation, p2 ne la porte pas.",
            justification="Les deux versions divergent."),
        probabilite=0.4, confiance=0.5)

    assert resultat.signal_risque is True
    texte = texte_complet(resultat)
    assert any(mot in texte for mot in ("contradict", "diverg", "incohér", "conflit",
                                        "deux version", "p1", "p2")), texte


def test_reel_secteur_est_exploite_sans_inventer_dobligation():
    """
    Le secteur doit orienter la lecture — sans produire de droit inventé.

    Une référence réglementaire fabriquée dans un rapport d'audit est plus
    dommageable qu'un conseil vague : elle a l'apparence de la précision, et
    un auditeur pourrait la reprendre sans la vérifier.
    """
    resultat = analyser(
        EvaluationPreuve(
            reference="D1-01-E1-P1", couverture="INSUFFISANTE", pieces_utilisees=["p1"],
            elements_manquants=["Aucune validation par la direction n'a été constatée."],
            justification="Rien de probant."),
        probabilite=0.15, confiance=0.9,
        organisation=Organisation(secteur="Agro-industrie"))

    texte = texte_complet(resultat)
    for invention in ("article l.", "décret n", "loi n°", "iso 26000 obligatoire",
                      "sanction pénale", "amende de"):
        assert invention not in texte, f"invention réglementaire : {invention} — {texte}"
    assert resultat.signal_risque is True


def test_reel_secteur_absent_reste_prudent():
    resultat = analyser(
        EvaluationPreuve(
            reference="D1-01-E1-P1", couverture="INSUFFISANTE", pieces_utilisees=["p1"],
            elements_manquants=["Aucune validation constatée."],
            justification="Rien de probant."),
        probabilite=0.15, confiance=0.9, organisation=None)

    # Aucun secteur ne doit être supposé.
    texte = texte_complet(resultat)
    for suppose in ("dans votre secteur", "secteur inconnu", "compte tenu du secteur"):
        assert suppose not in texte, f"secteur supposé : {suppose} — {texte}"


def test_reel_regle_de_severite_elevee_est_prise_en_compte():
    resultat = analyser(
        EvaluationPreuve(
            reference="D1-01-E1-P1", couverture="INSUFFISANTE", pieces_utilisees=["p1"],
            elements_manquants=["Aucune validation par la direction n'a été constatée."],
            justification="La règle de sévérité élevée n'est pas satisfaite."),
        probabilite=0.1, confiance=0.9,
        manquants=[Rattachement(niveau="REGLE", reference="D1-01-R1")])

    assert resultat.signal_risque is True
    # Le signal doit pouvoir se rattacher à la règle ou à la pièce visée.
    references = {s.rattachement.reference for s in resultat.signaux if s.rattachement}
    assert not references or references <= {"D1-01-E1-P1", "D1-01-R1"}, references


def test_reel_aucune_reference_fabriquee():
    resultat = analyser(
        EvaluationPreuve(
            reference="D1-01-E1-P1", couverture="PARTIELLE", pieces_utilisees=["p1"],
            elements_manquants=["Aucune date."], justification="Partielle."),
        probabilite=0.4, confiance=0.8)

    for s in resultat.signaux:
        if s.rattachement:
            assert s.rattachement.reference in ("D1-01-E1-P1", "D1-01-R1"), s
        assert set(s.pieces_concernees) <= {"p1"}, s


def test_reel_aucune_gravite_produite():
    """RG26 : le risque attendu reste calculé côté Java."""
    resultat = analyser(
        EvaluationPreuve(
            reference="D1-01-E1-P1", couverture="INSUFFISANTE", pieces_utilisees=["p1"],
            elements_manquants=["Aucune validation."], justification="Rien de probant."),
        probabilite=0.1, confiance=0.9)

    assert not hasattr(resultat, "gravite")
    assert not hasattr(resultat, "probabilite_risque")
    assert 0.0 <= resultat.confiance <= 1.0
