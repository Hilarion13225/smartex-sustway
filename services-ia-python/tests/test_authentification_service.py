"""
Vérification du jeton de service porté par les appels entrants.

Ce service fait travailler un modèle payant au quota limité et lit des
documents qu'on lui confie. Sans contrôle, tout conteneur du réseau pouvait le
solliciter. Ce qui est éprouvé ici, c'est que le contrôle refuse tout ce qui
n'est pas exactement un jeton émis par l'API Java pour ce service-là — et
qu'il refuse aussi, plutôt que d'ouvrir, quand il ne peut vérifier personne.

Les clés sont fabriquées dans le test. Aucun secret du dépôt n'y entre, et la
paire de production n'est jamais nécessaire pour faire tourner la suite.
"""

import base64
import json
import time

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app

CHEMIN_EXTRACTION = "/api/v1/referentiels/imports/extraction"
CHEMIN_EVALUATION = "/api/v1/evaluations/critere"
CHEMIN_ANALYSES = "/api/v1/analyses"

EMETTEUR = "https://smartex-sustway.local"
AUDIENCE = "services-ia"

client = TestClient(app)


# --- Matériel de test --------------------------------------------------------


def _paire_de_cles():
    cle = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    privee = cle.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    publique = (
        cle.public_key()
        .public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        .decode()
    )
    return privee, publique


CLE_PRIVEE, CLE_PUBLIQUE = _paire_de_cles()
AUTRE_PRIVEE, _ = _paire_de_cles()


def _jeton(
    cle=CLE_PRIVEE,
    purpose="SERVICE_IA",
    audience=AUDIENCE,
    emetteur=EMETTEUR,
    duree=300,
    sujet="api-quarkus",
):
    maintenant = int(time.time())
    return jwt.encode(
        {
            "iss": emetteur,
            "sub": sujet,
            "aud": audience,
            "purpose": purpose,
            "iat": maintenant,
            "exp": maintenant + duree,
        },
        cle,
        algorithm="RS256",
    )


def _requete_extraction():
    contenu = "code;libelle\nD1-01;Gouvernance\n".encode("utf-8")
    return {
        "import_id": "11111111-1111-1111-1111-111111111111",
        "nom_fichier": "grille.csv",
        "type_mime": "text/csv",
        "contenu_base64": base64.b64encode(contenu).decode(),
    }


@pytest.fixture
def cle_configuree(tmp_path, monkeypatch):
    """
    Installe la clé publique de test, par chemin — la forme du développement.

    Le cache de `get_settings` est vidé de part et d'autre : sans cela, le
    premier test à lire la configuration la figerait pour tous les suivants.
    """
    fichier = tmp_path / "publicKey.pem"
    fichier.write_text(CLE_PUBLIQUE, encoding="utf-8")
    monkeypatch.setenv("SMARTEX_JWT_PUBLIC_KEY_PATH", str(fichier))
    monkeypatch.setenv("SMARTEX_JWT_ISSUER", EMETTEUR)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def aucune_cle(monkeypatch):
    monkeypatch.setenv("SMARTEX_JWT_PUBLIC_KEY_PATH", "")
    monkeypatch.setenv("SMARTEX_JWT_PUBLIC_KEY", "")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _appeler(jeton=None, chemin=CHEMIN_EXTRACTION, corps=None):
    entetes = {"Authorization": f"Bearer {jeton}"} if jeton else {}
    return client.post(
        chemin, json=corps if corps is not None else _requete_extraction(), headers=entetes
    )


# --- Absence de jeton --------------------------------------------------------


def test_sans_entete_lappel_est_refuse(authentification_reelle, cle_configuree):
    reponse = _appeler()
    assert reponse.status_code == 401


def test_entete_mal_formee_est_refusee(authentification_reelle, cle_configuree):
    reponse = client.post(
        CHEMIN_EXTRACTION,
        json=_requete_extraction(),
        headers={"Authorization": _jeton()},  # sans le préfixe « Bearer »
    )
    assert reponse.status_code == 401


# --- Jetons invalides --------------------------------------------------------


def test_jeton_signe_par_une_autre_cle_est_refuse(authentification_reelle, cle_configuree):
    """C'est tout l'intérêt de la signature : détenir un jeton ne suffit pas à en forger un."""
    reponse = _appeler(_jeton(cle=AUTRE_PRIVEE))
    assert reponse.status_code == 401


def test_jeton_expire_est_refuse(authentification_reelle, cle_configuree):
    """Un jeton intercepté ne doit rester utilisable que quelques minutes."""
    reponse = _appeler(_jeton(duree=-60))
    assert reponse.status_code == 401


def test_jeton_dune_autre_audience_est_refuse(authentification_reelle, cle_configuree):
    reponse = _appeler(_jeton(audience="une-autre-application"))
    assert reponse.status_code == 401


def test_jeton_dun_autre_emetteur_est_refuse(authentification_reelle, cle_configuree):
    reponse = _appeler(_jeton(emetteur="https://ailleurs.example"))
    assert reponse.status_code == 401


def test_jeton_de_session_dutilisateur_est_refuse(authentification_reelle, cle_configuree):
    """
    Le cas qui justifie le claim `purpose`.

    Un jeton de session est signé par la même clé et reste cryptographiquement
    valide ici. Sans cette vérification, le jeton de n'importe quel utilisateur
    connecté suffirait à faire travailler le modèle.
    """
    reponse = _appeler(_jeton(purpose="SESSION", sujet="un-utilisateur"))
    assert reponse.status_code == 401


def test_jeton_sans_purpose_est_refuse(authentification_reelle, cle_configuree):
    reponse = _appeler(_jeton(purpose=None))
    assert reponse.status_code == 401


def test_le_motif_du_refus_nest_pas_divulgue(authentification_reelle, cle_configuree):
    """
    Dire laquelle des vérifications a échoué apprend à l'appelant laquelle
    contourner. Le motif reste dans les journaux du service.
    """
    reponse = _appeler(_jeton(audience="une-autre-application"))
    detail = reponse.json()["detail"]
    assert detail == "Jeton de service invalide"
    assert "audience" not in detail.lower()


# --- Configuration manquante -------------------------------------------------


def test_sans_cle_configuree_le_service_refuse_au_lieu_douvrir(
    authentification_reelle, aucune_cle
):
    """
    Le pire comportement serait d'ouvrir : la protection disparaîtrait
    silencieusement le jour où la configuration se perdrait.
    """
    reponse = _appeler(_jeton())
    assert reponse.status_code == 503


def test_sans_cle_configuree_aucun_appel_ne_passe_meme_sans_jeton(
    authentification_reelle, aucune_cle
):
    reponse = _appeler()
    assert reponse.status_code == 503


# --- Jeton valide ------------------------------------------------------------


def test_un_jeton_de_service_valide_passe(authentification_reelle, cle_configuree):
    """La vérification ne doit pas non plus refuser le chemin légitime."""
    from unittest.mock import AsyncMock, patch

    from app.models.import_referentiel import (
        BrouillonImporte,
        CritereExtrait,
        DomaineExtrait,
        ReferentielExtrait,
    )

    brouillon = BrouillonImporte(
        referentiel=ReferentielExtrait(code="TEST", nom="Test"),
        domaines=[
            DomaineExtrait(
                code="D1",
                nom="Gouvernance",
                criteres=[CritereExtrait(code="D1-01", libelle="Un critère")],
            )
        ],
    )
    with patch(
        "app.agents.referentiel_import_agent._analyser_lot", new_callable=AsyncMock
    ) as lot:
        lot.return_value = brouillon
        reponse = _appeler(_jeton())

    assert reponse.status_code == 200


def test_la_cle_peut_aussi_etre_fournie_en_clair(authentification_reelle, monkeypatch):
    """
    Les deux formes existent parce que les deux environnements diffèrent : un
    fichier monté en développement, une variable en production.
    """
    monkeypatch.setenv("SMARTEX_JWT_PUBLIC_KEY_PATH", "")
    monkeypatch.setenv("SMARTEX_JWT_PUBLIC_KEY", CLE_PUBLIQUE)
    monkeypatch.setenv("SMARTEX_JWT_ISSUER", EMETTEUR)
    get_settings.cache_clear()
    try:
        # Un jeton d'une autre audience : refusé pour ce motif, donc vérifié,
        # donc la clé a bien été lue. Un 503 dirait au contraire qu'elle ne
        # l'a pas été.
        reponse = _appeler(_jeton(audience="ailleurs"))
        assert reponse.status_code == 401
    finally:
        get_settings.cache_clear()


# --- Toutes les routes sont couvertes ----------------------------------------


def test_la_route_devaluation_est_protegee_elle_aussi(authentification_reelle, cle_configuree):
    """
    Non-régression : cette route existait avant et n'était pas protégée.
    C'est elle qui consomme le quota du modèle pour les missions.
    """
    reponse = _appeler(chemin=CHEMIN_EVALUATION, corps={})
    assert reponse.status_code == 401


def test_la_route_danalyse_est_protegee_elle_aussi(authentification_reelle, cle_configuree):
    reponse = _appeler(
        chemin=CHEMIN_ANALYSES,
        corps={"audit_id": "11111111-1111-1111-1111-111111111111", "formule": "STANDARD"},
    )
    assert reponse.status_code == 401


def test_la_route_de_sante_reste_ouverte(cle_configuree):
    """
    Elle ne doit pas l'être : Docker interroge cette route pour savoir si le
    conteneur est vivant, et un contrôle d'appelant la rendrait rouge en
    permanence. Elle n'expose rien et ne consomme rien.
    """
    assert client.get("/health").status_code == 200


def test_aucun_jeton_nest_ecrit_dans_le_depot():
    """
    Garde-fou contre la tentation du jeton en dur : un jeton de service est
    signé à la demande, jamais stocké. Vérifié sur la vérification elle-même,
    l'endroit où un « jeton d'exemple » se glisserait le plus naturellement.
    """
    from pathlib import Path

    source = Path("app/services/authentification.py").read_text(encoding="utf-8")
    assert "eyJ" not in source, "Un JWT en dur commence par « eyJ »"
    for segment in ("BEGIN RSA PRIVATE KEY", "BEGIN PRIVATE KEY"):
        assert segment not in source
