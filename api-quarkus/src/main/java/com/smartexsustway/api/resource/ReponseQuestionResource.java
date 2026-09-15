package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.AuditQuestion;
import com.smartexsustway.api.domain.entity.ReponseQuestion;
import com.smartexsustway.api.domain.enums.ValeurReponse;
import com.smartexsustway.api.mission.AnalyseCritereService;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.AuditQuestionRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.ReponseQuestionRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.dto.EnregistrerReponsesRequestDto;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.QuestionMissionDto;
import com.smartexsustway.api.resource.dto.SaisieCritereDto;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * RG09 — collecte déclarative d'un critère de mission : réponses aux
 * questions/indicateurs du questionnaire figé à la création de l'audit, et
 * scénario textuel décrivant la situation réelle de l'entreprise. Ces
 * éléments complètent les preuves documentaires et sont transmis au
 * pipeline d'agents IA au moment de l'évaluation (voir EvaluationResource).
 */
@Path("/api/v1/entreprises/{entrepriseId}/audits/{auditId}/criteres/{auditCritereId}/questions")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class ReponseQuestionResource {

    private static final String STATUT_REPONDU = "REPONDU";
    private static final String STATUT_A_REPONDRE = "A_REPONDRE";
    /** Statuts d'AuditCritere (voir EvaluationResource) : la déclaration précède l'analyse. */
    private static final String STATUT_A_EVALUER = "A_EVALUER";
    /**
     * Repris d'AnalyseCritereService plutôt que redéclaré : la clôture refuse
     * de figer une mission tant qu'un critère porte ce statut, et deux copies
     * de la chaîne finiraient par diverger.
     */
    private static final String STATUT_DECLARE = AnalyseCritereService.STATUT_DECLARE;

    @Inject AuditRepository auditRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject AuditQuestionRepository auditQuestionRepository;
    @Inject ReponseQuestionRepository reponseQuestionRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @GET
    public Response lister(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId,
                            @PathParam("auditCritereId") UUID auditCritereId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);
        AuditCritere auditCritere = trouverAuditCritereDeLaMission(entrepriseId, auditId, auditCritereId);

        return Response.ok(new SaisieCritereDto(auditCritere.getScenario(), questions(auditCritereId))).build();
    }

    @PUT
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response enregistrer(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId,
                                 @PathParam("auditCritereId") UUID auditCritereId,
                                 EnregistrerReponsesRequestDto requete) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        AuditCritere auditCritere = trouverAuditCritereVerrouille(entrepriseId, auditId, auditCritereId);
        // RG09 : renseigner le questionnaire déclaratif est une forme de
        // dépôt de preuve (complète les documents) — même permission.
        String formuleCode = auditCritere.getAudit().getFormuleAbonnement() == null
                ? null : auditCritere.getAudit().getFormuleAbonnement().getCode();
        autorisationService.exigerPermission(utilisateurId, entrepriseId, formuleCode, "preuve:deposer");

        // RG35 : un critère exclu n'est plus saisissable. Ses réponses
        // antérieures restent lisibles (GET) et ne sont pas effacées.
        if (!auditCritere.isActif() || !auditCritere.isApplicable()) {
            return Response.status(409)
                    .entity(new ErreurDto(AnalyseCritereService.messageHorsPerimetre(auditCritere)))
                    .build();
        }

        if (requete == null) {
            throw new BadRequestException("Corps de requête manquant");
        }

        // RG35 : NON_APPLICABLE ne rend pas le critère non applicable — il en
        // ferait un critère déclaré, donc soumis à l'IA et noté. Cette décision
        // passe par l'exclusion (AuditResource.definirPerimetreCritere),
        // réservée au personnel interne Smartex. La valeur reste dans
        // l'énumération et en base pour les réponses historiques ; elle
        // n'est simplement plus acceptée à la saisie. Contrôlé avant toute
        // écriture : la requête est refusée en entier.
        if (requete.reponses() != null && requete.reponses().stream()
                .anyMatch(saisie -> saisie != null && saisie.valeur() == ValeurReponse.NON_APPLICABLE)) {
            throw new BadRequestException("La réponse NON_APPLICABLE n'est plus acceptée à la saisie : "
                    + "l'exclusion d'un critère est une décision du personnel interne Smartex");
        }

        auditCritere.setScenario(normaliser(requete.scenario()));

        boolean auMoinsUneReponse = false;
        Map<UUID, AuditQuestion> questionsDeLaMission = new HashMap<>();
        auditQuestionRepository.parAuditCritere(auditCritereId)
                .forEach(aq -> questionsDeLaMission.put(aq.getId(), aq));

        for (var saisie : requete.reponses() == null ? List.<EnregistrerReponsesRequestDto.ReponseSaisieDto>of() : requete.reponses()) {
            AuditQuestion auditQuestion = questionsDeLaMission.get(saisie.auditQuestionId());
            if (auditQuestion == null) {
                throw new BadRequestException("Question " + saisie.auditQuestionId() + " absente du questionnaire de ce critère");
            }

            String commentaire = normaliser(saisie.commentaire());
            ReponseQuestion reponse = reponseQuestionRepository.parAuditQuestion(auditQuestion.getId())
                    .orElseGet(() -> {
                        ReponseQuestion nouvelle = new ReponseQuestion(auditQuestion);
                        reponseQuestionRepository.persist(nouvelle);
                        return nouvelle;
                    });
            reponse.setValeur(saisie.valeur());
            reponse.setNiveau(saisie.niveau() == null ? null : saisie.niveau().shortValue());
            reponse.setCommentaire(commentaire);
            reponse.setAuteur(utilisateurRepository.findById(utilisateurId));

            boolean renseignee = saisie.niveau() != null || saisie.valeur() != null || commentaire != null;
            auditQuestion.setStatut(renseignee ? STATUT_REPONDU : STATUT_A_REPONDRE);
            auMoinsUneReponse |= renseignee;
        }

        // Une réponse au questionnaire est une déclaration au même titre qu'un
        // niveau de maturité : sans ce report, un critère factuel répondu par
        // oui ou non resterait « à renseigner » à l'écran et ne serait pas
        // compté dans l'avancement de la collecte.
        if (auMoinsUneReponse && STATUT_A_EVALUER.equals(auditCritere.getStatut())) {
            auditCritere.setStatut(STATUT_DECLARE);
        }

        auditLogService.journaliser(utilisateurId, entrepriseId, "REPONSES_CRITERE_ENREGISTREES", "audit_critere", auditCritereId);

        // flush implicite en fin de transaction : la lecture ci-dessous
        // passe par les entités déjà chargées dans le contexte de
        // persistance, donc reflète bien la saisie qui vient d'être faite.
        return Response.ok(new SaisieCritereDto(auditCritere.getScenario(), questions(auditCritereId))).build();
    }

    private List<QuestionMissionDto> questions(UUID auditCritereId) {
        Map<UUID, ReponseQuestion> reponses = new HashMap<>();
        reponseQuestionRepository.parAuditCritere(auditCritereId)
                .forEach(r -> reponses.put(r.getAuditQuestion().getId(), r));

        return auditQuestionRepository.parAuditCritere(auditCritereId).stream()
                .sorted(Comparator.comparingInt(aq -> aq.getQuestion().getOrdre()))
                .map(aq -> QuestionMissionDto.depuis(aq, reponses.get(aq.getId())))
                .toList();
    }

    private static String normaliser(String valeur) {
        if (valeur == null) {
            return null;
        }
        String nettoye = valeur.trim();
        return nettoye.isEmpty() ? null : nettoye;
    }

    /**
     * RG35-HARDENING : le critère d'une saisie, lu sous verrou.
     *
     * <p>La saisie réécrit la ligne AUDIT_CRITERE (scénario, statut), et
     * Hibernate émet l'UPDATE complet : une copie lue avant une exclusion
     * concurrente rétablirait ses drapeaux. Verrouillée dès la lecture, la
     * ligne est celle de la base — la saisie attend la fin d'une exclusion en
     * cours, puis la voit et est refusée. La transaction reste courte : aucun
     * appel externe n'y a lieu.
     */
    private AuditCritere trouverAuditCritereVerrouille(UUID entrepriseId, UUID auditId, UUID auditCritereId) {
        Audit audit = auditRepository.findById(auditId);
        if (audit == null || !audit.getEntreprise().getId().equals(entrepriseId)) {
            throw new NotFoundException("Audit introuvable pour cette entreprise");
        }
        return auditCritereRepository.verrouiller(auditCritereId)
                .filter(ac -> ac.getAudit().getId().equals(auditId))
                .orElseThrow(() -> new NotFoundException("Critère introuvable pour cette mission"));
    }

    private AuditCritere trouverAuditCritereDeLaMission(UUID entrepriseId, UUID auditId, UUID auditCritereId) {
        Audit audit = auditRepository.findById(auditId);
        if (audit == null || !audit.getEntreprise().getId().equals(entrepriseId)) {
            throw new NotFoundException("Audit introuvable pour cette entreprise");
        }
        AuditCritere auditCritere = auditCritereRepository.findById(auditCritereId);
        if (auditCritere == null || !auditCritere.getAudit().getId().equals(auditId)) {
            throw new NotFoundException("Critère introuvable pour cette mission");
        }
        return auditCritere;
    }
}
