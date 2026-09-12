"""
Tests de sécurité de l'instrumentation.

Le principe éprouvé ici est simple à énoncer et facile à perdre : **rien de
ce qui identifie ou authentifie ne doit franchir la frontière du service**,
ni vers le journal, ni vers la réponse HTTP. Les quatre formes injectées
ci-dessous sont celles qui menacent réellement ce service — un en-tête
d'autorisation, une clé d'API, un document encodé, une URL authentifiée.

Ces tests ne valident pas une intention mais un résultat : chacun cherche la
chaîne secrète dans la sortie et échoue si elle s'y trouve.
"""

import io
import logging
from contextlib import contextmanager

import pytest
from fastapi.testclient import TestClient

from app.journalisation import MasquageSecrets, configurer_journalisation
from app.services.assainissement import assainir, message_public

# Les quatre injections du cahier de vérification. Volontairement
# reconnaissables : si l'une d'elles ressort quelque part, le test le dit
# sans ambiguïté.
JETON = "Bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJhcGkifQ.c2lnbmF0dXJlX3NlY3JldGU"
CLE_API = "AIzaSyB1234567890abcdefghijklmnopqrstuv"
DOCUMENT = "JVBERi0xLjQKJcfsj6IKNSAwIG9iago8PC9MZW5ndGggNiAwIFIvRmlsdGVyIC9GbGF0ZURlY29kZT4+" * 3
URL_AUTHENTIFIEE = "https://generativelanguage.googleapis.com/v1beta/models?key=SECRET_ABC123"


class _Fuite(RuntimeError):
    """Une exception qui porte tout ce qui ne doit jamais sortir."""

    def __init__(self):
        super().__init__(
            f"Échec de l'appel. Authorization: {JETON} ; api_key={CLE_API} ; "
            f"base64={DOCUMENT} ; url={URL_AUTHENTIFIEE}"
        )


SECRETS = ["c2lnbmF0dXJlX3NlY3JldGU", CLE_API, DOCUMENT, "SECRET_ABC123"]


def _aucun_secret(texte: str) -> None:
    for secret in SECRETS:
        assert secret not in texte, f"fuite de « {secret[:24]}… » dans : {texte[:200]}"


# --- L'assainissement lui-même ------------------------------------------


@pytest.mark.parametrize("secret", SECRETS)
def test_aucune_des_quatre_injections_ne_survit_a_l_assainissement(secret):
    assaini = assainir(str(_Fuite()))

    assert secret not in assaini


def test_l_assainissement_conserve_ce_qui_sert_au_diagnostic():
    """
    Masquer n'est utile que si le message reste exploitable.

    Un message intégralement caviardé serait sûr et inutilisable ; on
    vérifie donc que le motif technique subsiste.
    """
    assaini = assainir(f"QuotaExceeded: dépassement pour api_key={CLE_API}")

    assert "QuotaExceeded" in assaini
    assert "dépassement" in assaini
    assert CLE_API not in assaini


def test_l_hote_d_une_url_reste_lisible_mais_pas_ses_parametres():
    assaini = assainir(f"appel vers {URL_AUTHENTIFIEE}")

    assert "generativelanguage.googleapis.com" in assaini
    assert "SECRET_ABC123" not in assaini


def test_un_message_demesure_est_borne():
    assaini = assainir("x" * 5000)

    assert len(assaini) <= 420


def test_le_message_public_ne_livre_que_le_type():
    """Ce que reçoit l'appelant HTTP : de quoi trier, rien de plus."""
    public = message_public(_Fuite(), "Échec du pipeline d'agents IA", "INTERNE")

    _aucun_secret(public)
    assert public == "Échec du pipeline d'agents IA (INTERNE)"


# --- Le filtre de journalisation ----------------------------------------


def test_le_filtre_masque_un_secret_passe_par_argument():
    """
    Le message est rendu avant masquage.

    Sans cela, un secret passé en argument de `logger.info("… %s", secret)`
    traverserait le filtre intact, puisqu'il n'est pas dans `record.msg`.
    """
    enregistrement = logging.LogRecord(
        "test", logging.INFO, __file__, 1, "appel refusé : %s", (str(_Fuite()),), None
    )

    MasquageSecrets().filter(enregistrement)

    _aucun_secret(enregistrement.getMessage())


def test_le_filtre_retire_la_pile_qui_porte_les_variables_locales():
    """
    Une pile rend les variables locales — dont le prompt et le contenu.

    C'est la raison pour laquelle les agents journalisent désormais avec
    `logger.error` et non `logger.exception`.
    """
    try:
        raise _Fuite()
    except _Fuite:
        import sys

        enregistrement = logging.LogRecord(
            "test", logging.ERROR, __file__, 1, "échec", (), sys.exc_info()
        )

    MasquageSecrets().filter(enregistrement)

    assert enregistrement.exc_info is None
    assert "pile masquée" in enregistrement.msg


def test_la_configuration_de_journalisation_ne_double_pas_les_lignes():
    """
    Sans idempotence, chaque import ajouterait un gestionnaire de plus.

    Le défaut serait discret : les messages apparaîtraient deux fois, puis
    trois, sans qu'aucune erreur ne soit levée.
    """
    configurer_journalisation()
    avant = len(logging.getLogger().handlers)

    configurer_journalisation()

    assert len(logging.getLogger().handlers) == avant


@contextmanager
def sortie_du_journal():
    """
    Observe ce que le gestionnaire réellement configuré écrit.

    `capsys` ne convient pas ici : le gestionnaire capte `sys.stdout` au
    moment où il est créé — au premier import de l'application — donc bien
    avant que pytest ne substitue le sien. Un test bâti sur `capsys` lirait
    un flux vide et **passerait sans rien prouver** dès lors qu'il cherche
    l'absence d'un secret. On détourne donc le flux du vrai gestionnaire,
    ce qui éprouve la chaîne complète : formateur et filtre compris.
    """
    configurer_journalisation()
    gestionnaire = next(
        h for h in logging.getLogger().handlers if getattr(h, "_smartex_journalisation", False)
    )
    origine = gestionnaire.stream
    tampon = io.StringIO()
    gestionnaire.stream = tampon
    try:
        yield tampon
    finally:
        gestionnaire.stream = origine


def test_la_journalisation_applicative_produit_reellement_une_sortie():
    """
    Le défaut relevé en phase 5.5 : le logger racine n'avait aucun
    gestionnaire, et Python jetait silencieusement tous les messages.
    """
    with sortie_du_journal() as journal:
        logging.getLogger("app.test").warning("message applicatif de contrôle")

    assert "message applicatif de contrôle" in journal.getvalue()


def test_un_secret_journalise_par_une_bibliotheque_tierce_est_masque():
    """Le filtre est sur le gestionnaire, donc il couvre aussi le code tiers."""
    with sortie_du_journal() as journal:
        logging.getLogger("bibliotheque.tierce").warning("requête %s", URL_AUTHENTIFIEE)

    sortie = journal.getvalue()
    # La ligne doit exister — sans quoi l'absence de secret ne prouverait rien.
    assert "requête" in sortie
    _aucun_secret(sortie)


# --- La frontière HTTP ---------------------------------------------------


def test_la_reponse_http_ne_renvoie_pas_l_exception_brute(monkeypatch):
    """
    L'anomalie corrigée en phase 5.6.

    Le service concaténait le texte de l'exception dans le champ `detail`,
    exposant à l'appelant ce que le SDK y avait mis.
    """
    from app.main import app
    from app.routers import evaluations
    from app.services.authentification import exiger_appel_de_service

    async def echouer(*args, **kwargs):
        raise _Fuite()

    monkeypatch.setattr(evaluations.document_agent, "extraire", echouer)
    app.dependency_overrides[exiger_appel_de_service] = lambda: "api"

    try:
        reponse = TestClient(app).post(
            "/api/v1/evaluations/critere",
            json={
                "audit_critere_id": "178c7a48-9d27-46e8-baa9-f70d1aa44d9c",
                "critere_code": "D1-01",
                "critere_libelle": "Politique RSE formalisée",
                "documents": [
                    {
                        "nom": "politique.pdf",
                        "type_mime": "application/pdf",
                        "contenu_base64": "JVBERi0xLjQK",
                    }
                ],
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert reponse.status_code == 503
    _aucun_secret(reponse.text)
    assert reponse.json()["detail"] == "Échec du pipeline d'agents IA (INTERNE)"


def test_le_resume_journalisable_d_une_trace_ne_contient_ni_prompt_ni_contenu():
    """
    Le contrat de trace, vérifié sur sa forme.

    Il ne s'agit pas de faire confiance à la discipline d'écriture : on
    énumère les clés et on refuse tout ce qui n'est pas un identifiant ou
    une mesure.
    """
    from datetime import datetime, timezone

    from app.services.appel_gemini import AppelTrace, StatutAppel

    trace = AppelTrace(
        agent="EVIDENCE",
        statut=StatutAppel.TERMINE,
        requested_model="gemini-3.5-flash-lite",
        served_model="gemini-3.5-flash-lite",
        response_id="r-1",
        started_at=datetime.now(timezone.utc),
        finished_at=datetime.now(timezone.utc),
        duration_ms=42,
    )

    autorisees = {
        "agent", "piece", "statut", "provider", "requested_model",
        "served_model", "response_id", "duration_ms", "total_token_count",
        "error_type",
    }

    assert set(trace.resume_journalisable()) == autorisees
