"""
Le contexte porté par le référentiel atteint-il réellement le prompt ?

Exigences, preuves attendues et règles d'analyse sont des données métier
versionnées côté plateforme. Elles n'ont d'intérêt que si elles arrivent
jusqu'au modèle : vérifier qu'elles sont acceptées par le contrat ne
prouverait rien, elles pourraient être reçues puis ignorées.

Ces tests interrogent donc le texte du prompt lui-même, sans appeler
Gemini — le client est remplacé par un double.
"""

import base64
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.agents import evidence_compliance_agent
from app.agents.evidence_compliance_agent import ResultatEvidenceCompliance
from app.main import app
from app.routers.evaluations import Exigence, PreuveAttendue, RegleAnalyse

client = TestClient(app)


def _payload(**extra):
    base = {
        "audit_critere_id": "22222222-2222-2222-2222-222222222222",
        "critere_code": "ENV-12",
        "critere_libelle": "Gérer les déchets dangereux",
        "documents": [
            {
                "nom": "procedure-dechets.pdf",
                "type_mime": "application/pdf",
                "contenu_base64": base64.b64encode(b"contenu de test").decode(),
            }
        ],
    }
    base.update(extra)
    return base


# --- Le contrat accepte le nouveau contexte ---------------------------------


@patch("app.routers.evaluations.evidence_compliance_agent.evaluer", new_callable=AsyncMock)
@patch("app.routers.evaluations.document_agent.extraire", new_callable=AsyncMock)
def test_le_contexte_referentiel_est_transmis_a_l_agent(mock_extraire, mock_evaluer):
    mock_extraire.return_value = "Résumé factice."
    mock_evaluer.return_value = ResultatEvidenceCompliance(
        couverture_preuve=True,
        justification_couverture="Le document traite du sujet.",
        probabilite_conformite=0.7,
        confiance=0.8,
        justification_conformite="Procédure présente.",
    )

    r = client.post(
        "/api/v1/evaluations/critere",
        json=_payload(
            exigences=[
                {
                    "code": "ENV-12-E1",
                    "intitule": "Procédure de gestion des déchets dangereux",
                    "enonce": "L'organisation doit disposer d'une procédure de gestion des déchets dangereux.",
                }
            ],
            preuves_attendues=[
                {
                    "exigence_code": "ENV-12-E1",
                    "type": "PROCEDURE",
                    "libelle": "Procédure officielle signée",
                    "description": "Datée de moins de deux ans.",
                    "obligatoire": True,
                }
            ],
            regles_analyse=[
                {
                    "code": "ENV-12-R1",
                    "type": "SIGNATURE",
                    "libelle": "La procédure doit être validée par la direction",
                    "severite": "ELEVEE",
                    "exigence_code": "ENV-12-E1",
                    "preuve_attendue_libelle": "Procédure officielle signée",
                    "definition": {"autorites_acceptees": ["Direction générale", "HSE"]},
                }
            ],
        ),
    )

    assert r.status_code == 200
    appel = mock_evaluer.await_args.kwargs
    assert appel["exigences"][0].code == "ENV-12-E1"
    assert appel["preuves_attendues"][0].libelle == "Procédure officielle signée"
    assert appel["regles"][0].type == "SIGNATURE"


def test_le_contexte_referentiel_est_facultatif():
    """
    Un appel sans exigence ni règle reste valide : c'est l'état du
    référentiel tant qu'il n'a pas été enrichi, et le contrat ne doit pas
    imposer un contenu qui n'existe pas encore.
    """
    from app.routers.evaluations import EvaluerCritereRequest

    requete = EvaluerCritereRequest(**_payload())
    assert requete.exigences == []
    assert requete.preuves_attendues == []
    assert requete.regles_analyse == []


# --- Le prompt rend réellement ce contexte ----------------------------------


def _prompt(**contexte):
    return evidence_compliance_agent._construire_prompt(
        code="ENV-12",
        libelle="Gérer les déchets dangereux",
        description=None,
        resumes=["Résumé factice."],
        scenario=None,
        reponses=[],
        **contexte,
    )


def test_le_prompt_enonce_les_exigences():
    prompt = _prompt(
        exigences=[
            Exigence(
                code="ENV-12-E1",
                intitule="Procédure de gestion des déchets",
                enonce="L'organisation doit disposer d'une procédure de gestion des déchets dangereux.",
            )
        ]
    )
    assert "Exigences a verifier" in prompt
    assert "ENV-12-E1" in prompt
    assert "procédure de gestion des déchets dangereux" in prompt


def test_le_prompt_distingue_l_attendu_du_fourni():
    prompt = _prompt(
        preuves_attendues=[
            PreuveAttendue(
                exigence_code="ENV-12-E1",
                type="REGISTRE",
                libelle="Registre de suivi des enlèvements",
                description="Tenu sur les douze derniers mois.",
                obligatoire=True,
            )
        ]
    )
    # Ce que l'organisation devrait fournir...
    assert "Registre de suivi des enlèvements" in prompt
    assert "obligatoire" in prompt
    # ...énoncé séparément de ce qu'elle a effectivement fourni.
    assert "et non ce qu'elle a fourni" in prompt
    assert "Resumes des documents deposes" in prompt


def test_le_prompt_rend_les_regles_avec_leur_portee_et_leur_severite():
    prompt = _prompt(
        regles=[
            RegleAnalyse(
                code="ENV-12-R1",
                type="DATE_VALIDITE",
                libelle="La procédure doit avoir été révisée récemment",
                severite="CRITIQUE",
                exigence_code="ENV-12-E1",
                preuve_attendue_libelle="Procédure officielle signée",
                definition={"champ": "date de révision", "anciennete_maximale_mois": 24},
            ),
            RegleAnalyse(
                code="ENV-12-R2",
                type="INCOHERENCE",
                libelle="Détecter une contradiction entre les exigences",
                severite="MOYENNE",
                definition={"elements": ["volumes déclarés", "volumes du registre"]},
            ),
        ]
    )
    assert "DATE_VALIDITE" in prompt
    assert "severite CRITIQUE" in prompt
    # La portée est explicite : la pièce précise pour la première règle,
    # le critère entier pour la seconde.
    assert "Procédure officielle signée" in prompt
    assert "le critere dans son ensemble" in prompt
    assert "anciennete_maximale_mois : 24" in prompt
    assert "volumes du registre" in prompt


def test_sans_contexte_le_prompt_reste_celui_d_avant():
    """
    L'enrichissement est progressif : tant que le référentiel ne porte ni
    exigence ni règle, le prompt ne doit gagner aucun bloc vide.
    """
    prompt = _prompt()
    assert "Exigences a verifier" not in prompt
    assert "Elements attendus en demonstration" not in prompt
    assert "Regles d'analyse a appliquer" not in prompt
    assert "Tu es un agent d'evaluation RSE" in prompt
