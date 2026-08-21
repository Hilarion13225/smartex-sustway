"""
Tests de l'orchestration Document -> Evidence -> Compliance.

Les agents Gemini sont mockés (aucune clé API réelle nécessaire) : ces
tests valident l'orchestration, la validation des entrées et la gestion
d'erreurs — pas la qualité des réponses de Gemini lui-même, qui ne peut
pas être testée sans clé API réelle.
"""

import base64
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.agents.evidence_compliance_agent import ResultatEvidenceCompliance

client = TestClient(app)


def _payload():
    return {
        "audit_critere_id": "11111111-1111-1111-1111-111111111111",
        "critere_code": "GOUV-07",
        "critere_libelle": "Connaître et formaliser une politique de lutte contre la corruption",
        "critere_description": None,
        "documents": [
            {
                "nom": "politique-anti-corruption.pdf",
                "type_mime": "application/pdf",
                "contenu_base64": base64.b64encode(b"contenu de test").decode(),
            }
        ],
    }


@patch("app.routers.evaluations.evidence_compliance_agent.evaluer", new_callable=AsyncMock)
@patch("app.routers.evaluations.document_agent.extraire", new_callable=AsyncMock)
def test_evaluer_critere_flux_nominal(mock_extraire, mock_evaluer):
    mock_extraire.return_value = "Résumé factice du document."
    mock_evaluer.return_value = ResultatEvidenceCompliance(
        couverture_preuve=True,
        justification_couverture="Le document traite bien de la politique anti-corruption.",
        probabilite_conformite=0.85,
        confiance=0.9,
        justification_conformite="La politique est formalisée et signée par la direction.",
    )

    r = client.post("/api/v1/evaluations/critere", json=_payload())

    assert r.status_code == 200
    body = r.json()
    assert body["probabilite_conformite"] == 0.85
    assert body["confiance_ia"] == 0.9
    assert body["couverture_preuve"] is True
    assert len(body["documents_analyses"]) == 1
    assert body["documents_analyses"][0]["resume"] == "Résumé factice du document."

    mock_extraire.assert_awaited_once()
    mock_evaluer.assert_awaited_once()


def test_evaluer_critere_sans_document_est_rejete():
    payload = _payload()
    payload["documents"] = []
    r = client.post("/api/v1/evaluations/critere", json=payload)
    assert r.status_code == 422


def test_evaluer_critere_base64_invalide_est_rejete():
    payload = _payload()
    payload["documents"][0]["contenu_base64"] = "!!!pas du base64 valide!!!"
    r = client.post("/api/v1/evaluations/critere", json=payload)
    assert r.status_code == 422


@patch("app.routers.evaluations.document_agent.extraire", new_callable=AsyncMock)
def test_evaluer_critere_echec_gemini_devient_503(mock_extraire):
    mock_extraire.side_effect = RuntimeError("quota dépassé")
    r = client.post("/api/v1/evaluations/critere", json=_payload())
    assert r.status_code == 503


@patch("app.routers.evaluations.risk_agent.evaluer", new_callable=AsyncMock)
@patch("app.routers.evaluations.evidence_compliance_agent.evaluer", new_callable=AsyncMock)
@patch("app.routers.evaluations.document_agent.extraire", new_callable=AsyncMock)
def test_evaluer_critere_avec_analyse_risque_appelle_le_risk_agent(mock_extraire, mock_evaluer, mock_risque):
    from app.agents.risk_agent import ResultatRisque

    mock_extraire.return_value = "Résumé factice du document."
    mock_evaluer.return_value = ResultatEvidenceCompliance(
        couverture_preuve=True,
        justification_couverture="Couverture ok.",
        probabilite_conformite=0.85,
        confiance=0.9,
        justification_conformite="Conforme.",
    )
    mock_risque.return_value = ResultatRisque(
        signal_risque=True,
        categorie="PREUVE_GENERIQUE",
        justification="Le document ressemble à un gabarit non personnalisé.",
    )

    payload = _payload()
    payload["analyse_risque"] = True
    r = client.post("/api/v1/evaluations/critere", json=payload)

    assert r.status_code == 200
    body = r.json()
    assert body["signal_risque"] is True
    assert body["categorie_risque"] == "PREUVE_GENERIQUE"
    assert body["justification_risque"] == "Le document ressemble à un gabarit non personnalisé."
    mock_risque.assert_awaited_once()


@patch("app.routers.evaluations.risk_agent.evaluer", new_callable=AsyncMock)
@patch("app.routers.evaluations.evidence_compliance_agent.evaluer", new_callable=AsyncMock)
@patch("app.routers.evaluations.document_agent.extraire", new_callable=AsyncMock)
def test_evaluer_critere_sans_analyse_risque_n_appelle_pas_le_risk_agent(mock_extraire, mock_evaluer, mock_risque):
    mock_extraire.return_value = "Résumé factice du document."
    mock_evaluer.return_value = ResultatEvidenceCompliance(
        couverture_preuve=True,
        justification_couverture="Couverture ok.",
        probabilite_conformite=0.85,
        confiance=0.9,
        justification_conformite="Conforme.",
    )

    r = client.post("/api/v1/evaluations/critere", json=_payload())  # analyse_risque absent -> False par défaut

    assert r.status_code == 200
    body = r.json()
    assert body["signal_risque"] is None
    assert body["categorie_risque"] is None
    mock_risque.assert_not_awaited()


@patch("app.routers.evaluations.recommendation_agent.evaluer", new_callable=AsyncMock)
@patch("app.routers.evaluations.evidence_compliance_agent.evaluer", new_callable=AsyncMock)
@patch("app.routers.evaluations.document_agent.extraire", new_callable=AsyncMock)
def test_evaluer_critere_avec_recommandation_appelle_le_recommendation_agent(mock_extraire, mock_evaluer, mock_reco):
    from app.agents.recommendation_agent import ResultatRecommandation

    mock_extraire.return_value = "Résumé factice du document."
    mock_evaluer.return_value = ResultatEvidenceCompliance(
        couverture_preuve=False,
        justification_couverture="Couverture partielle.",
        probabilite_conformite=0.4,
        confiance=0.7,
        justification_conformite="Preuve insuffisante.",
    )
    mock_reco.return_value = ResultatRecommandation(
        recommandation_necessaire=True,
        pistes_amelioration="Fournir un document daté et signé par la direction.",
    )

    payload = _payload()
    payload["generer_recommandation"] = True
    r = client.post("/api/v1/evaluations/critere", json=payload)

    assert r.status_code == 200
    body = r.json()
    assert body["recommandation_necessaire"] is True
    assert body["pistes_amelioration"] == "Fournir un document daté et signé par la direction."
    mock_reco.assert_awaited_once()


@patch("app.routers.evaluations.recommendation_agent.evaluer", new_callable=AsyncMock)
@patch("app.routers.evaluations.evidence_compliance_agent.evaluer", new_callable=AsyncMock)
@patch("app.routers.evaluations.document_agent.extraire", new_callable=AsyncMock)
def test_evaluer_critere_sans_recommandation_n_appelle_pas_le_recommendation_agent(
    mock_extraire, mock_evaluer, mock_reco
):
    mock_extraire.return_value = "Résumé factice du document."
    mock_evaluer.return_value = ResultatEvidenceCompliance(
        couverture_preuve=True,
        justification_couverture="Couverture ok.",
        probabilite_conformite=0.85,
        confiance=0.9,
        justification_conformite="Conforme.",
    )

    r = client.post("/api/v1/evaluations/critere", json=_payload())  # generer_recommandation absent -> False

    assert r.status_code == 200
    body = r.json()
    assert body["recommandation_necessaire"] is None
    assert body["pistes_amelioration"] is None
    mock_reco.assert_not_awaited()
