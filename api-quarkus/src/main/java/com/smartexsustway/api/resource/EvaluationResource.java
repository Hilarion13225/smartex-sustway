package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Document;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.entity.Preuve;
import com.smartexsustway.api.domain.entity.RevueExperte;
import com.smartexsustway.api.domain.enums.SourceEvaluation;
import com.smartexsustway.api.domain.enums.StatutEvaluation;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.EvaluationRepository;
import com.smartexsustway.api.domain.repository.PreuveRepository;
import com.smartexsustway.api.domain.repository.RevueExperteRepository;
import com.smartexsustway.api.domain.rules.ScoringEngine;
import com.smartexsustway.api.ia.EvaluerCritereRequestDto;
import com.smartexsustway.api.ia.EvaluerCritereResponseDto;
import com.smartexsustway.api.ia.IaEvaluationClient;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.EvaluationDto;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.stockage.StorageService;
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
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

/**
 * RG21/RG22/RG27/RG38 - evaluation IA d'un critere : orchestre le pipeline
 * d'agents Python (Document/Evidence/Compliance, voir services-ia-python)
 * puis convertit la probabilite renvoyee en niveau d'engagement via
 * ScoringEngine (deja teste, phase B) - jamais l'inverse : l'IA ne produit
 * jamais de note directement (RG27).
 *
 * RG22/RG38 : si la confiance IA est sous le seuil (0,80 par defaut) et
 * que la formule souscrite est Avancees, une RevueExperte est creee
 * automatiquement (file d'attente - le traitement de la revue elle-meme,
 * par un expert, est un lot ulterieur : ce lot ne fait que l'alimenter).
 */
@Path("/api/v1/entreprises/{entrepriseId}/audits/{auditId}/criteres/{auditCritereId}/evaluations")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class EvaluationResource {

    private static final Logger LOG = Logger.getLogger(EvaluationResource.class);
    private static final String FORMULE_AVANCEES = "AVANCEES";

    @Inject AuditRepository auditRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject PreuveRepository preuveRepository;
    @Inject EvaluationRepository evaluationRepository;
    @Inject RevueExperteRepository revueExperteRepository;
    @Inject StorageService storageService;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @Inject
    @RestClient
    IaEvaluationClient iaEvaluationClient;

    @ConfigProperty(name = "smartex.evaluation.seuil-confiance-revue-experte", defaultValue = "0.80")
    BigDecimal seuilConfianceRevueExperte;

    @GET
    public Response lister(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId,
                            @PathParam("auditCritereId") UUID auditCritereId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);
        trouverAuditCritereDeLaMission(entrepriseId, auditId, auditCritereId);

        var evaluations = evaluationRepository.parAuditCritere(auditCritereId).stream()
                .map(e -> EvaluationDto.depuis(e, e.getStatut() == StatutEvaluation.EN_REVUE))
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
        AuditCritere auditCritere = trouverAuditCritereDeLaMission(entrepriseId, auditId, auditCritereId);

        List<Preuve> preuves = preuveRepository.parAuditCritere(auditCritereId);
        if (preuves.isEmpty()) {
            return erreur(400, "Aucune preuve associée à ce critère — impossible de lancer l'évaluation IA");
        }

        List<EvaluerCritereRequestDto.DocumentPourEvaluationDto> documents = new ArrayList<>();
        for (Preuve preuve : preuves) {
            Document document = preuve.getDocument();
            byte[] contenu;
            try {
                contenu = storageService.telecharger(document.getCheminStockage());
            } catch (Exception e) {
                LOG.warnf(e, "Lecture du document %s impossible pour l'évaluation IA", document.getId());
                return erreur(503, "Impossible de lire le document '" + document.getNomOriginal() + "' depuis le stockage");
            }
            String contenuBase64 = Base64.getEncoder().encodeToString(contenu);
            documents.add(new EvaluerCritereRequestDto.DocumentPourEvaluationDto(
                    document.getNomOriginal(), document.getTypeMime(), contenuBase64));
        }

        EvaluerCritereRequestDto requete = new EvaluerCritereRequestDto(
                auditCritereId,
                auditCritere.getCritere().getCode(),
                auditCritere.getCritere().getLibelle(),
                auditCritere.getCritere().getDescription(),
                documents
        );

        EvaluerCritereResponseDto reponse;
        try {
            reponse = iaEvaluationClient.evaluerCritere(requete);
        } catch (Exception e) {
            LOG.warnf(e, "Échec du pipeline d'agents IA pour le critère %s", auditCritere.getCritere().getCode());
            return erreur(503, "Échec du pipeline d'agents IA — réessayez plus tard");
        }

        BigDecimal probabilite = BigDecimal.valueOf(reponse.probabiliteConformite()).setScale(4, RoundingMode.HALF_UP);
        BigDecimal confiance = BigDecimal.valueOf(reponse.confianceIa()).setScale(4, RoundingMode.HALF_UP);

        // RG27 : conversion probabilité -> niveau d'engagement (1-5) exclusivement
        // via ScoringEngine — l'IA ne fournit jamais de note directement.
        int niveau = ScoringEngine.niveauEngagement(probabilite);

        Evaluation evaluation = new Evaluation(auditCritere, probabilite, (short) niveau);
        evaluation.setConfianceIa(confiance);
        evaluation.setJustification(reponse.justification());
        evaluation.setSource(SourceEvaluation.IA);
        evaluationRepository.persist(evaluation);

        boolean revueDeclenchee = declencherRevueExperteSiNecessaire(audit, evaluation, probabilite, (short) niveau, confiance);

        auditLogService.journaliser(utilisateurId, entrepriseId, "EVALUATION_IA_CREEE", "evaluation", evaluation.getId());

        return Response.status(Response.Status.CREATED).entity(EvaluationDto.depuis(evaluation, revueDeclenchee)).build();
    }

    /** RG22/RG38 : file de revue experte si confiance IA < seuil, formule Avancées uniquement. */
    private boolean declencherRevueExperteSiNecessaire(Audit audit, Evaluation evaluation, BigDecimal probabilite,
                                                         short niveau, BigDecimal confiance) {
        boolean formuleAvancees = audit.getFormuleAbonnement() != null
                && FORMULE_AVANCEES.equals(audit.getFormuleAbonnement().getCode());

        if (!formuleAvancees || confiance == null || confiance.compareTo(seuilConfianceRevueExperte) >= 0) {
            return false;
        }

        RevueExperte revue = new RevueExperte(evaluation, probabilite, niveau);
        revueExperteRepository.persist(revue);
        evaluation.setStatut(StatutEvaluation.EN_REVUE);
        return true;
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
