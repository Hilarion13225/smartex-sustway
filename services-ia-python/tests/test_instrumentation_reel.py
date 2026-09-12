"""
Vérification RÉELLE de l'instrumentation contre l'API Gemini.

Les tests de `test_appel_gemini.py` démontrent que l'enrobage recopie
fidèlement ce qu'un faux client lui donne. Ils ne démontrent pas que le
fournisseur donne réellement quelque chose : un faux client peut rendre un
`model_version` parce qu'on le lui a dit, et une trace pleine de champs nuls
en production passerait tous ces tests.

Ce fichier comble précisément cet écart. Il consomme du quota réel — deux
appels — et n'a de valeur que pour cette raison.

Aucune clé, aucun contenu, aucune réponse brute n'est affiché ici.
"""

import asyncio

import pytest

from app.config import get_settings
from app.services.appel_gemini import StatutAppel, appeler_gemini
from app.services.gemini_client import get_client

pytestmark = pytest.mark.skipif(
    not get_settings().gemini_api_key,
    reason="SMARTEX_GEMINI_API_KEY absente — vérification réelle impossible",
)


@pytest.fixture(autouse=True)
def client_neuf_par_test():
    """
    `get_client` est mis en cache, et le pool HTTP du client se lie à la
    boucle asyncio qui l'a créé. Sans purge, le second `asyncio.run` échoue
    sur « Event loop is closed ».
    """
    get_client.cache_clear()
    yield
    get_client.cache_clear()


@pytest.fixture(scope="module")
def appel_reel():
    """
    Un seul appel réel, partagé par les assertions qui l'inspectent.

    Séparer chaque assertion dans son propre test coûterait un appel
    supplémentaire par assertion, sans rien démontrer de plus.
    """
    get_client.cache_clear()
    try:
        return asyncio.run(
            appeler_gemini(
                agent="EVIDENCE",
                contents="Réponds exactement le mot : conforme.",
            )
        )
    finally:
        get_client.cache_clear()


def test_le_fournisseur_reel_rapporte_le_modele_qu_il_a_servi(appel_reel):
    """
    Le champ décisif : sans lui, un changement de modèle serait invisible.

    On n'exige pas l'égalité avec le modèle demandé — le fournisseur a le
    droit de servir autre chose, et c'est justement ce qu'on veut voir.
    """
    assert appel_reel.trace.statut is StatutAppel.TERMINE
    assert appel_reel.trace.served_model, "le fournisseur n'a rapporté aucun modèle servi"
    print(
        f"\n  modèle demandé : {appel_reel.trace.requested_model}"
        f"\n  modèle servi   : {appel_reel.trace.served_model}"
    )


def test_le_fournisseur_reel_rapporte_un_identifiant_d_appel(appel_reel):
    """Seul ancrage permettant une réclamation auprès du fournisseur."""
    assert appel_reel.trace.response_id
    print(f"\n  response_id : {appel_reel.trace.response_id}")


def test_les_jetons_reellement_consommes_sont_releves(appel_reel):
    """
    Trois compteurs, mesurés — pas déduits.

    Si le fournisseur cessait de les rapporter, ce test le dirait plutôt que
    de laisser une trace silencieusement vide.
    """
    usage = appel_reel.trace.usage
    assert usage is not None, "aucun usage rapporté par le fournisseur"
    assert usage.prompt_token_count and usage.prompt_token_count > 0
    assert usage.total_token_count and usage.total_token_count > 0
    print(
        f"\n  jetons prompt/candidats/total : {usage.prompt_token_count}/"
        f"{usage.candidates_token_count}/{usage.total_token_count}"
    )


def test_la_duree_mesuree_correspond_a_un_appel_reseau(appel_reel):
    """Un appel réel prend du temps ; une durée nulle trahirait une mesure factice."""
    assert appel_reel.trace.duration_ms > 0
    assert appel_reel.trace.finished_at > appel_reel.trace.started_at
    print(f"\n  durée : {appel_reel.trace.duration_ms} ms")


def test_un_modele_inexistant_produit_une_trace_d_erreur_exploitable():
    """
    L'échec est éprouvé en vrai, pas simulé.

    C'est le seul moyen de savoir ce que le SDK lève réellement et si le
    classement de l'erreur tient face au fournisseur. L'appel est refusé par
    Gemini avant toute génération : il ne consomme pas de quota de jetons.
    """
    get_client.cache_clear()
    with pytest.raises(Exception) as capture:
        asyncio.run(
            appeler_gemini(
                agent="RISK",
                contents="test",
                model="modele-qui-n-existe-pas-smartex",
            )
        )
    get_client.cache_clear()

    trace = getattr(capture.value, "trace_appel", None)
    assert trace is not None, "aucune trace attachée à l'exception réelle"
    assert trace.statut is StatutAppel.ERREUR
    assert trace.served_model is None
    assert trace.error is not None

    # Ce que le classement a réellement produit face au vrai fournisseur.
    # La valeur est affichée plutôt qu'imposée : la phase 5.5 a laissé la
    # discrimination des erreurs fournisseur « À CONFIRMER », et ce test est
    # l'observation qui la documente.
    print(
        f"\n  type d'exception : {type(capture.value).__name__}"
        f"\n  catégorie retenue : {trace.error.type.value}"
        f"\n  message assaini : {trace.error.message}"
    )

    assert "AIza" not in trace.error.message
