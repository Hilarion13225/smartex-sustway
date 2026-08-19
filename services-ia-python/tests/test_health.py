from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_declencher_analyse_standard():
    payload = {"audit_id": "11111111-1111-1111-1111-111111111111", "formule": "STANDARD"}
    r = client.post("/api/v1/analyses", json=payload)
    assert r.status_code == 202
    assert r.json()["statut"] == "EN_ATTENTE"


def test_declencher_analyse_formule_invalide():
    payload = {"audit_id": "11111111-1111-1111-1111-111111111111", "formule": "PREMIUM"}
    r = client.post("/api/v1/analyses", json=payload)
    assert r.status_code == 422  # formule hors énumération STANDARD/AVANCEES
