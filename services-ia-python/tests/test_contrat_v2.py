"""
Le contrat IA V2 côté Python : forme, cohérence, refus.

Ces tests portent sur le CONTRAT, pas sur le pipeline. Aucun appel Gemini,
aucun agent : la phase 2 fige ce que le service accepte et ce qu'il refuse,
avant que les agents ne sachent le lire.

Le fil directeur est le même partout : une référence de preuve attendue est
locale au payload. Elle ne désigne rien hors de lui, et tout ce qui prétend en
utiliser une doit la retrouver parmi celles qui ont été transmises.
"""

from __future__ import annotations

import copy
import uuid

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.models.contrat_v2 import (
    ActionRecommandee,
    AnalyseDocumentV2,
    Catalogue,
    ElementReleve,
    EvaluerCritereRequestV2,
    PreuveAttendue,
    Portee,
    Rattachement,
    ResultatEvidenceV2,
    ResultatRecommandationV2,
    VersionContratNonSupportee,
    verifier_rattachements,
    verifier_version_supportee,
)

client = TestClient(app)

ROUTE_V2 = "/api/v2/evaluations/critere"
ROUTE_V1 = "/api/v1/evaluations/critere"


def payload_v2() -> dict:
    """Un contexte V2 complet et valide, inspiré de D1-01. Données fictives."""
    return {
        "contrat_version": "2.0",
        "tracabilite": {
            "audit_id": str(uuid.uuid4()),
            "audit_critere_id": str(uuid.uuid4()),
            "referentiel_version_id": str(uuid.uuid4()),
        },
        "situation": {
            "referentiel_code": "SMARTEX_SUSTWAY",
            "referentiel_nom": "Référentiel RSE Smartex Sustway",
            "version_numero": "2.1",
            "domaine_code": "D1",
            "domaine_nom": "Valeurs et principes éthiques",
        },
        "critere": {
            "code": "D1-01",
            "libelle": "Avez-vous formalisé un code de conduite et d'éthique ?",
            "description": None,
        },
        "catalogue": {
            "exigences": [
                {
                    "code": "D1-01-E1",
                    "intitule": "Code de conduite formalisé",
                    "enonce": "L'organisation doit disposer d'un code écrit.",
                }
            ],
            "preuves_attendues": [
                {
                    "reference": "D1-01-E1-P1",
                    "exigence_code": "D1-01-E1",
                    "type": "POLITIQUE",
                    "libelle": "Code de conduite et d'éthique",
                    "description": "Document daté et validé.",
                    "obligatoire": True,
                }
            ],
            "regles_analyse": [
                {
                    "code": "D1-01-R1",
                    "type": "SIGNATURE",
                    "libelle": "Le code doit être validé par la direction",
                    "severite": "ELEVEE",
                    "portee": {"niveau": "PREUVE_ATTENDUE", "reference": "D1-01-E1-P1"},
                    "definition": {"mention_attendue": "validation par la direction"},
                }
            ],
        },
        "declaration": {
            "scenario": None,
            "reponses": [
                {
                    "question": "Avez-vous formalisé un code de conduite ?",
                    "valeur": "3 — Défini",
                    "niveau": 3,
                    "commentaire": "Validation de la direction à confirmer.",
                }
            ],
        },
        "pieces": [
            {
                "reference": "p1",
                "nom": "code-de-conduite.txt",
                "type_mime": "text/plain",
                "taille": 530,
                "contenu_base64": "Q09ERQ==",
                "preuve_attendue_reference": None,
            }
        ],
        "organisation": {"secteur": "Agro-industrie"},
        "options": {"analyse_risque": True, "generer_recommandation": True},
    }


def catalogue_de_reference() -> Catalogue:
    return EvaluerCritereRequestV2.model_validate(payload_v2()).catalogue


# === Contrat (1-6) =========================================================


def test_1_payload_v2_valide_est_accepte():
    reponse = client.post(ROUTE_V2, json=payload_v2())

    assert reponse.status_code == 200, reponse.text
    corps = reponse.json()
    assert corps["accepte"] is True
    assert corps["contrat_version"] == "2.0"
    resume = corps["resume_contexte"]
    assert resume["critere_code"] == "D1-01"
    assert resume["exigences"] == ["D1-01-E1"]
    assert resume["preuves_attendues"] == ["D1-01-E1-P1"]
    assert resume["portees"] == {"PREUVE_ATTENDUE": 1}
    # Aucun agent n'est exécuté en phase 2.
    assert corps["agents_executes"] == []


def test_2_champ_obligatoire_absent_est_refuse():
    corps = payload_v2()
    del corps["critere"]

    assert client.post(ROUTE_V2, json=corps).status_code == 422


def test_3_type_incorrect_est_refuse():
    corps = payload_v2()
    corps["catalogue"]["preuves_attendues"][0]["obligatoire"] = "peut-être"

    assert client.post(ROUTE_V2, json=corps).status_code == 422


def test_4_champ_inconnu_est_ignore_et_non_refuse():
    """
    Les modèles ne sont volontairement pas stricts.

    Un ajout de champ optionnel relève du mineur, qu'un service plus ancien
    doit pouvoir ignorer sans dommage — c'est ce qui rend un déploiement
    décalé possible. Ce qui doit être refusé, c'est un MAJEUR inconnu, et le
    test 21 s'en charge. Interdire les champs inconnus déplacerait la garantie
    au mauvais endroit.
    """
    corps = payload_v2()
    corps["champ_de_demain"] = "valeur"
    corps["critere"]["nouveau_champ"] = 42

    reponse = client.post(ROUTE_V2, json=corps)

    assert reponse.status_code == 200
    assert reponse.json()["accepte"] is True


def test_5_blocs_optionnels_absents():
    corps = payload_v2()
    for optionnel in ("situation", "organisation"):
        del corps[optionnel]

    reponse = client.post(ROUTE_V2, json=corps)

    assert reponse.status_code == 200
    resume = reponse.json()["resume_contexte"]
    assert resume["situation_presente"] is False
    assert resume["secteur_present"] is False


def test_6_blocs_optionnels_presents():
    reponse = client.post(ROUTE_V2, json=payload_v2())

    resume = reponse.json()["resume_contexte"]
    assert resume["situation_presente"] is True
    assert resume["secteur_present"] is True
    assert resume["scenario_present"] is False
    assert resume["reponses"] == 1
    assert resume["pieces"] == 1


# === Références (7-15) =====================================================


def test_7_reference_valide():
    preuve = PreuveAttendue(
        reference="D1-01-E1-P2", exigence_code="D1-01-E1", libelle="Pièce"
    )

    assert preuve.reference == "D1-01-E1-P2"


@pytest.mark.parametrize(
    "malformee", ["D1-01-E1", "D1-01-E1-P0", "P1", "D1-01-E1-PX", "D1-01-E1-P"]
)
def test_8_reference_malformee_est_refusee(malformee):
    with pytest.raises(ValidationError):
        PreuveAttendue(reference=malformee, exigence_code="D1-01-E1", libelle="Pièce")


def test_9_reference_vide_est_refusee():
    with pytest.raises(ValidationError):
        PreuveAttendue(reference="", exigence_code="D1-01-E1", libelle="Pièce")


def test_10_reference_en_double_est_refusee():
    corps = payload_v2()
    doublon = copy.deepcopy(corps["catalogue"]["preuves_attendues"][0])
    doublon["libelle"] = "Une autre pièce, même référence"
    corps["catalogue"]["preuves_attendues"].append(doublon)

    reponse = client.post(ROUTE_V2, json=corps)

    assert reponse.status_code == 422
    assert "double" in reponse.text.lower()


def test_11_reference_incoherente_avec_son_exigence_est_refusee():
    """La référence porte le code de son exigence : une dérive rendrait tout rattachement trompeur."""
    with pytest.raises(ValidationError) as refus:
        PreuveAttendue(
            reference="D1-01-E2-P1", exigence_code="D1-01-E1", libelle="Pièce"
        )

    assert "incohérente" in str(refus.value)


def test_12_regle_visant_une_reference_inconnue_est_refusee():
    corps = payload_v2()
    corps["catalogue"]["regles_analyse"][0]["portee"]["reference"] = "D1-01-E1-P9"

    reponse = client.post(ROUTE_V2, json=corps)

    assert reponse.status_code == 422
    assert "non résoluble" in reponse.text or "non r\\u00e9soluble" in reponse.text


def test_13_regle_critere_sans_reference():
    portee = Portee(niveau="CRITERE")
    assert portee.reference is None

    # Et l'inverse : une portée critère porteuse d'une référence est refusée.
    # Lui en attribuer une rattacherait la règle la plus générale à une pièce
    # particulière.
    with pytest.raises(ValidationError):
        Portee(niveau="CRITERE", reference="D1-01-E1-P1")


def test_14_regle_exigence_porte_le_code_exigence():
    corps = payload_v2()
    corps["catalogue"]["regles_analyse"][0]["portee"] = {
        "niveau": "EXIGENCE",
        "reference": "D1-01-E1",
    }

    reponse = client.post(ROUTE_V2, json=corps)

    assert reponse.status_code == 200
    assert reponse.json()["resume_contexte"]["portees"] == {"EXIGENCE": 1}

    # Une exigence absente du payload est refusée.
    corps["catalogue"]["regles_analyse"][0]["portee"]["reference"] = "D1-01-E9"
    assert client.post(ROUTE_V2, json=corps).status_code == 422


def test_15_regle_preuve_porte_une_reference_locale():
    corps = payload_v2()
    reponse = client.post(ROUTE_V2, json=corps)

    assert reponse.status_code == 200
    assert reponse.json()["resume_contexte"]["portees"] == {"PREUVE_ATTENDUE": 1}

    # Une portée EXIGENCE ou PREUVE_ATTENDUE sans référence est refusée.
    with pytest.raises(ValidationError):
        Portee(niveau="PREUVE_ATTENDUE")


# === Sorties (16-21) =======================================================


def test_16_elements_releves_valide():
    releve = ElementReleve(
        reference="D1-01-E1-P1",
        presence="PARTIEL",
        elements_releves=["Le document énonce des valeurs générales."],
        elements_manquants=["Aucune date n'a été retrouvée."],
    )

    assert releve.presence == "PARTIEL"
    # NON_VERIFIABLE, ajoutée en phase 3, se distingue d'ABSENT : « je n'ai
    # rien trouvé » et « je n'ai pas pu regarder » appellent des décisions
    # d'audit opposées.
    assert ElementReleve(reference="D1-01-E1-P1", presence="NON_VERIFIABLE").presence == (
        "NON_VERIFIABLE"
    )
    # `presence` n'a pas de valeur par défaut : c'est ce qui rend la
    # non-réponse impossible et l'absence explicite.
    with pytest.raises(ValidationError):
        ElementReleve(reference="D1-01-E1-P1")
    with pytest.raises(ValidationError):
        ElementReleve(reference="D1-01-E1-P1", presence="PEUT_ETRE")


def test_17_elements_manquants_valide():
    resultat = ResultatEvidenceV2(
        couverture_preuve=True,
        justification_couverture="Le document traite du sujet.",
        probabilite_conformite=0.2,
        confiance=0.9,
        justification_conformite="Absence de validation par la direction.",
        elements_manquants=[Rattachement(niveau="REGLE", reference="D1-01-R1")],
    )

    assert resultat.elements_manquants[0].reference == "D1-01-R1"
    # Les cinq champs V1 gardent leurs noms — ils alimentent des colonnes.
    assert resultat.probabilite_conformite == 0.2
    with pytest.raises(ValidationError):
        ResultatEvidenceV2(
            couverture_preuve=True,
            justification_couverture="",
            probabilite_conformite=1.4,
            confiance=0.9,
            justification_conformite="",
        )


def test_18_action_valide():
    action = ActionRecommandee(
        action="Faire approuver le code par la direction.",
        rattachement=Rattachement(niveau="REGLE", reference="D1-01-R1"),
    )

    assert action.rattachement.niveau == "REGLE"
    with pytest.raises(ValidationError):
        ActionRecommandee(action="", rattachement=Rattachement(niveau="REGLE", reference="R1"))


def test_19_rattachement_inconnu_est_ecarte():
    catalogue = catalogue_de_reference()

    retenus = verifier_rattachements(
        [
            Rattachement(niveau="PREUVE_ATTENDUE", reference="D1-01-E1-P1"),
            Rattachement(niveau="EXIGENCE", reference="D1-01-E1"),
            Rattachement(niveau="REGLE", reference="D1-01-R1"),
            # Inventés : bien formés, absents du contexte transmis.
            Rattachement(niveau="PREUVE_ATTENDUE", reference="D1-01-E1-P9"),
            Rattachement(niveau="EXIGENCE", reference="D9-99-E1"),
            Rattachement(niveau="REGLE", reference="D1-01-R7"),
            # Bonne référence, mauvais niveau : une exigence n'est pas une règle.
            Rattachement(niveau="REGLE", reference="D1-01-E1"),
        ],
        catalogue,
    )

    assert [r.reference for r in retenus] == ["D1-01-E1-P1", "D1-01-E1", "D1-01-R1"]


def test_20_confiance_lecture_valide():
    analyse = AnalyseDocumentV2(
        piece_reference="p1",
        nom="code-de-conduite.txt",
        resume="Le document énonce des principes d'éthique.",
        constats=[ElementReleve(reference="D1-01-E1-P1", presence="ABSENT")],
        confiance_lecture=0.95,
    )

    assert analyse.confiance_lecture == 0.95
    # Optionnelle : un agent qui ne sait pas se prononcer ne doit pas être
    # forcé d'inventer un nombre.
    assert AnalyseDocumentV2(
        piece_reference="p1", nom="d.txt", resume="r"
    ).confiance_lecture is None
    with pytest.raises(ValidationError):
        AnalyseDocumentV2(
            piece_reference="p1", nom="d.txt", resume="r", confiance_lecture=1.2
        )


def test_21_sortie_v2_complete_et_version_refusee():
    recommandation = ResultatRecommandationV2(
        recommandation_necessaire=True,
        pistes_amelioration="Faire approuver le code par la direction.",
        actions=[
            ActionRecommandee(
                action="Dater et faire signer le document.",
                rattachement=Rattachement(niveau="REGLE", reference="D1-01-R1"),
            )
        ],
    )
    assert recommandation.actions[0].rattachement.reference == "D1-01-R1"
    # Pas de priorité : elle se dérive côté Java de la sévérité rattachée.
    assert not hasattr(recommandation.actions[0], "priorite")

    # Un majeur inconnu est refusé explicitement, jamais traité en dégradé.
    verifier_version_supportee("2.0")
    verifier_version_supportee("2.7")
    for refusee in ("1.0", "3.0", None):
        with pytest.raises(VersionContratNonSupportee):
            verifier_version_supportee(refusee)

    corps = payload_v2()
    corps["contrat_version"] = "3.0"
    reponse = client.post(ROUTE_V2, json=corps)
    assert reponse.status_code == 422
    assert "majeur" in reponse.text


# === Compatibilité et sources (22) =========================================


def test_22_le_contrat_v1_reste_intact():
    """
    Le V1 doit continuer à répondre comme avant.

    Éprouvé sur son refus le plus caractéristique — aucune source d'analyse —
    plutôt que sur un cas nominal, qui appellerait Gemini.
    """
    reponse = client.post(
        ROUTE_V1,
        json={
            "audit_critere_id": str(uuid.uuid4()),
            "critere_code": "D1-01",
            "critere_libelle": "Critère",
            "documents": [],
            "reponses": [],
        },
    )

    assert reponse.status_code == 422
    assert "Aucune source" in reponse.text


def test_23_v2_exige_au_moins_une_source():
    corps = payload_v2()
    corps["pieces"] = []
    corps["declaration"] = {"scenario": None, "reponses": []}

    reponse = client.post(ROUTE_V2, json=corps)

    assert reponse.status_code == 422
    assert "Aucune source" in reponse.text


def test_24_catalogue_vide_est_accepte():
    """
    37 des 92 critères publiés ne portent aucune règle : un catalogue vide est
    une décision métier assumée, pas un défaut à signaler.
    """
    corps = payload_v2()
    corps["catalogue"] = {"exigences": [], "preuves_attendues": [], "regles_analyse": []}

    reponse = client.post(ROUTE_V2, json=corps)

    assert reponse.status_code == 200
    resume = reponse.json()["resume_contexte"]
    assert resume["preuves_attendues"] == []
    assert resume["regles_analyse"] == []


def test_25_preuve_orpheline_est_refusee():
    """Une preuve dont l'exigence n'est pas transmise ferait juger sur une attente muette."""
    corps = payload_v2()
    corps["catalogue"]["exigences"] = []
    corps["catalogue"]["regles_analyse"] = []

    reponse = client.post(ROUTE_V2, json=corps)

    assert reponse.status_code == 422
    assert "absente du payload" in reponse.text


def test_26_reference_de_piece_en_double_est_refusee():
    corps = payload_v2()
    corps["pieces"].append(copy.deepcopy(corps["pieces"][0]))

    reponse = client.post(ROUTE_V2, json=corps)

    assert reponse.status_code == 422
    assert "pièce en double" in reponse.text or "en double" in reponse.text
