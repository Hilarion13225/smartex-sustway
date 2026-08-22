"""Configuration du service, chargée depuis les variables d'environnement."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    env: str = "dev"
    api_quarkus_base_url: str = "http://api-quarkus:8080"
    database_url: str = "postgresql://smartex:smartex@postgres:5432/smartex_sustway"
    redis_url: str = "redis://redis:6379/0"
    s3_endpoint: str = "http://minio:9000"
    s3_bucket: str = "smartex-documents"
    confiance_seuil_revue_experte: float = 0.80  # RG38 — seuil de confiance IA à 80 %

    # --- LLM (Compliance/Document Agents) ---
    # Gemini (Google AI Studio) — palier gratuit. ATTENTION : sur le palier
    # gratuit, les prompts peuvent être utilisés par Google pour améliorer
    # ses produits (contrairement au palier payant, qui exclut cet usage).
    # Décision actée pour la phase de développement — à requalifier avec
    # Smartex Expertises avant tout traitement de données clients réelles
    # (voir README, section "Agents IA").
    gemini_api_key: str = ""
    # TEMPORAIRE — bascule sur Flash-Lite pour contourner le quota gratuit
    # épuisé sur gemini-3.6-flash (paliers de quota distincts par modèle).
    # À REMETTRE sur "gemini-3.6-flash" une fois le quota principal
    # reconstitué (qualité légèrement inférieure sur Flash-Lite, acceptable
    # pour un test mais pas recommandé en continu).
    gemini_model: str = "gemini-3.5-flash-lite"

    model_config = SettingsConfigDict(env_prefix="SMARTEX_", env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
