"""
Orchestration du pipeline V2 — le chaînage, et rien d'autre.

Les quatre agents V2 existent, sont figés et sont éprouvés contre le vrai
Gemini. Ce qui manquait n'était pas leur qualité mais le fil qui les relie :
la route V2 validait le contrat et rendait `agents_executes=[]`.

Ce module est ce fil. Sa responsabilité s'arrête à quatre gestes : préparer
l'entrée de chaque agent, l'appeler, passer sa sortie au suivant, agréger.

**Ce qu'il ne fait pas**, et cette liste est le cœur de sa conception :

  - aucun accès à PostgreSQL, à MinIO, à quoi que ce soit de persistant ;
  - aucune création d'évaluation, de non-conformité ou d'axe ;
  - aucune validation humaine ;
  - aucun calcul de score.

Il rend un résultat ; Java décide de ce qu'il en fait. Cette séparation
n'est pas une élégance : elle est ce qui garantit qu'un service qui parle à
un modèle de langage ne puisse jamais écrire dans la base métier.

**Le contenu brut ne circule pas.** Chaque pièce est lue une fois, par le
Document Agent, à qui elle est destinée. Les agents suivants ne reçoivent
que des `AnalyseDocumentV2` — des constats, jamais des octets.

**Dégradation.** Document et Evidence sont bloquants : sans eux il n'y a
pas de résultat de conformité, donc rien à rendre. Risk et Recommendation
sont facultatifs — leur échec est classé, tracé, et laisse le résultat
Evidence intact. Aucun échec n'est converti en succès.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.agents import (
    document_agent_v2,
    evidence_compliance_agent_v2 as evidence,
    recommendation_agent_v2 as recommendation,
    risk_agent_v2 as risk,
)
from app.agents.document_agent_v2 import DocumentAgentRequestV2, attentes_depuis
from app.agents.evidence_compliance_agent_v2 import EvidenceComplianceRequestV2
from app.agents.recommendation_agent_v2 import RecommendationAgentRequestV2
from app.agents.risk_agent_v2 import RiskAgentRequestV2, catalogue_risque_depuis
from app.config import get_settings
from app.models.contrat_v2 import (
    AnalyseDocumentV2,
    EvaluerCritereRequestV2,
    ResultatEvidenceV2,
    ResultatRecommandationV2,
    ResultatRisqueV2,
)
from app.services.appel_gemini import (
    CONTRAT_EXECUTION_VERSION,
    PROVIDER,
    AppelTrace,
    ErreurAppel,
    StatutAppel,
    classer_erreur,
    fermer_collecte,
    ouvrir_collecte,
    traces_collectees,
)
from app.services.assainissement import assainir, type_exception

logger = logging.getLogger(__name__)


class EchecAgentBloquant(RuntimeError):
    """
    Un agent sans lequel il n'y a pas de résultat a échoué.

    Porte la catégorie d'erreur et un message déjà assaini : l'appelant
    peut construire sa réponse HTTP sans jamais toucher à l'exception
    d'origine.
    """

    def __init__(self, agent: str, categorie: str, message: str):
        super().__init__(f"{agent} : {categorie}")
        self.agent = agent
        self.categorie = categorie
        self.message_assaini = message


class ResultatV2(BaseModel):
    """
    Le bloc métier de l'enveloppe.

    Assemblé à partir des sorties d'agents, sans transformation : ce module
    n'a pas à réinterpréter ce qu'un agent a conclu.
    """

    model_config = ConfigDict(extra="forbid")

    contrat_version: str
    audit_critere_id: str
    analyses_documents: list[AnalyseDocumentV2] = Field(default_factory=list)
    evidence: ResultatEvidenceV2
    risque: ResultatRisqueV2 | None = None
    recommandation: ResultatRecommandationV2 | None = None


class ExecutionV2(BaseModel):
    """
    Le bloc technique de l'enveloppe.

    Que des identifiants, des mesures et des catégories. Aucun champ de ce
    bloc ne peut porter de donnée client — c'est vérifié par un test qui
    énumère les clés plutôt que de faire confiance à la discipline.
    """

    model_config = ConfigDict(extra="forbid")

    contrat_execution_version: str = CONTRAT_EXECUTION_VERSION
    provider: str = PROVIDER
    requested_model: str
    statut: str
    agents_executes: list[str] = Field(default_factory=list)
    started_at: datetime
    finished_at: datetime
    duration_ms: int
    appels: list[AppelTrace] = Field(default_factory=list)
    erreurs: list[ErreurAppel] = Field(default_factory=list)


class EnveloppeV2(BaseModel):
    """
    `{resultat, execution}` — deux blocs qui ne se mélangent jamais.

    Le premier dit ce que l'IA a conclu, le second ce qui s'est passé pour
    l'obtenir. Les fondre reviendrait à ce qu'un `response_id` voisine une
    probabilité de conformité dans la même structure, et à ce que la purge
    de l'un emporte l'autre.
    """

    model_config = ConfigDict(extra="forbid")

    resultat: ResultatV2
    execution: ExecutionV2


def _trace_de(exc: BaseException, agent: str, piece_reference: str | None,
              requested_model: str, debut_mur: datetime, debut_mono: float) -> AppelTrace:
    """
    Trace d'un échec survenu hors de l'enrobage.

    L'enrobage attache déjà une trace aux exceptions qu'il relance
    (`trace_appel`). Mais un agent peut échouer avant l'appel — décodage
    impossible, configuration absente — ou après, sur la validation de la
    réponse. Cette fonction couvre ces cas afin qu'aucun échec ne soit
    silencieux dans la trace.
    """
    attachee = getattr(exc, "trace_appel", None)
    if isinstance(attachee, AppelTrace):
        return attachee

    return AppelTrace(
        agent=agent,
        piece_reference=piece_reference,
        statut=StatutAppel.ERREUR,
        requested_model=requested_model,
        started_at=debut_mur,
        finished_at=datetime.now(timezone.utc),
        duration_ms=int((time.monotonic() - debut_mono) * 1000),
        error=ErreurAppel(
            type=classer_erreur(exc),
            message=assainir(f"{type_exception(exc)}: {exc}"),
        ),
    )


async def executer(payload: EvaluerCritereRequestV2) -> EnveloppeV2:
    """
    Exécute la chaîne complète et rend l'enveloppe.

    L'ordre n'est pas arbitraire : Evidence a besoin des analyses
    documentaires, Risk du résultat d'Evidence, Recommendation des deux.
    Chaque agent reçoit exactement ce que son contrat prévoit — ni plus, ce
    qui exposerait des données sans raison, ni moins, ce qui l'appauvrirait.
    """
    ouvrir_collecte()
    try:
        return await _executer(payload)
    finally:
        # Refermée quoi qu'il arrive : une collecte laissée ouverte
        # capterait les traces de la requête suivante servie par la même
        # tâche.
        fermer_collecte()


async def _executer(payload: EvaluerCritereRequestV2) -> EnveloppeV2:
    settings = get_settings()
    requested_model = settings.gemini_model

    started_at = datetime.now(timezone.utc)
    debut = time.monotonic()

    appels: list[AppelTrace] = []
    erreurs: list[ErreurAppel] = []
    agents_executes: list[str] = []

    catalogue = payload.catalogue
    critere = payload.critere
    options = payload.options

    def cloturer(statut: str) -> ExecutionV2:
        return ExecutionV2(
            requested_model=requested_model,
            statut=statut,
            agents_executes=agents_executes,
            started_at=started_at,
            finished_at=datetime.now(timezone.utc),
            duration_ms=int((time.monotonic() - debut) * 1000),
            appels=appels,
            erreurs=erreurs,
        )

    # --- 1. Document Agent, une passe par pièce -------------------------
    #
    # Bloquant. Une pièce illisible ne fait pas échouer la passe — le
    # Document Agent rend lui-même une analyse `NON_VERIFIABLE`, qui est
    # une information et non une panne. En revanche un échec du fournisseur
    # arrête tout : conclure sur des pièces qu'on n'a pas pu soumettre
    # reviendrait à juger sans avoir regardé.
    attentes = attentes_depuis(catalogue)
    analyses: list[AnalyseDocumentV2] = []

    for piece in payload.pieces:
        debut_appel = datetime.now(timezone.utc)
        debut_mono = time.monotonic()
        try:
            analyse = await document_agent_v2.analyser(DocumentAgentRequestV2(
                piece=piece,
                critere=critere,
                attentes=attentes,
            ))
        except Exception as exc:
            trace = _trace_de(exc, "DOCUMENT", piece.reference, requested_model,
                              debut_appel, debut_mono)
            appels.append(trace)
            categorie = trace.error.type.value if trace.error else "INTERNE"
            message = trace.error.message if trace.error else ""
            logger.error("Orchestration V2 : échec bloquant du Document Agent sur %s (%s)",
                         piece.reference, categorie)
            raise EchecAgentBloquant("DOCUMENT", categorie, message) from exc

        analyses.append(analyse)
        appels.append(_derniere_trace_ou_reconstruite(
            "DOCUMENT", piece.reference, requested_model, debut_appel, debut_mono))

    if payload.pieces:
        agents_executes.append("DOCUMENT")

    # --- 2. Evidence / Compliance ---------------------------------------
    #
    # Bloquant : sans lui il n'y a pas de résultat de conformité, donc rien
    # à rendre. Il reçoit les analyses documentaires — des constats — et
    # jamais le contenu des pièces.
    debut_appel = datetime.now(timezone.utc)
    debut_mono = time.monotonic()
    try:
        resultat_evidence = await evidence.evaluer(EvidenceComplianceRequestV2(
            critere=critere,
            situation=payload.situation,
            catalogue=catalogue,
            declaration=payload.declaration,
            analyses_documents=analyses,
        ))
    except Exception as exc:
        trace = _trace_de(exc, "EVIDENCE", None, requested_model, debut_appel, debut_mono)
        appels.append(trace)
        categorie = trace.error.type.value if trace.error else "INTERNE"
        message = trace.error.message if trace.error else ""
        logger.error("Orchestration V2 : échec bloquant de l'agent Evidence (%s)", categorie)
        raise EchecAgentBloquant("EVIDENCE", categorie, message) from exc

    appels.append(_derniere_trace_ou_reconstruite(
        "EVIDENCE", None, requested_model, debut_appel, debut_mono))
    agents_executes.append("EVIDENCE")

    # --- 3. Risk, facultatif --------------------------------------------
    #
    # Son catalogue est volontairement amputé de ses exigences : le Risk
    # Agent n'a pas à connaître le détail des exigences pour signaler une
    # anomalie, et ne pas les lui transmettre est le geste le plus simple
    # pour qu'il ne puisse pas s'en servir.
    resultat_risque: ResultatRisqueV2 | None = None
    if options.analyse_risque:
        debut_appel = datetime.now(timezone.utc)
        debut_mono = time.monotonic()
        try:
            resultat_risque = await risk.evaluer(RiskAgentRequestV2(
                critere=critere,
                situation=payload.situation,
                organisation=payload.organisation,
                catalogue=catalogue_risque_depuis(catalogue),
                declaration=payload.declaration,
                resultat_evidence=resultat_evidence,
            ))
            appels.append(_derniere_trace_ou_reconstruite(
                "RISK", None, requested_model, debut_appel, debut_mono))
            agents_executes.append("RISK")
        except Exception as exc:
            # Facultatif : on conserve le résultat Evidence, on classe
            # l'échec, et on ne prétend pas que la passe est complète.
            trace = _trace_de(exc, "RISK", None, requested_model, debut_appel, debut_mono)
            appels.append(trace)
            if trace.error:
                erreurs.append(trace.error)
            logger.warning("Orchestration V2 : Risk Agent en échec, résultat Evidence conservé (%s)",
                           trace.error.type.value if trace.error else "INTERNE")

    # --- 4. Recommendation, facultatif ----------------------------------
    resultat_recommandation: ResultatRecommandationV2 | None = None
    if options.generer_recommandation:
        debut_appel = datetime.now(timezone.utc)
        debut_mono = time.monotonic()
        try:
            resultat_recommandation = await recommendation.recommander(
                RecommendationAgentRequestV2(
                    critere=critere,
                    situation=payload.situation,
                    organisation=payload.organisation,
                    catalogue=catalogue,
                    declaration=payload.declaration,
                    analyses_documents=analyses,
                    resultat_evidence=resultat_evidence,
                    resultat_risque=resultat_risque,
                ))
            appels.append(_derniere_trace_ou_reconstruite(
                "RECOMMENDATION", None, requested_model, debut_appel, debut_mono))
            agents_executes.append("RECOMMENDATION")
        except Exception as exc:
            trace = _trace_de(exc, "RECOMMENDATION", None, requested_model,
                              debut_appel, debut_mono)
            appels.append(trace)
            if trace.error:
                erreurs.append(trace.error)
            logger.warning("Orchestration V2 : Recommendation Agent en échec (%s)",
                           trace.error.type.value if trace.error else "INTERNE")

    # `PARTIEL` et non `TERMINE` quand un agent facultatif a échoué : la
    # passe a produit un résultat exploitable, mais elle n'a pas fait tout
    # ce qui lui était demandé, et Java doit pouvoir le voir.
    statut = "PARTIEL" if erreurs else "TERMINE"

    resultat = ResultatV2(
        contrat_version=payload.contrat_version,
        audit_critere_id=str(payload.tracabilite.audit_critere_id),
        analyses_documents=analyses,
        evidence=resultat_evidence,
        risque=resultat_risque,
        recommandation=resultat_recommandation,
    )

    execution = cloturer(statut)
    logger.info(
        "Orchestration V2 terminée : critère %s, agents %s, statut %s, %d appel(s), %d ms",
        critere.code, agents_executes, statut, len(execution.appels), execution.duration_ms,
    )
    return EnveloppeV2(resultat=resultat, execution=execution)


def _derniere_trace_ou_reconstruite(agent: str, piece_reference: str | None,
                                    requested_model: str, debut_mur: datetime,
                                    debut_mono: float) -> AppelTrace:
    """
    Relève la trace réelle du dernier appel, ou en reconstruit une mesurée.

    La trace réelle porte `served_model`, `response_id` et les jetons — ce
    qu'aucune reconstruction ne peut inventer. Quand elle est disponible,
    c'est elle qui est retenue ; sinon on rend une trace honnête, mesurée
    côté orchestrateur, dont les champs fournisseur restent nuls plutôt que
    fabriqués.
    """
    collectees = traces_collectees()
    if collectees:
        return collectees.pop()

    return AppelTrace(
        agent=agent,
        piece_reference=piece_reference,
        statut=StatutAppel.TERMINE,
        requested_model=requested_model,
        started_at=debut_mur,
        finished_at=datetime.now(timezone.utc),
        duration_ms=int((time.monotonic() - debut_mono) * 1000),
    )
