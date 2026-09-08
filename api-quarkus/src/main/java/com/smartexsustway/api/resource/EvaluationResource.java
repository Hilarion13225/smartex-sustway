package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.entity.ReponseQuestion;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.AuditQuestionRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.EvaluationDocumentAnalyseRepository;
import com.smartexsustway.api.domain.repository.EvaluationRepository;
import com.smartexsustway.api.domain.repository.ReponseQuestionRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.mission.AnalyseCritereService;
import com.smartexsustway.api.resource.dto.DeclarationCritereDto;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.EvaluationDto;
import com.smartexsustway.api.resource.dto.EvaluationExperteRequestDto;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.time.OffsetDateTime;
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

    /**
     * Critère dont l'organisation a déclaré un niveau, en attente de l'analyse
     * IA qui, seule, lui donnera une note.
     */
    private static final String STATUT_DECLARE = "DECLARE";
    /** Reflète AuditQuestion.statut (voir ReponseQuestionResource). */
    private static final String STATUT_REPONDU = "REPONDU";

    @Inject AuditRepository auditRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject AuditQuestionRepository auditQuestionRepository;
    @Inject ReponseQuestionRepository reponseQuestionRepository;
    @Inject UtilisateurRepository utilisateurRepository;
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

    /**
     * Enregistre la déclaration de l'organisation sur un critère : le niveau
     * de maturité qu'elle estime atteint, sur l'échelle en cinq niveaux.
     *
     * Cette déclaration ne produit PAS de note. Seule l'analyse IA en produit
     * une, après confrontation de la déclaration aux preuves déposées : une
     * organisation qui s'attribue le niveau 5 sans document à l'appui ne doit
     * pas voir son score monter parce qu'elle l'a affirmé. Auparavant, la
     * déclaration créait une évaluation « experte » que le score retenait dès
     * qu'elle était la plus récente — elle annulait donc silencieusement une
     * rectification déjà rendue par l'IA.
     *
     * Le niveau est rangé dans le questionnaire (RG09), d'où le pipeline le
     * lit à l'analyse suivante.
     */
    @PUT
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response enregistrerDeclaration(@PathParam("entrepriseId") UUID entrepriseId,
                                           @PathParam("auditId") UUID auditId,
                                           @PathParam("auditCritereId") UUID auditCritereId,
                                           @Valid EvaluationExperteRequestDto requete) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);

        Audit audit = trouverAudit(entrepriseId, auditId);
        // Même permission que le dépôt de preuve et le questionnaire : déclarer
        // un niveau fait partie de la collecte, pas d'une action distincte.
        String formuleCode = audit.getFormuleAbonnement() == null ? null : audit.getFormuleAbonnement().getCode();
        autorisationService.exigerPermission(utilisateurId, entrepriseId, formuleCode, "preuve:deposer");
        AuditCritere auditCritere = trouverAuditCritereDeLaMission(entrepriseId, auditId, auditCritereId);

        reporterNiveauSurQuestionnaire(auditCritere, requete.niveau(), utilisateurId);

        // Un critère analysé puis redéclaré redevient « à analyser » : sa note
        // reste celle de la dernière analyse jusqu'à ce que l'IA repasse, à la
        // clôture de la mission.
        auditCritere.setStatut(STATUT_DECLARE);

        auditLogService.journaliser(utilisateurId, entrepriseId, "DECLARATION_ENREGISTREE", "audit_critere",
                auditCritere.getId());

        return Response.ok(new DeclarationCritereDto(
                auditCritere.getId(), requete.niveau(), auditCritere.getStatut(),
                OffsetDateTime.now())).build();
    }

    /**
     * Reporte le niveau saisi sur les questions du critère (RG09).
     *
     * Le questionnaire et la note portent désormais la même échelle : sans ce
     * report, le niveau choisi par l'auditeur resterait invisible du pipeline
     * d'agents, qui ne lit que les réponses déclarées — l'écran de saisie et
     * l'analyse IA travailleraient sur des données distinctes.
     *
     * Le commentaire de la réponse n'est pas touché : il appartient à la
     * saisie déclarative de l'entreprise, non à l'évaluation de l'auditeur.
     */
    private void reporterNiveauSurQuestionnaire(AuditCritere auditCritere, int niveau, UUID utilisateurId) {
        var auteur = utilisateurRepository.findById(utilisateurId);
        for (var auditQuestion : auditQuestionRepository.parAuditCritere(auditCritere.getId())) {
            ReponseQuestion reponse = reponseQuestionRepository.parAuditQuestion(auditQuestion.getId())
                    .orElseGet(() -> {
                        ReponseQuestion nouvelle = new ReponseQuestion(auditQuestion);
                        reponseQuestionRepository.persist(nouvelle);
                        return nouvelle;
                    });
            reponse.setNiveau((short) niveau);
            reponse.setAuteur(auteur);
            auditQuestion.setStatut(STATUT_REPONDU);
        }
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
