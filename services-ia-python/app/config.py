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

    # --- Authentification des appels entrants ---
    # Vérification des jetons de service émis par l'API. La clé publique
    # suffit : la clé privée ne quitte jamais l'API. Deux formes selon
    # l'environnement, comme le fait déjà l'API pour la même paire — un
    # fichier monté en développement, une variable en production.
    jwt_issuer: str = "https://smartex-sustway.local"
    jwt_public_key_path: str = ""
    jwt_public_key: str = ""

    # --- Import de référentiel ---
    # Ces trois valeurs gouvernent le découpage d'un document avant envoi au
    # modèle. Elles sont configurables parce qu'aucune n'est établie : elles
    # devront être calibrées sur des documents réels, et les valeurs ci-dessous
    # sont un point de départ prudent, pas une décision.
    #
    # La seule contrainte mesurée est le plafond du fournisseur, 15 requêtes
    # par minute sur l'offre gratuite — c'est lui qui interdit un appel par
    # critère et impose de regrouper.
    import_taille_lot_caracteres: int = 20000
    import_lots_maximum: int = 12
    import_delai_entre_lots_ms: int = 4500

    model_config = SettingsConfigDict(env_prefix="SMARTEX_", env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
