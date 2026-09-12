"""
Risk Agent V2 — ce qu'il juge, et ce qu'il ne peut pas voir.

Gemini est remplacé par un double programmable : on lui fait rendre des
sorties précises, y compris fautives, pour observer le recoupement. La
résistance du prompt se démontre ailleurs, contre le vrai modèle — voir
`test_risk_agent_v2_reel.py`.

Le fil directeur : Risk ne rejuge pas la conformité. Ce qui l'en empêche n'est
pas une consigne mais l'absence des exigences dans son type d'entrée.
"""

from __future__ import annotations

import asyncio
import json

import pytest

from app.agents import risk_agent_v2 as agent
from app.agents.risk_agent_v2 import (
    CatalogueRisque,
    RiskAgentRequestV2,
    catalogue_risque_depuis,
)
from app.models.contrat_v2 import (
    CATEGORIES_RISQUE_V2,
    Catalogue,
    Critere,
    Declaration,
    EvaluationPreuve,
    Organisation,
    Rattachement,
    ResultatEvidenceV2,
)


def executer(coroutine):
    return asyncio.run(coroutine)


CRITERE = Critere(code="D1-01", libelle="Avez-vous formalisé un code de conduite ?")


def catalogue(nb_preuves: int = 1, severite: str = "ELEVEE") -> CatalogueRisque:
    return CatalogueRisque.model_validate({
        "preuves_attendues": [
            {"reference": f"D1-01-E1-P{rang}", "exigence_code": "D1-01-E1",
             "type": "POLITIQUE", "libelle": f"Pièce attendue {rang}", "obligatoire": True}
            for rang in range(1, nb_preuves + 1)
        ],
        "regles_analyse": [
            {"code": "D1-01-R1", "type": "SIGNATURE",
             "libelle": "Validé par la direction", "severite": severite,
             "portee": {"niveau": "PREUVE_ATTENDUE", "reference": "D1-01-E1-P1"},
             "definition": {"mention_attendue": "validation par la direction"}},
            {"code": "D1-01-R9", "type": "PRESENCE", "libelle": "Règle générale",
             "severite": "FAIBLE", "portee": {"niveau": "CRITERE"}, "definition": {}},
        ],
    })


def evidence(*evaluations: EvaluationPreuve, probabilite: float = 0.3,
             confiance: float = 0.8, manquants=None) -> ResultatEvidenceV2:
    return ResultatEvidenceV2(
        couverture_preuve=True,
        justification_couverture="Les pièces concernent le critère.",
        probabilite_conformite=probabilite,
        confiance=confiance,
        justification_conformite="Diagnostic établi.",
        elements_manquants=manquants or [],
        evaluations=list(evaluations),
    )


def evaluation(reference: str, couverture: str, pieces=None, observes=None,
               manquants=None, non_verifiables=None, conflit=None) -> EvaluationPreuve:
    return EvaluationPreuve(
        reference=reference, couverture=couverture,
        pieces_utilisees=pieces or [], elements_observes=observes or [],
        elements_manquants=manquants or [], elements_non_verifiables=non_verifiables or [],
        conflit=conflit, justification="Appréciation.",
    )


def requete(cat: CatalogueRisque | None = None, resultat: ResultatEvidenceV2 | None = None,
            declaration=None, organisation=None) -> RiskAgentRequestV2:
    return RiskAgentRequestV2(
        critere=CRITERE,
        catalogue=cat if cat is not None else catalogue(),
        resultat_evidence=resultat if resultat is not None else evidence(
            evaluation("D1-01-E1-P1", "COMPLETE", pieces=["p1"])),
        declaration=declaration,
        organisation=organisation,
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


def sortie(signaux: list[dict], signal: bool = True, categorie: str | None = None,
           confiance: float = 0.8) -> dict:
    return {
        "signal_risque": signal,
        "categorie": categorie or (signaux[0]["categorie"] if signaux else None),
        "justification": "Synthèse du risque." if signal else "",
        "confiance": confiance,
        "signaux": signaux,
    }


def signal(categorie: str, niveau: str | None = None, reference: str | None = None,
           pieces=None, justification: str = "Justification du signal.") -> dict:
    return {
        "categorie": categorie,
        "rattachement_niveau": niveau,
        "rattachement_reference": reference,
        "pieces_concernees": pieces or [],
        "justification": justification,
    }


# === 1-3. Les situations de conformité =====================================


def test_1_conformite_solide_ne_produit_aucun_signal(gemini):
    gemini(sortie([], signal=False, confiance=0.9))

    resultat = executer(agent.evaluer(requete(
        resultat=evidence(evaluation("D1-01-E1-P1", "COMPLETE", pieces=["p1"],
                                     observes=["Daté et signé."]),
                          probabilite=0.9, confiance=0.9))))

    assert resultat.signal_risque is False
    assert resultat.categorie is None
    assert resultat.signaux == []


def test_2_preuve_insuffisante_produit_un_signal(gemini):
    gemini(sortie([signal("INFORMATION_MANQUANTE", "PREUVE_ATTENDUE", "D1-01-E1-P1",
                          pieces=["p1"])]))

    resultat = executer(agent.evaluer(requete(
        resultat=evidence(evaluation("D1-01-E1-P1", "INSUFFISANTE", pieces=["p1"],
                                     manquants=["Aucune validation."]),
                          probabilite=0.1,
                          manquants=[Rattachement(niveau="PREUVE_ATTENDUE",
                                                  reference="D1-01-E1-P1")]))))

    assert resultat.signal_risque is True
    assert resultat.categorie == "INFORMATION_MANQUANTE"
    assert resultat.signaux[0].rattachement.reference == "D1-01-E1-P1"
    assert resultat.signaux[0].pieces_concernees == ["p1"]


def test_3_preuve_partielle_est_contextualisee(gemini):
    appels = gemini(sortie([signal("INFORMATION_MANQUANTE", "REGLE", "D1-01-R1")]))

    executer(agent.evaluer(requete(
        resultat=evidence(evaluation("D1-01-E1-P1", "PARTIELLE", pieces=["p1"],
                                     observes=["Valeurs énoncées."],
                                     manquants=["Aucune date."])))))

    prompt = appels[0]
    assert "couverture PARTIELLE" in prompt
    assert "non constaté : Aucune date." in prompt
    assert "constaté : Valeurs énoncées." in prompt


# === 4. NON_VERIFIABLE ≠ ABSENT ============================================


def test_4_non_verifiable_ne_devient_pas_absent(gemini):
    """
    Le garde-fou central.

    Une pièce illisible ne prouve aucune lacune. Le prompt doit le dire, et la
    catégorie dédiée doit exister — sans elle, le modèle n'aurait que
    INFORMATION_MANQUANTE pour l'exprimer, ce qui reviendrait à reprocher un
    manquement.
    """
    appels = gemini(sortie([signal("INFORMATION_NON_VERIFIABLE", "PREUVE_ATTENDUE",
                                   "D1-01-E1-P1")], confiance=0.3))

    resultat = executer(agent.evaluer(requete(
        resultat=evidence(evaluation("D1-01-E1-P1", "NON_VERIFIABLE", pieces=["p1"],
                                     non_verifiables=["Scan illisible."]),
                          confiance=0.2))))

    assert resultat.signaux[0].categorie == "INFORMATION_NON_VERIFIABLE"
    assert resultat.categorie != "INFORMATION_MANQUANTE"
    # L'incertitude se lit dans la confiance, pas dans un risque alourdi.
    assert resultat.confiance == 0.3
    prompt = appels[0]
    assert "Ce n'est PAS une lacune de l'organisation" in prompt
    assert "faire baisser ta confiance plutôt qu'alourdir le risque" in prompt


# === 5-6. Déclarations =====================================================


def test_5_declaration_favorable_sans_preuve(gemini):
    appels = gemini(sortie([signal("DECLARATION_NON_CORROBOREE")]))

    resultat = executer(agent.evaluer(requete(
        resultat=evidence(evaluation("D1-01-E1-P1", "INSUFFISANTE")),
        declaration=Declaration(reponses=[{
            "question": "Votre code est-il validé ?", "valeur": "5 — Optimisé",
            "niveau": 5, "commentaire": "Validé depuis 2020."}]))))

    assert resultat.signaux[0].categorie == "DECLARATION_NON_CORROBOREE"
    # Un signal d'ensemble n'a pas de rattachement : il ne vise aucune attente
    # en particulier.
    assert resultat.signaux[0].rattachement is None
    prompt = appels[0]
    assert "CE QUE L'ORGANISATION DÉCLARE (non vérifié)" in prompt
    assert "Une déclaration n'est pas une preuve" in prompt


def test_6_declaration_contredite_par_evidence(gemini):
    gemini(sortie([signal("CONTRADICTION_AVEC_EVALUATION", "PREUVE_ATTENDUE",
                          "D1-01-E1-P1", pieces=["p1"])]))

    resultat = executer(agent.evaluer(requete(
        resultat=evidence(evaluation("D1-01-E1-P1", "INSUFFISANTE", pieces=["p1"],
                                     manquants=["Aucune validation retrouvée."])),
        declaration=Declaration(reponses=[{
            "question": "Validé ?", "valeur": "5 — Optimisé",
            "commentaire": "Validé par la direction."}]))))

    assert resultat.signaux[0].categorie == "CONTRADICTION_AVEC_EVALUATION"


# === 7. Conflits ===========================================================


def test_7_conflit_entre_pieces_est_repris_sans_arbitrage(gemini):
    appels = gemini(sortie([signal("INCOHERENCE", "PREUVE_ATTENDUE", "D1-01-E1-P1",
                                   pieces=["p1", "p2"])]))

    resultat = executer(agent.evaluer(requete(
        resultat=evidence(evaluation("D1-01-E1-P1", "PARTIELLE", pieces=["p1", "p2"],
                                     conflit="p1 mentionne une signature, p2 non.")))))

    prompt = appels[0]
    assert "CONFLIT ENTRE PIÈCES : p1 mentionne une signature, p2 non." in prompt
    assert "ne tranche pas en faveur de l'une d'elles" in prompt
    assert resultat.signaux[0].pieces_concernees == ["p1", "p2"]


# === 8-9. Sévérité =========================================================


def test_8_severite_elevee_est_presentee(gemini):
    appels = gemini(sortie([signal("INFORMATION_MANQUANTE", "REGLE", "D1-01-R1")]))

    executer(agent.evaluer(requete(catalogue(severite="ELEVEE"))))

    assert "[D1-01-R1, sévérité ELEVEE]" in appels[0]


def test_9_severite_faible_est_contextualisee_sans_calcul(gemini):
    appels = gemini(sortie([signal("AUTRE")]))

    executer(agent.evaluer(requete(catalogue(severite="FAIBLE"))))

    prompt = appels[0]
    assert "[D1-01-R1, sévérité FAIBLE]" in prompt
    # La sévérité éclaire, elle ne pèse pas.
    assert "Ce n'est pas un poids numérique" in prompt
    assert "n'en tire aucun calcul" in prompt


# === 10-11. Secteur ========================================================


def test_10_secteur_present_est_reellement_transmis(gemini):
    appels = gemini(sortie([signal("AUTRE")]))

    executer(agent.evaluer(requete(organisation=Organisation(secteur="Agro-industrie"))))

    prompt = appels[0]
    assert "CONTEXTE DE L'ORGANISATION" in prompt
    assert "Secteur d'activité : Agro-industrie" in prompt
    assert "Il ne modifie jamais le jugement de conformité" in prompt
    assert "N'en déduis AUCUNE obligation légale" in prompt


def test_11_secteur_absent_disparait_du_prompt(gemini):
    """
    Absent, le bloc entier disparaît plutôt que d'annoncer « secteur inconnu ».

    Signaler l'ignorance inviterait le modèle à la commenter — « en l'absence
    d'information sectorielle, il conviendrait de… » — ce qui produit du bruit
    sans valeur.
    """
    appels = gemini(sortie([signal("AUTRE")]))

    executer(agent.evaluer(requete(organisation=None)))
    executer(agent.evaluer(requete(organisation=Organisation(secteur=None))))

    for prompt in appels:
        assert "CONTEXTE DE L'ORGANISATION" not in prompt
        assert "inconnu" not in prompt.lower()
    # Déterministe : les deux formes d'absence donnent le même prompt.
    assert appels[0] == appels[1]


# === 12. Données insuffisantes =============================================


def test_12_absence_de_donnees_ne_produit_pas_dhallucination(gemini):
    appels = gemini(sortie([], signal=False, confiance=0.2))

    resultat = executer(agent.evaluer(RiskAgentRequestV2(
        critere=CRITERE, catalogue=CatalogueRisque(),
        resultat_evidence=evidence(probabilite=0.5, confiance=0.2))))

    assert resultat.signaux == []
    prompt = appels[0]
    assert "aucune pièce attendue n'est décrite" in prompt
    assert "aucune attente n'a été évaluée" in prompt
    assert "aucune règle d'analyse n'est définie" in prompt


# === 13-14. Ce que Risk ne peut pas recevoir ===============================


def test_13_les_exigences_ne_sont_pas_dans_le_payload():
    """
    Ce n'est pas une omission de sérialisation : le type n'a pas ce champ.

    Un champ omis par convention finit par être rempli un jour ; un champ
    inexistant ne le peut pas. C'est ce qui empêche structurellement Risk de
    rejuger le fond de la conformité.
    """
    assert "exigences" not in CatalogueRisque.model_fields
    assert "exigences" not in RiskAgentRequestV2.model_fields

    charge = json.loads(requete().model_dump_json())
    assert "exigences" not in json.dumps(charge)


def test_13bis_reduction_depuis_le_catalogue_complet_laisse_les_exigences(gemini):
    complet = Catalogue.model_validate({
        "exigences": [{"code": "D1-01-E1", "intitule": "Intitulé secret",
                       "enonce": "Énoncé que Risk ne doit pas voir."}],
        "preuves_attendues": [{"reference": "D1-01-E1-P1", "exigence_code": "D1-01-E1",
                               "type": "POLITIQUE", "libelle": "Pièce", "obligatoire": True}],
        "regles_analyse": [],
    })

    reduit = catalogue_risque_depuis(complet)
    charge = reduit.model_dump_json()

    assert "Énoncé que Risk ne doit pas voir" not in charge
    assert "Intitulé secret" not in charge
    # Mais les preuves attendues, elles, passent.
    assert "D1-01-E1-P1" in charge

    appels = gemini(sortie([signal("AUTRE")]))
    executer(agent.evaluer(requete(cat=reduit)))
    assert "Énoncé que Risk ne doit pas voir" not in appels[0]


def test_14_aucun_contenu_brut_de_document():
    charge = requete().model_dump_json()

    assert "contenu_base64" not in charge
    assert "pieces" not in RiskAgentRequestV2.model_fields
    assert "contenu_base64" not in ResultatEvidenceV2.model_fields


# === 15-16. Références et doublons =========================================


def test_15_rattachement_inconnu_est_retire_sans_perdre_le_signal(gemini):
    gemini(sortie([
        signal("INFORMATION_MANQUANTE", "PREUVE_ATTENDUE", "D1-01-E1-P9",
               justification="Signal juste, rattachement faux."),
        signal("AUTRE", "REGLE", "D1-01-R7", justification="Autre signal."),
    ]))

    resultat = executer(agent.evaluer(requete()))

    # Les deux signaux restent : l'alerte peut être juste même mal accrochée.
    assert len(resultat.signaux) == 2
    assert all(s.rattachement is None for s in resultat.signaux)


def test_15bis_piece_inconnue_est_retiree(gemini):
    gemini(sortie([signal("AUTRE", "PREUVE_ATTENDUE", "D1-01-E1-P1",
                          pieces=["p1", "p42"])]))

    resultat = executer(agent.evaluer(requete(
        resultat=evidence(evaluation("D1-01-E1-P1", "PARTIELLE", pieces=["p1"])))))

    assert resultat.signaux[0].pieces_concernees == ["p1"]


def test_15ter_categorie_inconnue_retombe_sur_autre(gemini):
    gemini(sortie([signal("RISQUE_FINANCIER_MAJEUR")], categorie="RISQUE_FINANCIER_MAJEUR"))

    resultat = executer(agent.evaluer(requete()))

    assert resultat.signaux[0].categorie == "AUTRE"
    assert resultat.categorie == "AUTRE"
    assert all(s.categorie in CATEGORIES_RISQUE_V2 for s in resultat.signaux)


def test_16_doublons_et_ordre_deterministes(gemini):
    gemini(sortie([
        signal("INFORMATION_MANQUANTE", "PREUVE_ATTENDUE", "D1-01-E1-P1", justification="Idem."),
        signal("INFORMATION_MANQUANTE", "PREUVE_ATTENDUE", "D1-01-E1-P1", justification="Idem."),
        signal("AUTRE", justification="Un autre."),
    ]))

    premier = executer(agent.evaluer(requete()))
    second = executer(agent.evaluer(requete()))

    assert len(premier.signaux) == 2, "Le doublon exact doit être écarté"
    # Ordre stable : par catégorie, puis par référence.
    assert [s.categorie for s in premier.signaux] == ["AUTRE", "INFORMATION_MANQUANTE"]
    assert [s.categorie for s in second.signaux] == [s.categorie for s in premier.signaux]


# === 17. Bornes ============================================================


@pytest.mark.parametrize("valeur", [-0.1, 1.4])
def test_17_confiance_hors_bornes_est_refusee(gemini, valeur):
    charge = sortie([signal("AUTRE")])
    charge["confiance"] = valeur
    gemini(charge)

    with pytest.raises(Exception) as refus:
        executer(agent.evaluer(requete()))

    assert "less_than_equal" in str(refus.value) or "greater_than_equal" in str(refus.value)


def test_17bis_aucune_gravite_ni_probabilite_de_risque():
    """RG26 : le risque attendu est calculé côté Java. Le contrat n'offre pas de champ."""
    from app.models.contrat_v2 import ResultatRisqueV2, SignalRisque

    for interdit in ("gravite", "impact", "probabilite_risque", "score", "priorite"):
        assert interdit not in ResultatRisqueV2.model_fields, interdit
        assert interdit not in SignalRisque.model_fields, interdit


# === Le prompt =============================================================


def test_le_prompt_interdit_de_pretendre_avoir_lu_le_document(gemini):
    appels = gemini(sortie([signal("AUTRE")]))

    executer(agent.evaluer(requete()))

    prompt = appels[0]
    assert "TU N'AS PAS LU LES DOCUMENTS" in prompt
    assert "le document montre" in prompt
    assert "le document contient" in prompt


def test_le_prompt_interdit_les_inventions_reglementaires(gemini):
    appels = gemini(sortie([signal("AUTRE")]))

    executer(agent.evaluer(requete(organisation=Organisation(secteur="Agro-industrie"))))

    prompt = appels[0]
    for interdiction in ("une obligation légale", "une sanction", "une réglementation",
                         "une certification obligatoire", "un seuil chiffré",
                         "un incident", "un impact"):
        assert interdiction in prompt, interdiction
    assert "Ne présente jamais une hypothèse comme une obligation" in prompt
    assert "Ne produis ni note, ni gravité, ni probabilité de risque" in prompt


def test_les_regles_gardent_leur_portee(gemini):
    appels = gemini(sortie([signal("AUTRE")]))

    executer(agent.evaluer(requete()))

    prompt = appels[0]
    assert "porte sur la pièce attendue [D1-01-E1-P1]" in prompt
    assert "porte sur le critère dans son ensemble" in prompt
