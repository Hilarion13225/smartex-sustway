"""
Recommendation V2 — comportement sémantique contre le vrai modèle.

Deux questions, et la seconde compte plus que la première :

  Le modèle nomme-t-il la pièce exacte, ou retombe-t-il dans le conseil
  générique que son prompt lui interdit ?

  Invente-t-il une exigence que le référentiel ne demande pas ?

Le recoupement écarte déjà les actions non rattachables. Ce fichier vérifie
que le modèle n'a pas besoin d'être rattrapé — qu'il produit d'emblée des
actions ancrées dans le contexte fourni.

Fixtures synthétiques, aucune donnée de production, aucune écriture.
"""

from __future__ import annotations

import asyncio
import os

import pytest

from app.agents import recommendation_agent_v2 as agent
from app.agents.recommendation_agent_v2 import RecommendationAgentRequestV2
from app.models.contrat_v2 import (
    Catalogue,
    Critere,
    Declaration,
    EvaluationPreuve,
    Organisation,
    Rattachement,
    ResultatEvidenceV2,
    ResultatRisqueV2,
    SignalRisque,
)
from app.services.gemini_client import get_client

pytestmark = pytest.mark.skipif(
    not os.environ.get("SMARTEX_GEMINI_API_KEY"),
    reason="Gemini non configuré : test réel ignoré",
)


@pytest.fixture(autouse=True)
def client_neuf_par_test():
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
        "definition": {"mention_attendue": "validation par la direction",
                       "elements": ["date d'entrée en vigueur", "signataire"]},
    }],
})

REFERENCES_ADMISES = {"D1-01-E1", "D1-01-E1-P1", "D1-01-R1"}


def recommander(evaluation: EvaluationPreuve, probabilite: float,
                declaration: Declaration | None = None,
                organisation: Organisation | None = None,
                risque: ResultatRisqueV2 | None = None,
                catalogue: Catalogue = CATALOGUE):
    resultat_evidence = ResultatEvidenceV2(
        couverture_preuve=True,
        justification_couverture="Les pièces concernent le critère.",
        probabilite_conformite=probabilite, confiance=0.85,
        justification_conformite="Diagnostic de conformité établi.",
        evaluations=[evaluation],
    )
    return asyncio.run(agent.recommander(RecommendationAgentRequestV2(
        critere=CRITERE, catalogue=catalogue, resultat_evidence=resultat_evidence,
        resultat_risque=risque, declaration=declaration, organisation=organisation)))


def texte_complet(resultat) -> str:
    return " ".join([resultat.pistes_amelioration] +
                    [a.action for a in resultat.actions]).lower()


# === Les cas ===============================================================


def test_reel_conformite_pleine_ne_recommande_rien():
    resultat = recommander(
        EvaluationPreuve(
            reference="D1-01-E1-P1", couverture="COMPLETE", pieces_utilisees=["p1"],
            elements_observes=["Date d'entrée en vigueur : 12 mars 2024.",
                               "Approuvé et signé par la Directrice Générale."],
            justification="L'attente est pleinement démontrée."),
        probabilite=0.95)

    assert resultat.recommandation_necessaire is False, resultat


def test_reel_action_nomme_la_piece_exacte():
    """
    Le point que le V1 ne pouvait pas tenir.

    Son prompt interdisait le conseil générique sans lui donner le référentiel.
    Ici l'agent a les trois niveaux ; sa recommandation doit nommer ce qu'il
    faut produire, pas « améliorer la documentation ».
    """
    resultat = recommander(
        EvaluationPreuve(
            reference="D1-01-E1-P1", couverture="INSUFFISANTE", pieces_utilisees=["p1"],
            elements_manquants=["Aucune validation par la direction n'a été constatée.",
                                "Aucune date d'entrée en vigueur n'a été constatée."],
            justification="Rien de probant n'a été constaté."),
        probabilite=0.1)

    assert resultat.recommandation_necessaire is True
    assert resultat.actions, "Des actions rattachées doivent être produites"
    texte = texte_complet(resultat)
    assert any(mot in texte for mot in ("code de conduite", "direction", "date", "signat")), texte
    # Et le conseil générique doit être absent.
    assert "améliorer la documentation" not in texte


def test_reel_aucune_exigence_inventee():
    """
    L'invariant central.

    Chaque action doit se rattacher à l'une des trois références du contexte.
    Le recoupement écarterait le reste — ce test vérifie qu'il n'a rien à
    écarter, c'est-à-dire que le modèle n'invente pas.
    """
    resultat = recommander(
        EvaluationPreuve(
            reference="D1-01-E1-P1", couverture="INSUFFISANTE", pieces_utilisees=["p1"],
            elements_manquants=["Aucune validation constatée."],
            justification="Rien de probant."),
        probabilite=0.1)

    for action in resultat.actions:
        assert action.rattachement.reference in REFERENCES_ADMISES, action

    texte = texte_complet(resultat)
    for invention in ("iso 26000", "iso 9001", "audit externe", "certification",
                      "article l.", "décret", "amende"):
        assert invention not in texte, f"exigence inventée : {invention} — {texte}"


def test_reel_non_verifiable_appelle_une_piece_lisible():
    """
    Un scan illisible n'appelle pas une action corrective.

    Recommander « mettre en place une validation » reprocherait à
    l'organisation une lacune qui n'est peut-être pas la sienne : ce qui
    manque, c'est un exemplaire exploitable.
    """
    resultat = recommander(
        EvaluationPreuve(
            reference="D1-01-E1-P1", couverture="NON_VERIFIABLE", pieces_utilisees=["p1"],
            elements_non_verifiables=["Le document ne comporte aucun texte exploitable."],
            justification="Les pièces ne permettent pas de conclure."),
        probabilite=0.5)

    texte = texte_complet(resultat)
    assert any(mot in texte for mot in ("lisible", "exploitable", "lisibilité",
                                        "version lisible", "nouvelle copie", "numéris")), texte


def test_reel_preuve_generique_appelle_a_personnaliser():
    resultat = recommander(
        EvaluationPreuve(
            reference="D1-01-E1-P1", couverture="PARTIELLE", pieces_utilisees=["p1"],
            elements_observes=["Formulations générales sur l'éthique."],
            elements_manquants=["Aucun élément propre à l'organisation."],
            justification="Document très générique."),
        probabilite=0.35,
        risque=ResultatRisqueV2(
            signal_risque=True, categorie="PREUVE_GENERIQUE",
            justification="Le document ressemble à un modèle non personnalisé.",
            confiance=0.8,
            signaux=[SignalRisque(
                categorie="PREUVE_GENERIQUE",
                rattachement=Rattachement(niveau="PREUVE_ATTENDUE",
                                          reference="D1-01-E1-P1"),
                justification="Formulations interchangeables d'une organisation à l'autre.")]))

    assert resultat.recommandation_necessaire is True
    texte = texte_complet(resultat)
    assert any(mot in texte for mot in ("personnalis", "propre à", "spécifiqu",
                                        "adapter", "contextualis")), texte


def test_reel_conflit_appelle_a_clarifier():
    resultat = recommander(
        EvaluationPreuve(
            reference="D1-01-E1-P1", couverture="PARTIELLE",
            pieces_utilisees=["p1", "p2"],
            elements_observes=["Une version porte une mention d'approbation."],
            elements_manquants=["Une autre version n'en porte aucune."],
            conflit="p1 porte la mention d'approbation, p2 ne la porte pas.",
            justification="Les deux versions divergent."),
        probabilite=0.4)

    texte = texte_complet(resultat)
    assert any(mot in texte for mot in ("version", "clarifi", "fait foi",
                                        "à jour", "unique", "harmonis")), texte


def test_reel_declaration_non_demontree_appelle_a_documenter():
    resultat = recommander(
        EvaluationPreuve(
            reference="D1-01-E1-P1", couverture="INSUFFISANTE", pieces_utilisees=["p1"],
            elements_manquants=["Aucune validation par la direction n'a été constatée."],
            justification="Rien ne démontre la validation."),
        probabilite=0.15,
        declaration=Declaration(reponses=[{
            "question": "Votre code est-il validé par la direction ?",
            "valeur": "5 — Optimisé", "niveau": 5,
            "commentaire": "Notre code est validé par la direction depuis 2020."}]))

    assert resultat.recommandation_necessaire is True
    # La déclaration ne doit pas être reprise comme un fait acquis qui
    # dispenserait d'agir.
    texte = texte_complet(resultat)
    assert any(mot in texte for mot in ("document", "formalis", "attest", "trace",
                                        "preuve", "justifi", "apposer", "signat")), texte


def test_reel_secteur_rend_le_conseil_applicable_sans_inventer():
    resultat = recommander(
        EvaluationPreuve(
            reference="D1-01-E1-P1", couverture="INSUFFISANTE", pieces_utilisees=["p1"],
            elements_manquants=["Aucune validation constatée."],
            justification="Rien de probant."),
        probabilite=0.15,
        organisation=Organisation(secteur="Agro-industrie"))

    texte = texte_complet(resultat)
    for invention in ("article l.", "décret n", "loi n°", "sanction pénale",
                      "amende de", "certification obligatoire"):
        assert invention not in texte, f"invention réglementaire : {invention}"
    for action in resultat.actions:
        assert action.rattachement.reference in REFERENCES_ADMISES, action


def test_reel_aucune_priorite_ni_delai_produits():
    resultat = recommander(
        EvaluationPreuve(
            reference="D1-01-E1-P1", couverture="INSUFFISANTE", pieces_utilisees=["p1"],
            elements_manquants=["Aucune validation."], justification="Rien de probant."),
        probabilite=0.1)

    assert not hasattr(resultat, "priorite")
    for action in resultat.actions:
        assert not hasattr(action, "priorite")
        assert not hasattr(action, "delai")


def test_reel_toutes_les_actions_survivent_au_recoupement():
    """
    Mesure indirecte de la qualité du prompt.

    Si le modèle rattachait mal, le recoupement écarterait des actions et la
    liste finale serait vide ou amputée. Une liste pleine signifie qu'il a
    ancré ses propositions dans le contexte fourni.
    """
    resultat = recommander(
        EvaluationPreuve(
            reference="D1-01-E1-P1", couverture="INSUFFISANTE", pieces_utilisees=["p1"],
            elements_manquants=["Aucune validation par la direction.",
                                "Aucune date d'entrée en vigueur."],
            justification="Rien de probant."),
        probabilite=0.1)

    assert resultat.recommandation_necessaire is True
    assert len(resultat.actions) >= 1, (
        "Toutes les actions ont été écartées : le modèle rattache mal"
    )
