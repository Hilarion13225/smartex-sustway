"""
La route V2 est protégée comme la V1 — même dépendance, mêmes refus.

Ces tests demandent explicitement la fixture `authentification_reelle` : sans
elle, la neutralisation posée par `conftest` ferait passer chacun d'eux sans
rien prouver. C'est la même précaution que dans
`test_authentification_service.py`, et pour la même raison.

Aucune règle RS256 n'est modifiée : la route V2 réutilise
`exiger_appel_de_service` telle quelle. Ces tests vérifient qu'elle est bien
branchée, pas qu'elle fonctionne — cela, l'autre fichier s'en charge.
"""

from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

ROUTE_V2 = "/api/v2/evaluations/critere"


def payload_minimal() -> dict:
    """Le plus petit contexte acceptable — l'authentification se joue avant la validation."""
    return {
        "contrat_version": "2.0",
        "tracabilite": {"audit_critere_id": str(uuid.uuid4())},
        "critere": {"code": "D1-01", "libelle": "Critère"},
        "declaration": {"scenario": "Situation décrite par l'organisation."},
    }


def test_sans_autorisation_la_route_v2_refuse(authentification_reelle):
    reponse = client.post(ROUTE_V2, json=payload_minimal())

    assert reponse.status_code == 401


def test_un_jeton_de_session_utilisateur_est_refuse(authentification_reelle):
    """
    Un jeton d'utilisateur ne porte ni l'audience ni le `purpose` attendus ici.

    C'est la garantie qui sépare les deux portes : un secret unique ouvrant la
    session ET l'appel interservice rendrait toute compromission totale.
    """
    reponse = client.post(
        ROUTE_V2,
        json=payload_minimal(),
        headers={"Authorization": "Bearer jeton.de.session"},
    )

    assert reponse.status_code == 401


def test_un_jeton_illisible_est_refuse(authentification_reelle):
    reponse = client.post(
        ROUTE_V2,
        json=payload_minimal(),
        headers={"Authorization": "Bearer ceci-nest-pas-un-jwt"},
    )

    assert reponse.status_code == 401


def test_un_entete_sans_schema_bearer_est_refuse(authentification_reelle):
    reponse = client.post(
        ROUTE_V2,
        json=payload_minimal(),
        headers={"Authorization": "jeton-sans-schema"},
    )

    assert reponse.status_code == 401


def test_avec_un_appelant_de_service_la_route_v2_repond():
    """Sans la fixture d'authentification réelle : l'appelant est admis par conftest."""
    reponse = client.post(ROUTE_V2, json=payload_minimal())

    assert reponse.status_code == 200
    assert reponse.json()["accepte"] is True
