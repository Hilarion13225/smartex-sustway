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

    model_config = SettingsConfigDict(env_prefix="SMARTEX_", env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
