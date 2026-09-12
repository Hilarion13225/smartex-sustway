"""
Route V2 — acceptation et validation du contrat, sans exécution d'agents.

Cette route existe pour que Java puisse éprouver son payload avant que les
agents ne sachent le lire. Elle authentifie, valide, et rend ce qu'elle a
compris.

Ce qu'elle ne fait PAS, et volontairement : appeler Gemini, écrire quoi que ce
soit, déclencher le scoring, toucher à l'état d'une mission. La refonte des
quatre agents est une phase ultérieure ; les brancher ici avant que leur
contrat d'entrée ne soit figé reviendrait à les réécrire deux fois.

La route V1 — `/api/v1/evaluations/critere` — reste la voie de production et
n'est pas touchée.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from app.models.contrat_v2 import (
    EvaluerCritereRequestV2,
    VersionContratNonSupportee,
    verifier_version_supportee,
)
from app.services.authentification import exiger_appel_de_service
from app.services.orchestration_v2 import EchecAgentBloquant, EnveloppeV2, executer
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter()


class ResumeContexteV2(BaseModel):
    """
    Ce que le service a effectivement compris du payload.

    Des compteurs et des références, jamais du contenu : ni base64, ni texte de
    document, ni réponse au questionnaire. La réponse doit pouvoir être lue
    dans un journal ou collée dans un rapport sans exposer de donnée client.
    """

    critere_code: str
    exigences: list[str] = Field(default_factory=list)
    preuves_attendues: list[str] = Field(default_factory=list)
    regles_analyse: list[str] = Field(default_factory=list)
    portees: dict[str, int] = Field(default_factory=dict)
    pieces: int = 0
    reponses: int = 0
    scenario_present: bool = False
    secteur_present: bool = False
    situation_presente: bool = False


class ContratAccepteV2(BaseModel):
    """Réponse de la route de validation. `agents_executes` reste vide en phase 2."""

    contrat_version: str
    audit_critere_id: str
    accepte: bool
    resume_contexte: ResumeContexteV2
    agents_executes: list[str] = Field(default_factory=list)


@router.post("/critere", response_model=ContratAccepteV2)
async def valider_contexte_critere(
    payload: EvaluerCritereRequestV2,
    _appelant: str = Depends(exiger_appel_de_service),
) -> ContratAccepteV2:
    """
    Accepte un contexte V2, ou dit précisément pourquoi il le refuse.

    La validation structurelle est déjà faite par Pydantic au moment où ce
    corps s'exécute : formes de références, unicité, rattachements résolubles,
    au moins une source. Ne reste ici que le contrôle de version, qui ne peut
    pas vivre dans le modèle — refuser un majeur inconnu est une décision de
    service, pas une règle de forme.
    """
    try:
        verifier_version_supportee(payload.contrat_version)
    except VersionContratNonSupportee as exc:
        # 422 et non 400 : le payload est bien formé, c'est le contrat qu'il
        # annonce que ce service ne sait pas honorer. Refuser explicitement
        # plutôt que traiter en dégradé — un contexte appauvri en silence est
        # précisément ce que le versionnement existe pour empêcher.
        logger.warning("Contrat IA refusé : %s", exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    catalogue = payload.catalogue
    declaration = payload.declaration

    portees: dict[str, int] = {}
    for regle in catalogue.regles_analyse:
        portees[regle.portee.niveau] = portees.get(regle.portee.niveau, 0) + 1

    resume = ResumeContexteV2(
        critere_code=payload.critere.code,
        exigences=[e.code for e in catalogue.exigences],
        preuves_attendues=[p.reference for p in catalogue.preuves_attendues],
        regles_analyse=[r.code for r in catalogue.regles_analyse],
        portees=portees,
        pieces=len(payload.pieces),
        reponses=len(declaration.reponses) if declaration else 0,
        scenario_present=bool(declaration and declaration.scenario),
        secteur_present=bool(payload.organisation and payload.organisation.secteur),
        situation_presente=payload.situation is not None,
    )

    return ContratAccepteV2(
        contrat_version=payload.contrat_version,
        audit_critere_id=str(payload.tracabilite.audit_critere_id),
        accepte=True,
        resume_contexte=resume,
        # Cette route ne consomme pas le contrat, elle l'éprouve. Pour
        # l'exécuter réellement, voir `/critere/executer`.
        agents_executes=[],
    )


@router.post("/critere/executer", response_model=EnveloppeV2)
async def executer_critere(
    payload: EvaluerCritereRequestV2,
    _appelant: str = Depends(exiger_appel_de_service),
) -> EnveloppeV2:
    """
    Exécute réellement le pipeline V2 et rend `{resultat, execution}`.

    Route distincte de `/critere`, qui reste la validation contractuelle
    sans effet. Les deux coexistent parce qu'elles répondent à deux besoins
    différents : éprouver un payload sans consommer de quota, et produire
    un résultat.

    Ce service **n'écrit rien**. Il rend un résultat ; c'est Java qui
    décide d'en faire une évaluation, et sous quel statut.
    """
    try:
        verifier_version_supportee(payload.contrat_version)
    except VersionContratNonSupportee as exc:
        logger.warning("Contrat IA refusé : %s", exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    try:
        return await executer(payload)
    except EchecAgentBloquant as exc:
        # 503 : le service est momentanément incapable de produire un
        # résultat. Le détail porte l'agent et la catégorie — de quoi
        # décider d'un réessai — et jamais le message du fournisseur, qui
        # peut contenir une URL authentifiée ou un fragment de requête.
        logger.error("Orchestration V2 refusée : %s / %s — %s",
                     exc.agent, exc.categorie, exc.message_assaini)
        raise HTTPException(
            status_code=503,
            detail=f"Échec de l'agent {exc.agent} ({exc.categorie})",
        ) from exc
