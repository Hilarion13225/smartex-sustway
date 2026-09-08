package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.EvaluationDocumentAnalyseRepository;
import com.smartexsustway.api.domain.repository.EvaluationRepository;
import com.smartexsustway.api.mission.AnalyseCritereService;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.EvaluationDto;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.UUID;

/**
 * RG21/RG27 - evaluation IA d'un critere : orchestre le pipeline d'agents
 * Python (Document/Evidence/Compliance, voir services-ia-python) puis
 * convertit la probabilite renvoyee en niveau d'engagement via ScoringEngine
 * (deja teste, phase B) - jamais l'inverse : l'IA ne produit jamais de note
 * directement (RG27). L'évaluation est validée immédiatement (RG16) — la
 * revue experte (supervision humaine des évaluations à faible confiance) a
 * été retirée du produit.
 */
@Path("/api/v1/entreprises/{entrepriseId}/audits/{auditId}/criteres/{auditCritereId}/evaluations")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class EvaluationResource {

    @Inject AuditRepository auditRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject EvaluationRepository evaluationRepository;
    @Inject EvaluationDocumentAnalyseRepository documentAnalyseRepository;
    @Inject AnalyseCritereService analyseCritereService;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @GET
    public Response lister(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId,
                            @PathParam("auditCritereId") UUID auditCritereId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);
        trouverAuditCritereDeLaMission(entrepriseId, auditId, auditCritereId);

        var evaluations = evaluationRepository.parAuditCritere(auditCritereId).stream()
                .map(e -> EvaluationDto.depuis(e, documentAnalyseRepository.parEvaluation(e.getId())))
                .toList();
        return Response.ok(evaluations).build();
    }

    @POST
    @Transactional
    public Response evaluer(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId,
                             @PathParam("auditCritereId") UUID auditCritereId) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);

        Audit audit = trouverAudit(entrepriseId, auditId);
        // Même permission que le dépôt de preuve/questionnaire (ReponseQuestionResource) :
        // lancer l'évaluation est la suite naturelle de la collecte, pas une action distincte.
        String formuleCode = audit.getFormuleAbonnement() == null ? null : audit.getFormuleAbonnement().getCode();
        autorisationService.exigerPermission(utilisateurId, entrepriseId, formuleCode, "preuve:deposer");
        AuditCritere auditCritere = trouverAuditCritereDeLaMission(entrepriseId, auditId, auditCritereId);

        var resultat = analyseCritereService.analyser(audit, auditCritere);
        if (resultat instanceof AnalyseCritereService.Resultat.RienAAnalyser) {
            return erreur(400, "Aucune preuve, réponse au questionnaire ni scénario sur ce critère "
                    + "— impossible de lancer l'analyse IA");
        }
        if (resultat instanceof AnalyseCritereService.Resultat.Echec echec) {
            return erreur(503, echec.message());
        }
        Evaluation evaluation = ((AnalyseCritereService.Resultat.Analyse) resultat).evaluation();

        auditLogService.journaliser(utilisateurId, entrepriseId, "EVALUATION_IA_CREEE", "evaluation", evaluation.getId());

        return Response.status(Response.Status.CREATED)
                .entity(EvaluationDto.depuis(evaluation, documentAnalyseRepository.parEvaluation(evaluation.getId())))
                .build();
    }

    private Audit trouverAudit(UUID entrepriseId, UUID auditId) {
        Audit audit = auditRepository.findById(auditId);
        if (audit == null || !audit.getEntreprise().getId().equals(entrepriseId)) {
            throw new NotFoundException("Audit introuvable pour cette entreprise");
        }
        return audit;
    }

    private AuditCritere trouverAuditCritereDeLaMission(UUID entrepriseId, UUID auditId, UUID auditCritereId) {
        trouverAudit(entrepriseId, auditId);
        AuditCritere auditCritere = auditCritereRepository.findById(auditCritereId);
        if (auditCritere == null || !auditCritere.getAudit().getId().equals(auditId)) {
            throw new NotFoundException("Critère introuvable pour cette mission");
        }
        return auditCritere;
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}
