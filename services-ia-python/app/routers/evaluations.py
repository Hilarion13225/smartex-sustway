"""
Orchestration Document -> Evidence -> Compliance pour un critere donne.

REST synchrone (decision actee, CDC section 13) : Quarkus fournit
directement le contenu des documents (base64) - ce service n'a pas besoin
d'acces direct a MinIO pour ce lot, Quarkus a deja lu les fichiers via son
propre StorageService.
"""

import base64
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from uuid import UUID

from app.agents import document_agent, evidence_compliance_agent
from app.services.gemini_client import GeminiNonConfigure

logger = logging.getLogger(__name__)

router = APIRouter()


class DocumentPourEvaluation(BaseModel):
    nom: str
    type_mime: str
    contenu_base64: str


class EvaluerCritereRequest(BaseModel):
    audit_critere_id: UUID
    critere_code: str
    critere_libelle: str
    critere_description: str | None = None
    documents: list[DocumentPourEvaluation] = Field(min_length=1)


class DocumentAnalyseDto(BaseModel):
    nom: str
    resume: str


class EvaluerCritereResponse(BaseModel):
    audit_critere_id: UUID
    probabilite_conformite: float
    confiance_ia: float
    couverture_preuve: bool
    justification: str
    documents_analyses: list[DocumentAnalyseDto]


@router.post("/critere", response_model=EvaluerCritereResponse)
async def evaluer_critere(payload: EvaluerCritereRequest) -> EvaluerCritereResponse:
    try:
        documents_analyses: list[DocumentAnalyseDto] = []
        for document in payload.documents:
            try:
                contenu = base64.b64decode(document.contenu_base64, validate=True)
            except Exception as exc:  # noqa: BLE001 - on veut un 422 propre, pas une 500 generique
                raise HTTPException(
                    status_code=422,
                    detail=f"Contenu base64 invalide pour le document '{document.nom}'",
                ) from exc

            resume = await document_agent.extraire(contenu, document.type_mime, document.nom)
            documents_analyses.append(DocumentAnalyseDto(nom=document.nom, resume=resume))

        resultat = await evidence_compliance_agent.evaluer(
            code=payload.critere_code,
            libelle=payload.critere_libelle,
            description=payload.critere_description,
            resumes=[d.resume for d in documents_analyses],
        )

        justification = f"{resultat.justification_couverture} {resultat.justification_conformite}".strip()

        return EvaluerCritereResponse(
            audit_critere_id=payload.audit_critere_id,
            probabilite_conformite=resultat.probabilite_conformite,
            confiance_ia=resultat.confiance,
            couverture_preuve=resultat.couverture_preuve,
            justification=justification,
            documents_analyses=documents_analyses,
        )

    except GeminiNonConfigure as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 - toute erreur Gemini (quota, reseau...) devient un 503 propre
        logger.exception("Echec de l'evaluation IA pour le critere %s", payload.critere_code)
        raise HTTPException(status_code=503, detail=f"Echec du pipeline d'agents IA : {exc}") from exc
