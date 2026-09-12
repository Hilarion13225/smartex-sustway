"""
Recommendation Agent V2 — nommer l'attendu, et rien de plus.

Gemini est remplacé par un double programmable. La question centrale de ces
tests : une action que le référentiel ne demande pas peut-elle sortir ? La
réponse doit être non, et pas seulement parce qu'on l'a écrit dans le prompt.
"""

from __future__ import annotations

import asyncio
import json

import pytest

from app.agents import recommendation_agent_v2 as agent
from app.agents.recommendation_agent_v2 import RecommendationAgentRequestV2
from app.models.contrat_v2 import (
    AnalyseDocumentV2,
    Catalogue,
    Critere,
    Declaration,
    ElementReleve,
    EvaluationPreuve,
    Organisation,
    ResultatEvidenceV2,
    ResultatRisqueV2,
    SignalRisque,
    Rattachement,
)


def executer(coroutine):
    return asyncio.run(coroutine)


CRITERE = Critere(code="D1-01", libelle="Avez-vous formalisé un code de conduite ?")


def catalogue(nb_preuves: int = 1) -> Catalogue:
    return Catalogue.model_validate({
        "exigences": [{"code": "D1-01-E1", "intitule": "Code formalisé",
                       "enonce": "L'organisation doit disposer d'un code écrit."}],
        "preuves_attendues": [
            {"reference": f"D1-01-E1-P{rang}", "exigence_code": "D1-01-E1",
             "type": "POLITIQUE", "libelle": f"Pièce attendue {rang}",
             "description": "Document daté et validé.", "obligatoire": True}
            for rang in range(1, nb_preuves + 1)
        ],
        "regles_analyse": [{
            "code": "D1-01-R1", "type": "SIGNATURE",
            "libelle": "Validé par la direction", "severite": "ELEVEE",
            "portee": {"niveau": "PREUVE_ATTENDUE", "reference": "D1-01-E1-P1"},
            "definition": {"mention_attendue": "validation par la direction",
                           "elements": ["date d'entrée en vigueur"]},
        }],
    })


def evidence(*evaluations: EvaluationPreuve, probabilite: float = 0.3,
             confiance: float = 0.8) -> ResultatEvidenceV2:
    return ResultatEvidenceV2(
        couverture_preuve=True,
        justification_couverture="Les pièces concernent le critère.",
        probabilite_conformite=probabilite, confiance=confiance,
        justification_conformite="Diagnostic établi.",
        evaluations=list(evaluations),
    )


def evaluation(reference: str, couverture: str, pieces=None, observes=None,
               manquants=None, non_verifiables=None, conflit=None) -> EvaluationPreuve:
    return EvaluationPreuve(
        reference=reference, couverture=couverture, pieces_utilisees=pieces or [],
        elements_observes=observes or [], elements_manquants=manquants or [],
        elements_non_verifiables=non_verifiables or [], conflit=conflit,
        justification="Appréciation.")


def risque(signal: bool = True, categorie: str = "INFORMATION_MANQUANTE",
           signaux=None) -> ResultatRisqueV2:
    return ResultatRisqueV2(
        signal_risque=signal, categorie=categorie if signal else None,
        justification="Synthèse du risque." if signal else "",
        confiance=0.8, signaux=signaux or [])


def requete(cat: Catalogue | None = None, resultat=None, risk=None,
            declaration=None, organisation=None, analyses=None
            ) -> RecommendationAgentRequestV2:
    return RecommendationAgentRequestV2(
        critere=CRITERE,
        catalogue=cat if cat is not None else catalogue(),
        resultat_evidence=resultat if resultat is not None else evidence(
            evaluation("D1-01-E1-P1", "INSUFFISANTE", pieces=["p1"],
                       manquants=["Aucune validation."])),
        resultat_risque=risk,
        declaration=declaration,
        organisation=organisation,
        analyses_documents=list(analyses or []),
    )


class _ReponseGemini:
    def __init__(self, charge: dict):
        self.text = json.dumps(charge, ensure_ascii=False)


@pytest.fixture
def gemini(monkeypatch):
    appels: list[str] = []

    def programmer(charge: dict) -> list[str]:
        class _Modeles:
            async def generate_content(self, **kwargs):
                appels.append(kwargs["contents"])
                return _ReponseGemini(charge)

        class _Aio:
            models = _Modeles()

        class _Client:
            aio = _Aio()

        monkeypatch.setattr(agent, "get_client", lambda: _Client())
        return appels

    return programmer


def sortie(actions: list[dict], necessaire: bool = True, pistes: str = "Pistes.") -> dict:
    return {
        "recommandation_necessaire": necessaire,
        "pistes_amelioration": pistes if necessaire else "",
        "actions": actions,
    }


def action(texte: str, niveau: str = "REGLE", reference: str = "D1-01-R1") -> dict:
    return {
        "action": texte,
        "rattachement_niveau": niveau,
        "rattachement_reference": reference,
    }


# === 1-2. Conformité pleine ================================================


def test_1_conformite_pleine_ne_recommande_rien(gemini):
    gemini(sortie([], necessaire=False))

    resultat = executer(agent.recommander(requete(
        resultat=evidence(evaluation("D1-01-E1-P1", "COMPLETE", pieces=["p1"]),
                          probabilite=0.95, confiance=0.9))))

    assert resultat.recommandation_necessaire is False
    assert resultat.pistes_amelioration == ""
    assert resultat.actions == []


def test_2_le_prompt_autorise_a_ne_rien_recommander(gemini):
    appels = gemini(sortie([], necessaire=False))

    executer(agent.recommander(requete()))

    prompt = appels[0]
    assert "recommandation_necessaire=false" in prompt
    assert "N'invente pas une amélioration qui n'a pas lieu d'être" in prompt


# === 3-5. Rattachement aux trois niveaux ===================================


@pytest.mark.parametrize("niveau, reference", [
    ("EXIGENCE", "D1-01-E1"),
    ("PREUVE_ATTENDUE", "D1-01-E1-P1"),
    ("REGLE", "D1-01-R1"),
])
def test_3_5_les_trois_niveaux_de_rattachement_sont_admis(gemini, niveau, reference):
    gemini(sortie([action("Faire approuver le document par la direction.", niveau, reference)]))

    resultat = executer(agent.recommander(requete()))

    assert len(resultat.actions) == 1
    assert resultat.actions[0].rattachement.niveau == niveau
    assert resultat.actions[0].rattachement.reference == reference


# === 6-8. L'invariant central : pas d'exigence inventée ====================


def test_6_action_rattachee_a_une_reference_inconnue_est_ecartee(gemini):
    gemini(sortie([
        action("Faire approuver le code par la direction.", "REGLE", "D1-01-R1"),
        action("Obtenir la certification ISO 26000.", "REGLE", "D1-01-R99"),
        action("Créer un comité d'éthique.", "EXIGENCE", "D9-99-E1"),
        action("Fournir un registre.", "PREUVE_ATTENDUE", "D1-01-E1-P9"),
    ]))

    resultat = executer(agent.recommander(requete()))

    # Une action non rattachable est une exigence que le référentiel ne
    # demande pas : elle est écartée, pas simplement détachée.
    assert [a.action for a in resultat.actions] == [
        "Faire approuver le code par la direction."
    ]


def test_7_bonne_reference_mauvais_niveau_est_ecartee(gemini):
    """`D1-01-E1` est une exigence, pas une règle. Le couple doit être juste."""
    gemini(sortie([action("Action mal classée.", "REGLE", "D1-01-E1")]))

    resultat = executer(agent.recommander(requete()))

    assert resultat.actions == []


def test_8_niveau_de_rattachement_inconnu_est_ecarte(gemini):
    gemini(sortie([
        action("Action fantaisiste.", "NORME_EXTERNE", "ISO-26000"),
        action("Action valide.", "REGLE", "D1-01-R1"),
    ]))

    resultat = executer(agent.recommander(requete()))

    assert [a.action for a in resultat.actions] == ["Action valide."]


def test_9_le_prompt_interdit_dinventer_une_exigence(gemini):
    appels = gemini(sortie([action("Action.")]))

    executer(agent.recommander(requete()))

    prompt = appels[0]
    assert "N'INVENTE JAMAIS UNE EXIGENCE" in prompt
    assert "ni certification, ni audit externe, ni norme" in prompt
    assert "RATTACHEMENT OBLIGATOIRE" in prompt
    assert "crédible et fausse est pire" in prompt


# === 10-13. Les cas particuliers ===========================================


def test_10_non_verifiable_appelle_une_piece_lisible(gemini):
    """
    Un scan illisible n'appelle pas une action corrective.

    Recommander « mettre en place une validation » reprocherait à
    l'organisation une lacune qui n'est peut-être pas la sienne : ce qui
    manque, c'est un exemplaire exploitable.
    """
    appels = gemini(sortie([action("Fournir un exemplaire lisible du document.",
                                   "PREUVE_ATTENDUE", "D1-01-E1-P1")]))

    executer(agent.recommander(requete(
        resultat=evidence(evaluation("D1-01-E1-P1", "NON_VERIFIABLE", pieces=["p1"],
                                     non_verifiables=["Scan sans texte exploitable."])))))

    prompt = appels[0]
    assert "non vérifiable : Scan sans texte exploitable." in prompt
    assert "n'appelle pas une action corrective mais une PIÈCE LISIBLE" in prompt


def test_11_signal_preuve_generique_appelle_a_personnaliser(gemini):
    appels = gemini(sortie([action("Personnaliser le document.", "REGLE", "D1-01-R1")]))

    executer(agent.recommander(requete(
        risk=risque(categorie="PREUVE_GENERIQUE", signaux=[
            SignalRisque(categorie="PREUVE_GENERIQUE",
                         rattachement=Rattachement(niveau="PREUVE_ATTENDUE",
                                                   reference="D1-01-E1-P1"),
                         justification="Document interchangeable.")]))))

    prompt = appels[0]
    assert "PREUVE_GENERIQUE sur [D1-01-E1-P1] : Document interchangeable." in prompt
    assert "PERSONNALISER un document existant" in prompt


def test_12_conflit_appelle_a_clarifier(gemini):
    appels = gemini(sortie([action("Clarifier quelle version fait foi.",
                                   "PREUVE_ATTENDUE", "D1-01-E1-P1")]))

    executer(agent.recommander(requete(
        resultat=evidence(evaluation("D1-01-E1-P1", "PARTIELLE", pieces=["p1", "p2"],
                                     conflit="p1 et p2 divergent sur la validation.")))))

    prompt = appels[0]
    assert "CONFLIT ENTRE PIÈCES : p1 et p2 divergent" in prompt
    assert "clarifier quelle version fait foi" in prompt


def test_13_declaration_non_demontree_appelle_a_documenter(gemini):
    appels = gemini(sortie([action("Documenter la validation déclarée.",
                                   "REGLE", "D1-01-R1")]))

    executer(agent.recommander(requete(
        declaration=Declaration(reponses=[{
            "question": "Validé ?", "valeur": "5 — Optimisé",
            "commentaire": "Validé depuis 2020."}]))))

    prompt = appels[0]
    assert "CE QUE L'ORGANISATION DÉCLARE (non vérifié)" in prompt
    assert "appelle de le documenter, pas de le mettre en place" in prompt


# === 14-16. Contexte reçu ==================================================


def test_14_les_exigences_sont_bien_transmises(gemini):
    """
    Contrairement à Risk : nommer l'attendu est la fonction de cet agent.
    """
    appels = gemini(sortie([action("Action.")]))

    executer(agent.recommander(requete()))

    prompt = appels[0]
    assert "CE QUE LE RÉFÉRENTIEL EXIGE" in prompt
    assert "[D1-01-E1] Code formalisé : L'organisation doit disposer d'un code écrit." in prompt


def test_15_secteur_transmis_et_absent(gemini):
    appels = gemini(sortie([action("Action.")]))

    executer(agent.recommander(requete(organisation=Organisation(secteur="Agro-industrie"))))
    executer(agent.recommander(requete(organisation=None)))

    assert "Secteur d'activité : Agro-industrie" in appels[0]
    assert "N'en déduis AUCUNE obligation légale" in appels[0]
    # Absent, la section disparaît plutôt que d'annoncer l'ignorance.
    assert "CONTEXTE DE L'ORGANISATION" not in appels[1]
    assert "inconnu" not in appels[1].lower()


def test_16_risque_absent_est_annonce_explicitement(gemini):
    """
    Quand la formule ne déclenche pas Risk, la section le dit.

    Une source attendue mais vide est annoncée ; la faire disparaître
    laisserait croire qu'elle n'a jamais été demandée.
    """
    appels = gemini(sortie([action("Action.")]))

    executer(agent.recommander(requete(risk=None)))

    assert "aucune analyse de risque n'a été réalisée" in appels[0]


# === 17-19. Recoupement ====================================================


def test_17_action_en_double_est_ecartee(gemini):
    gemini(sortie([
        action("Faire approuver le document.", "REGLE", "D1-01-R1"),
        action("Faire approuver le document.", "REGLE", "D1-01-R1"),
        action("Dater le document.", "REGLE", "D1-01-R1"),
    ]))

    resultat = executer(agent.recommander(requete()))

    assert len(resultat.actions) == 2


def test_18_ordre_des_actions_est_celui_du_modele(gemini):
    """
    Ici, contrairement à Risk, l'ordre du modèle est conservé.

    Une liste d'actions est une séquence de travail : le modèle propose un
    enchaînement, et le réordonner alphabétiquement le briserait. Chez Risk,
    l'ordre des alertes n'a pas ce sens, d'où le tri stable.
    """
    gemini(sortie([
        action("Troisième.", "REGLE", "D1-01-R1"),
        action("Première.", "EXIGENCE", "D1-01-E1"),
        action("Deuxième.", "PREUVE_ATTENDUE", "D1-01-E1-P1"),
    ]))

    resultat = executer(agent.recommander(requete()))

    assert [a.action for a in resultat.actions] == ["Troisième.", "Première.", "Deuxième."]


def test_19_pistes_amelioration_est_conservee_telle_quelle(gemini):
    """Le champ V1 reste le texte lisible affiché aujourd'hui ; il alimente une colonne."""
    gemini(sortie([action("Action.")], pistes="Faire approuver le code par la direction."))

    resultat = executer(agent.recommander(requete()))

    assert resultat.pistes_amelioration == "Faire approuver le code par la direction."


# === 20-22. Ce qui reste hors du contrat ===================================


def test_20_aucun_contenu_brut_de_document():
    charge = requete().model_dump_json()

    assert "contenu_base64" not in charge
    assert "pieces" not in RecommendationAgentRequestV2.model_fields
    assert "contenu_base64" not in AnalyseDocumentV2.model_fields


def test_21_aucune_priorite_ni_delai_ni_cout():
    """
    La priorité se dérive côté Java de la sévérité rattachée — donnée que Java
    possède et que le modèle n'a pas. Le contrat n'offre donc aucun champ.
    """
    from app.models.contrat_v2 import ActionRecommandee, ResultatRecommandationV2

    for interdit in ("priorite", "delai", "cout", "note", "gravite", "echeance"):
        assert interdit not in ActionRecommandee.model_fields, interdit
        assert interdit not in ResultatRecommandationV2.model_fields, interdit


def test_22_le_prompt_interdit_priorite_et_lecture_du_document(gemini):
    appels = gemini(sortie([action("Action.")]))

    executer(agent.recommander(requete()))

    prompt = appels[0]
    assert "TU N'AS PAS LU LES DOCUMENTS" in prompt
    assert "ni note, ni priorité, ni délai, ni estimation de coût" in prompt
    assert "Tu ne réévalues NI la conformité, NI le risque" in prompt


# === 23. Le contrat de sortie n'a pas bougé ================================


def test_23_le_contrat_de_sortie_est_celui_de_la_phase_2():
    """Aucun champ ajouté : la phase 6 consomme le contrat, elle ne l'étend pas."""
    from app.models.contrat_v2 import ActionRecommandee, ResultatRecommandationV2

    assert set(ResultatRecommandationV2.model_fields) == {
        "recommandation_necessaire", "pistes_amelioration", "actions"
    }
    assert set(ActionRecommandee.model_fields) == {"action", "rattachement"}


def test_24_catalogue_vide_ecarte_toute_action(gemini):
    """
    Sans référentiel, aucune action ne peut être rattachée — donc aucune ne sort.

    C'est cohérent avec l'invariant : une action non rattachable est une
    exigence que le référentiel ne demande pas. Un catalogue vide ne demande
    rien.
    """
    gemini(sortie([action("Faire quelque chose.", "REGLE", "D1-01-R1")]))

    resultat = executer(agent.recommander(requete(cat=Catalogue())))

    assert resultat.actions == []
    # Mais le texte libre, lui, reste rendu.
    assert resultat.pistes_amelioration == "Pistes."


def test_25_les_constats_documentaires_sont_transmis(gemini):
    appels = gemini(sortie([action("Action.")]))

    executer(agent.recommander(requete(analyses=[AnalyseDocumentV2(
        piece_reference="p1", nom="code.txt", resume="Code de conduite partiel.",
        constats=[ElementReleve(reference="D1-01-E1-P1", presence="PARTIEL")],
        confiance_lecture=0.9)])))

    prompt = appels[0]
    assert "Pièce [p1] « code.txt » : Code de conduite partiel." in prompt
    assert "[D1-01-E1-P1] → PARTIEL" in prompt
