"""
Evidence/Compliance Agent V2 — ce qu'il fait des constats, et ce qu'il refuse.

Gemini est remplacé par un double programmable : on lui fait rendre des
sorties précises, y compris fautives, pour observer le recoupement. Un vrai
modèle inventerait rarement une référence — mais « rarement » n'est pas
« jamais », et c'est justement ce cas qu'il faut éprouver.

La résistance du prompt, elle, se démontre contre le vrai modèle. Voir
`test_evidence_compliance_agent_v2_reel.py`.
"""

from __future__ import annotations

import asyncio
import json

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


def executer(coroutine):
    """Le projet n'a pas de plugin asyncio ; une boucle par test isole mieux."""
    return asyncio.run(coroutine)


CRITERE = Critere(code="D1-01", libelle="Avez-vous formalisé un code de conduite ?")


def catalogue(nb_preuves: int = 1, avec_regle: bool = False) -> Catalogue:
    preuves = [
        {
            "reference": f"D1-01-E1-P{rang}",
            "exigence_code": "D1-01-E1",
            "type": "POLITIQUE",
            "libelle": f"Pièce attendue {rang}",
            "description": "Document daté et validé.",
            "obligatoire": True,
        }
        for rang in range(1, nb_preuves + 1)
    ]
    regles = []
    if avec_regle:
        regles = [
            {
                "code": "D1-01-R1",
                "type": "SIGNATURE",
                "libelle": "Validé par la direction",
                "severite": "ELEVEE",
                "portee": {"niveau": "PREUVE_ATTENDUE", "reference": "D1-01-E1-P1"},
                "definition": {"mention_attendue": "validation par la direction"},
            },
            {
                "code": "D1-01-R9",
                "type": "PRESENCE",
                "libelle": "Règle générale du critère",
                "severite": "FAIBLE",
                "portee": {"niveau": "CRITERE"},
                "definition": {},
            },
        ]
    return Catalogue.model_validate({
        "exigences": [{"code": "D1-01-E1", "intitule": "Code formalisé", "enonce": "Énoncé."}],
        "preuves_attendues": preuves,
        "regles_analyse": regles,
    })


def analyse(piece: str, *constats: ElementReleve, nom: str | None = None,
            confiance: float | None = 0.9, resume: str = "Lecture du document.") -> AnalyseDocumentV2:
    return AnalyseDocumentV2(
        piece_reference=piece,
        nom=nom or f"{piece}.txt",
        resume=resume,
        constats=list(constats),
        confiance_lecture=confiance,
    )


def constat(reference: str, presence: str, releves=None, manquants=None) -> ElementReleve:
    return ElementReleve(
        reference=reference,
        presence=presence,
        elements_releves=releves or [],
        elements_manquants=manquants or [],
    )


def requete(cat: Catalogue | None = None, analyses=None, declaration=None) -> EvidenceComplianceRequestV2:
    return EvidenceComplianceRequestV2(
        critere=CRITERE,
        catalogue=cat if cat is not None else catalogue(),
        analyses_documents=list(analyses or []),
        declaration=declaration,
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


def sortie(evaluations: list[dict], probabilite: float = 0.5, confiance: float = 0.8,
           couverture: bool = True) -> dict:
    return {
        "couverture_preuve": couverture,
        "justification_couverture": "Les pièces concernent le critère.",
        "probabilite_conformite": probabilite,
        "confiance": confiance,
        "justification_conformite": "Jugement fondé sur les constats.",
        "evaluations": evaluations,
    }


def evaluation(reference: str, couverture: str, pieces=None, observes=None,
               manquants=None, non_verifiables=None, conflit=None) -> dict:
    return {
        "reference": reference,
        "couverture": couverture,
        "pieces_utilisees": pieces or [],
        "elements_observes": observes or [],
        "elements_manquants": manquants or [],
        "elements_non_verifiables": non_verifiables or [],
        "conflit": conflit,
        "justification": "Justification.",
    }


# === 1-4. Les quatre constats ==============================================


def test_1_preuve_presente_est_reconnue(gemini):
    gemini(sortie([evaluation("D1-01-E1-P1", "COMPLETE", pieces=["p1"],
                              observes=["Le document est daté et signé."])],
                  probabilite=0.9))

    resultat = executer(agent.evaluer(requete(
        analyses=[analyse("p1", constat("D1-01-E1-P1", "PRESENT", releves=["daté et signé"]))])))

    assert resultat.evaluations[0].couverture == "COMPLETE"
    assert resultat.evaluations[0].pieces_utilisees == ["p1"]
    assert resultat.elements_manquants == []


def test_2_preuve_partielle_donne_couverture_partielle(gemini):
    gemini(sortie([evaluation("D1-01-E1-P1", "PARTIELLE", pieces=["p1"],
                              observes=["Valeurs énoncées."],
                              manquants=["Aucune date d'entrée en vigueur."])]))

    resultat = executer(agent.evaluer(requete(
        analyses=[analyse("p1", constat("D1-01-E1-P1", "PARTIEL"))])))

    evaluation_rendue = resultat.evaluations[0]
    assert evaluation_rendue.couverture == "PARTIELLE"
    assert evaluation_rendue.elements_manquants == ["Aucune date d'entrée en vigueur."]
    # L'écart remonte au niveau du référentiel.
    assert [(m.niveau, m.reference) for m in resultat.elements_manquants] == [
        ("PREUVE_ATTENDUE", "D1-01-E1-P1")
    ]


def test_3_preuve_absente_produit_un_element_manquant(gemini):
    gemini(sortie([evaluation("D1-01-E1-P1", "INSUFFISANTE", pieces=["p1"],
                              manquants=["Aucune validation par la direction."])],
                  probabilite=0.1))

    resultat = executer(agent.evaluer(requete(
        catalogue(avec_regle=True),
        analyses=[analyse("p1", constat("D1-01-E1-P1", "ABSENT"))])))

    assert resultat.evaluations[0].couverture == "INSUFFISANTE"
    rattachements = [(m.niveau, m.reference) for m in resultat.elements_manquants]
    assert ("PREUVE_ATTENDUE", "D1-01-E1-P1") in rattachements
    # La règle qui porte sur cette pièce est elle-même en écart.
    assert ("REGLE", "D1-01-R1") in rattachements
    # Mais pas la règle de portée critère : elle ne vise aucune pièce.
    assert ("REGLE", "D1-01-R9") not in rattachements


def test_4_non_verifiable_ne_devient_pas_absent(gemini):
    """
    Le point le plus important de l'agent.

    INSUFFISANTE reproche quelque chose à l'organisation ; NON_VERIFIABLE ne
    reproche rien et appelle une pièce lisible. Un point non vérifiable ne
    doit donc pas figurer dans les écarts.
    """
    gemini(sortie([evaluation("D1-01-E1-P1", "NON_VERIFIABLE", pieces=["p1"],
                              non_verifiables=["Le scan ne comporte aucun texte."])],
                  probabilite=0.5, confiance=0.2))

    resultat = executer(agent.evaluer(requete(
        catalogue(avec_regle=True),
        analyses=[analyse("p1", constat("D1-01-E1-P1", "NON_VERIFIABLE"), confiance=0.1)])))

    assert resultat.evaluations[0].couverture == "NON_VERIFIABLE"
    assert resultat.elements_manquants == [], (
        "Un point non jugeable n'est pas un manque à reprocher"
    )
    assert resultat.confiance == 0.2


# === 5-6. Agrégation =======================================================


def test_5_plusieurs_documents_agregation_deterministe(gemini):
    gemini(sortie([
        evaluation("D1-01-E1-P2", "COMPLETE", pieces=["p2"]),
        evaluation("D1-01-E1-P1", "PARTIELLE", pieces=["p1", "p2"]),
    ]))

    resultat = executer(agent.evaluer(requete(
        catalogue(nb_preuves=2),
        analyses=[analyse("p1", constat("D1-01-E1-P1", "PARTIEL")),
                  analyse("p2", constat("D1-01-E1-P2", "PRESENT"))])))

    # L'ordre est celui du catalogue, non celui du modèle.
    assert [e.reference for e in resultat.evaluations] == ["D1-01-E1-P1", "D1-01-E1-P2"]
    assert resultat.evaluations[0].pieces_utilisees == ["p1", "p2"]


def test_6_plusieurs_constats_sur_une_meme_attente(gemini):
    appels = gemini(sortie([evaluation("D1-01-E1-P1", "PARTIELLE", pieces=["p1", "p2"])]))

    executer(agent.evaluer(requete(
        analyses=[analyse("p1", constat("D1-01-E1-P1", "PRESENT", releves=["signature visible"])),
                  analyse("p2", constat("D1-01-E1-P1", "ABSENT", manquants=["aucune signature"]))])))

    prompt = appels[0]
    # Les deux constats sont présentés, avec leur pièce d'origine.
    assert "[p1]" in prompt and "[p2]" in prompt
    assert "signature visible" in prompt
    assert "aucune signature" in prompt


# === 7-8. Déclaration et attente ===========================================


def test_7_declaration_seule_nest_pas_une_preuve(gemini):
    appels = gemini(sortie([evaluation("D1-01-E1-P1", "INSUFFISANTE")], probabilite=0.3))

    executer(agent.evaluer(requete(
        declaration=Declaration(
            reponses=[{"question": "Votre politique est-elle validée ?",
                       "valeur": "4 — Maîtrisé", "niveau": 4,
                       "commentaire": "Notre politique est validée."}]))))

    prompt = appels[0]
    assert "CE QUE L'ORGANISATION DÉCLARE (non vérifié)" in prompt
    assert "pas des preuves documentaires" in prompt
    assert "doit réduire la CONFIANCE" in prompt
    # La déclaration figure dans son bloc, pas dans celui des observations.
    section_declaration = prompt.split("=== E.")[1]
    assert "Notre politique est validée." in section_declaration


def test_8_une_attente_nest_pas_une_observation(gemini):
    appels = gemini(sortie([evaluation("D1-01-E1-P1", "INSUFFISANTE")]))

    executer(agent.evaluer(requete()))

    prompt = appels[0]
    assert "Ce sont des ATTENTES" in prompt
    assert "Ne déduis jamais d'une attente qu'elle est satisfaite" in prompt
    # Les attentes et les observations sont dans deux sections distinctes.
    assert prompt.index("=== B.") < prompt.index("=== D.")


# === 9-11. Le refus des références étrangères ==============================


def test_9_reference_inconnue_est_ecartee(gemini):
    gemini(sortie([
        evaluation("D1-01-E1-P1", "COMPLETE", pieces=["p1"]),
        evaluation("D1-01-E1-P9", "COMPLETE", pieces=["p1"]),
    ]))

    resultat = executer(agent.evaluer(requete(
        analyses=[analyse("p1", constat("D1-01-E1-P1", "PRESENT"))])))

    assert [e.reference for e in resultat.evaluations] == ["D1-01-E1-P1"]


def test_10_piece_inconnue_est_retiree_sans_invalider(gemini):
    gemini(sortie([evaluation("D1-01-E1-P1", "COMPLETE", pieces=["p1", "p42"])]))

    resultat = executer(agent.evaluer(requete(
        analyses=[analyse("p1", constat("D1-01-E1-P1", "PRESENT"))])))

    # La pièce fantôme part, le jugement reste : le modèle peut avoir mal
    # nommé sa source sans que sa conclusion soit fausse.
    assert resultat.evaluations[0].pieces_utilisees == ["p1"]
    assert resultat.evaluations[0].couverture == "COMPLETE"


def test_11_evaluation_omise_est_completee_en_non_verifiable(gemini):
    gemini(sortie([evaluation("D1-01-E1-P1", "COMPLETE", pieces=["p1"])]))

    resultat = executer(agent.evaluer(requete(
        catalogue(nb_preuves=3),
        analyses=[analyse("p1", constat("D1-01-E1-P1", "PRESENT"))])))

    assert [e.reference for e in resultat.evaluations] == [
        "D1-01-E1-P1", "D1-01-E1-P2", "D1-01-E1-P3"
    ]
    # Complétée en NON_VERIFIABLE, jamais en INSUFFISANTE : un silence de
    # l'agent ne doit rien reprocher à l'organisation.
    assert resultat.evaluations[1].couverture == "NON_VERIFIABLE"
    assert resultat.elements_manquants == []


# === 12-15. Cohérence et cas limites =======================================


def test_12_elements_manquants_coherents_avec_les_attentes(gemini):
    gemini(sortie([
        evaluation("D1-01-E1-P1", "INSUFFISANTE"),
        evaluation("D1-01-E1-P2", "COMPLETE"),
    ]))

    resultat = executer(agent.evaluer(requete(catalogue(nb_preuves=2))))

    references = {m.reference for m in resultat.elements_manquants}
    assert references == {"D1-01-E1-P1"}
    # Rien n'est rattaché à une référence absente du catalogue.
    connues = {"D1-01-E1-P1", "D1-01-E1-P2"}
    assert all(m.reference in connues for m in resultat.elements_manquants
               if m.niveau == "PREUVE_ATTENDUE")


def test_13_aucune_attente(gemini):
    gemini(sortie([], probabilite=0.5, confiance=0.3))

    resultat = executer(agent.evaluer(requete(
        Catalogue(), analyses=[analyse("p1", resume="Un document quelconque.")])))

    assert resultat.evaluations == []
    assert resultat.elements_manquants == []


def test_14_aucun_document(gemini):
    appels = gemini(sortie([evaluation("D1-01-E1-P1", "NON_VERIFIABLE")], confiance=0.2))

    resultat = executer(agent.evaluer(requete(
        declaration=Declaration(scenario="Nous disposons d'un code de conduite."))))

    assert "aucune pièce n'a été déposée" in appels[0]
    assert resultat.evaluations[0].couverture == "NON_VERIFIABLE"


def test_15_document_lisible_sans_information(gemini):
    """Lisible et vide : INSUFFISANTE, pas NON_VERIFIABLE — on a pu regarder."""
    gemini(sortie([evaluation("D1-01-E1-P1", "INSUFFISANTE", pieces=["p1"],
                              manquants=["Le document ne traite pas du sujet."])],
                  probabilite=0.05, confiance=0.9))

    resultat = executer(agent.evaluer(requete(
        analyses=[analyse("p1", constat("D1-01-E1-P1", "ABSENT"), confiance=0.98)])))

    assert resultat.evaluations[0].couverture == "INSUFFISANTE"
    # Confiance haute : la lecture était bonne, c'est le contenu qui ne dit rien.
    assert resultat.confiance == 0.9


def test_16_documents_contradictoires_signalent_le_conflit(gemini):
    gemini(sortie([evaluation("D1-01-E1-P1", "PARTIELLE", pieces=["p1", "p2"],
                              conflit="p1 mentionne une signature, p2 indique l'absence de validation.")]))

    resultat = executer(agent.evaluer(requete(
        analyses=[analyse("p1", constat("D1-01-E1-P1", "PRESENT")),
                  analyse("p2", constat("D1-01-E1-P1", "ABSENT"))])))

    assert resultat.evaluations[0].conflit is not None
    assert "p1" in resultat.evaluations[0].conflit


# === 17-19. Bornes, localisation ===========================================


@pytest.mark.parametrize("champ", ["probabilite_conformite", "confiance"])
@pytest.mark.parametrize("valeur", [-0.1, 1.4])
def test_17_18_probabilite_et_confiance_hors_bornes_sont_rejetees(gemini, champ, valeur):
    charge = sortie([evaluation("D1-01-E1-P1", "COMPLETE")])
    charge[champ] = valeur
    gemini(charge)

    with pytest.raises(Exception) as refus:
        executer(agent.evaluer(requete()))

    assert "less_than_equal" in str(refus.value) or "greater_than_equal" in str(refus.value)


def test_19_aucune_localisation_inventee(gemini):
    appels = gemini(sortie([evaluation("D1-01-E1-P1", "COMPLETE")]))

    executer(agent.evaluer(requete()))

    prompt = appels[0].lower()
    assert "aucune page" in prompt
    assert "aucun paragraphe" in prompt
    from app.models.contrat_v2 import EvaluationPreuve
    assert "localisation" not in EvaluationPreuve.model_fields
    assert "page" not in EvaluationPreuve.model_fields


# === 20-22. Déterminisme, isolation, séparation ============================


def test_20_ordre_deterministe_malgre_permutation(gemini):
    charge = sortie([
        evaluation("D1-01-E1-P3", "COMPLETE"),
        evaluation("D1-01-E1-P1", "PARTIELLE"),
        evaluation("D1-01-E1-P2", "INSUFFISANTE"),
    ])
    gemini(charge)

    premier = executer(agent.evaluer(requete(catalogue(nb_preuves=3))))
    second = executer(agent.evaluer(requete(catalogue(nb_preuves=3))))

    attendu = ["D1-01-E1-P1", "D1-01-E1-P2", "D1-01-E1-P3"]
    assert [e.reference for e in premier.evaluations] == attendu
    assert [e.reference for e in second.evaluations] == attendu


def test_21_aucun_contenu_brut_dans_la_requete():
    """
    L'agent ne peut pas recevoir un fichier : c'est une propriété du type.

    `AnalyseDocumentV2` n'a aucun champ de contenu. Ce n'est pas une
    convention à respecter, c'est structurellement impossible.
    """
    champs = set(EvidenceComplianceRequestV2.model_fields)
    assert "pieces" not in champs
    assert "contenu_base64" not in champs
    assert "contenu_base64" not in AnalyseDocumentV2.model_fields
    # Et le secteur n'y est pas non plus : réservé à Risk et Recommendation.
    assert "organisation" not in champs


def test_22_separation_declaration_et_preuve_documentaire(gemini):
    appels = gemini(sortie([evaluation("D1-01-E1-P1", "PARTIELLE")]))

    executer(agent.evaluer(requete(
        analyses=[analyse("p1", constat("D1-01-E1-P1", "PARTIEL", releves=["valeurs énoncées"]))],
        declaration=Declaration(
            reponses=[{"question": "Validée ?", "valeur": "4 — Maîtrisé",
                       "commentaire": "Validation effectuée."}]))))

    prompt = appels[0]
    section_observe = prompt.split("=== D.")[1].split("=== E.")[0]
    section_declare = prompt.split("=== E.")[1]

    assert "valeurs énoncées" in section_observe
    assert "Validation effectuée." in section_declare
    # Ce que l'organisation déclare n'apparaît pas parmi les observations.
    assert "Validation effectuée." not in section_observe


# === Le prompt et les règles ===============================================


def test_les_regles_gardent_leur_portee_reelle(gemini):
    appels = gemini(sortie([evaluation("D1-01-E1-P1", "COMPLETE")]))

    executer(agent.evaluer(requete(catalogue(avec_regle=True))))

    prompt = appels[0]
    assert "porte sur la pièce attendue [D1-01-E1-P1]" in prompt
    assert "porte sur le critère dans son ensemble" in prompt
    assert "Applique chaque règle à sa portée réelle" in prompt


def test_les_interdictions_figurent_au_prompt(gemini):
    appels = gemini(sortie([evaluation("D1-01-E1-P1", "COMPLETE")]))

    executer(agent.evaluer(requete()))

    prompt = appels[0]
    for interdiction in ("une preuve", "un document", "une référence", "une signature",
                         "une date", "une approbation", "une validation", "une certification"):
        assert interdiction in prompt, interdiction
    assert "Ne produis ni note, ni niveau de maturité" in prompt
    assert "Ce n'est PAS une absence" in prompt


def test_la_sortie_brute_nest_jamais_utilisee_telle_quelle(gemini):
    """Une sortie structurellement fausse est refusée avant tout recoupement."""
    charge = sortie([evaluation("D1-01-E1-P1", "PEUT_ETRE")])
    gemini(charge)

    with pytest.raises(Exception):
        executer(agent.evaluer(requete()))
