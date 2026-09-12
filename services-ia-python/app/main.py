"""
Smartex Sustway — Services IA (FastAPI)
Point d'entrée du service Python exposant le pipeline d'agents IA
(Document, Evidence, Compliance, Risk, Scoring, Recommendation, Reporting).

Communication avec l'API Quarkus : REST/gRPC synchrone (décision actée, CDC §13).
Phase D/E du plan de projet — ce squelette (Phase A) expose seulement
un healthcheck et l'ossature des routes, sans logique IA encore branchée.
"""

from fastapi import FastAPI

from app.config import get_settings
from app.journalisation import configurer_journalisation
from app.routers import analyses, evaluations, evaluations_v2, imports_referentiel

# Avant toute autre chose : sans cet appel, le logger racine n'a aucun
# gestionnaire et l'intégralité de la journalisation applicative — échecs de
# pipeline compris — est jetée silencieusement par Python.
configurer_journalisation()

settings = get_settings()

app = FastAPI(
    title="SMARTEX SustWay — Services IA",
    description="Pipeline d'agents IA (Document/Evidence/Compliance/Risk/Scoring/Recommendation/Reporting)",
    version="0.1.0",
)

app.include_router(analyses.router, prefix="/api/v1/analyses", tags=["analyses"])
app.include_router(evaluations.router, prefix="/api/v1/evaluations", tags=["évaluations"])
# Contrat IA V2, monté en parallèle du V1 et non à sa place : les deux doivent
# coexister le temps que Java bascule, sans quoi aucun déploiement décalé ne
# serait possible. La route V2 valide le contexte ; elle n'exécute pas encore
# les agents.
app.include_router(
    evaluations_v2.router, prefix="/api/v2/evaluations", tags=["évaluations v2"]
)
# Import de référentiel : préfixe distinct de celui de l'analyse d'audit, les
# deux pipelines ne devant jamais se confondre.
app.include_router(
    imports_referentiel.router, prefix="/api/v1/referentiels/imports", tags=["imports"]
)


@app.get("/health", tags=["système"])
async def health():
    """Healthcheck utilisé par Docker Compose / CI."""
    return {"status": "ok", "service": "services-ia-python", "env": settings.env}
