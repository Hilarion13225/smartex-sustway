"""
Routes exposant le déclenchement et le suivi d'une analyse IA (ANALYSE_IA / EXECUTION_AGENT).

Squelette Phase A : les agents (Document/Evidence/Compliance/Risk/Scoring/
Recommendation/Reporting) seront implémentés en phases D et E. Ce routeur
fixe uniquement le contrat d'API entre Quarkus et les services Python.
"""

from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.services.authentification import exiger_appel_de_service

# Ces routes ne font encore rien — le pipeline arrive en phases D et E — mais
# elles sont protégées dès maintenant. Laisser une porte ouverte au motif que
# la pièce est vide revient à compter sur le fait que personne n'oubliera de
# la fermer le jour où on la meublera.
router = APIRouter(dependencies=[Depends(exiger_appel_de_service)])


class DeclencherAnalyseRequest(BaseModel):
    audit_id: UUID
    formule: str = Field(pattern="^(STANDARD|AVANCEES)$")


class AnalyseStatutResponse(BaseModel):
    analyse_id: UUID | None = None
    statut: str
    message: str


@router.post("", response_model=AnalyseStatutResponse, status_code=202)
async def declencher_analyse(payload: DeclencherAnalyseRequest):
    """
    Déclenche le pipeline d'agents IA pour un audit donné.
    RG21 : le pipeline exécuté dépend de la formule souscrite.
    Implémentation réelle (orchestrateur + agents) : phases D et E.
    """
    return AnalyseStatutResponse(
        statut="EN_ATTENTE",
        message=f"Pipeline '{payload.formule}' mis en file d'attente pour l'audit {payload.audit_id} "
                f"(orchestrateur à implémenter en phase D/E).",
    )


@router.get("/{analyse_id}", response_model=AnalyseStatutResponse)
async def statut_analyse(analyse_id: UUID):
    """Consultation du statut d'une analyse IA en cours."""
    return AnalyseStatutResponse(
        analyse_id=analyse_id,
        statut="INCONNU",
        message="Persistance des analyses non encore implémentée (phase D).",
    )
