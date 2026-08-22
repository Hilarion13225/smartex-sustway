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
from app.routers import analyses, evaluations

settings = get_settings()

app = FastAPI(
    title="Smartex Sustway — Services IA",
    description="Pipeline d'agents IA (Document/Evidence/Compliance/Risk/Scoring/Recommendation/Reporting)",
    version="0.1.0",
)

app.include_router(analyses.router, prefix="/api/v1/analyses", tags=["analyses"])
app.include_router(evaluations.router, prefix="/api/v1/evaluations", tags=["évaluations"])


@app.get("/health", tags=["système"])
async def health():
    """Healthcheck utilisé par Docker Compose / CI."""
    return {"status": "ok", "service": "services-ia-python", "env": settings.env}
