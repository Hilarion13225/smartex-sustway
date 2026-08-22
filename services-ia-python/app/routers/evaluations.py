"""
Orchestration Document -> Evidence -> Compliance pour un critere donne.

REST synchrone (decision actee, CDC section 13) : Quarkus fournit
directement le contenu des documents (base64) - ce service n'a pas besoin
d'acces direct a MinIO pour ce lot, Quarkus a deja lu les fichiers via son
propre StorageService.
"""

import base64
import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, model_validator

from app.agents import (
    document_agent,
    evidence_compliance_agent,
    recommendation_agent,
    risk_agent,
)
from app.agents.evidence_compliance_agent import ReponseDeclaree
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
    # RG09 : la collecte declarative (scenario textuel + reponses au
    # questionnaire) complete les preuves documentaires. Un critere peut
    # donc etre evalue sans document si l'entreprise a decrit sa situation,
    # d'ou l'absence de min_length ici - Quarkus verifie qu'au moins une
    # des deux sources est renseignee avant d'appeler ce service.
    documents: list[DocumentPourEvaluation] = Field(default_factory=list)
    scenario: str | None = None
    reponses: list[ReponseDeclaree] = Field(default_factory=list)
    # RG21 : le pipeline dépend de la formule souscrite — Risk Agent et
    # Recommendation Agent ne sont exécutés que si Quarkus indique que
    # l'audit est en formule Avancées (Quarkus est seul responsable de
    # cette décision métier ; ce service ne connaît pas la notion de
    # formule d'abonnement). Champs distincts (plutôt qu'un flag unique)
    # pour permettre de les découpler plus tard sans changer le contrat.
    analyse_risque: bool = False
    generer_recommandation: bool = False

    @model_validator(mode="after")
    def _au_moins_une_source(self) -> "EvaluerCritereRequest":
        if not self.documents and not self.scenario and not self.reponses:
            raise ValueError(
                "Aucune source d'analyse : au moins un document, un scenario ou une reponse est requis"
            )
        return self


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
    # Renseignés uniquement si analyse_risque était vrai dans la requête.
    signal_risque: bool | None = None
    categorie_risque: str | None = None
    justification_risque: str | None = None
    # Renseignés uniquement si generer_recommandation était vrai dans la requête.
    recommandation_necessaire: bool | None = None
    pistes_amelioration: str | None = None


@router.post("/critere", response_model=EvaluerCritereResponse)
async def evaluer_critere(payload: EvaluerCritereRequest) -> EvaluerCritereResponse:
    try:
        documents_analyses: list[DocumentAnalyseDto] = []
        for document in payload.documents:
            try:
                contenu = base64.b64decode(document.contenu_base64, validate=True)
            except Exception as exc:  # on veut un 422 propre, pas une 500 generique
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
            scenario=payload.scenario,
            reponses=payload.reponses,
        )

        justification = f"{resultat.justification_couverture} {resultat.justification_conformite}".strip()

        signal_risque: bool | None = None
        categorie_risque: str | None = None
        justification_risque: str | None = None

        if payload.analyse_risque:
            resultat_risque = await risk_agent.evaluer(
                code=payload.critere_code,
                libelle=payload.critere_libelle,
                description=payload.critere_description,
                resumes=[d.resume for d in documents_analyses],
                probabilite_conformite=resultat.probabilite_conformite,
                confiance=resultat.confiance,
                justification_conformite=justification,
            )
            signal_risque = resultat_risque.signal_risque
            categorie_risque = resultat_risque.categorie
            justification_risque = resultat_risque.justification

        recommandation_necessaire: bool | None = None
        pistes_amelioration: str | None = None

        if payload.generer_recommandation:
            resultat_recommandation = await recommendation_agent.evaluer(
                code=payload.critere_code,
                libelle=payload.critere_libelle,
                description=payload.critere_description,
                resumes=[d.resume for d in documents_analyses],
                probabilite_conformite=resultat.probabilite_conformite,
                couverture_preuve=resultat.couverture_preuve,
                justification_conformite=justification,
            )
            recommandation_necessaire = resultat_recommandation.recommandation_necessaire
            pistes_amelioration = resultat_recommandation.pistes_amelioration

        return EvaluerCritereResponse(
            audit_critere_id=payload.audit_critere_id,
            probabilite_conformite=resultat.probabilite_conformite,
            confiance_ia=resultat.confiance,
            couverture_preuve=resultat.couverture_preuve,
            justification=justification,
            documents_analyses=documents_analyses,
            signal_risque=signal_risque,
            categorie_risque=categorie_risque,
            justification_risque=justification_risque,
            recommandation_necessaire=recommandation_necessaire,
            pistes_amelioration=pistes_amelioration,
        )

    except GeminiNonConfigure as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:  # toute erreur Gemini (quota, reseau...) devient un 503 propre
        logger.exception("Echec de l'evaluation IA pour le critere %s", payload.critere_code)
        raise HTTPException(status_code=503, detail=f"Echec du pipeline d'agents IA : {exc}") from exc
