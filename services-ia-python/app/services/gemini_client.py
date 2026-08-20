"""
Client Gemini partagé (Google AI Studio, palier gratuit).

Voir app/config.py pour la mise en garde sur le palier gratuit (usage des
prompts pour l'entraînement) — décision actée pour la phase de
développement, à requalifier avant tout traitement de données clients
réelles.

⚠️ Composant non testé contre la vraie API Gemini dans l'environnement où
ce code a été écrit (pas de clé API disponible) — la logique d'appel suit
la documentation officielle du SDK google-genai, mais les tests
automatisés de ce lot mockent cette couche plutôt que d'appeler l'API
réelle (voir tests/test_evaluations.py).
"""

from functools import lru_cache

from google import genai

from app.config import get_settings


class GeminiNonConfigure(RuntimeError):
    """Levée si aucune clé API Gemini n'est configurée."""


@lru_cache
def get_client() -> genai.Client:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise GeminiNonConfigure(
            "SMARTEX_GEMINI_API_KEY non configurée — créez une clé gratuite sur "
            "https://aistudio.google.com/apikey et renseignez-la dans votre .env"
        )
    return genai.Client(api_key=settings.gemini_api_key)
