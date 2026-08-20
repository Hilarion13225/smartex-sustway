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
