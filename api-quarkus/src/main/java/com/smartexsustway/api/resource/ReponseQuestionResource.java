package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.AuditQuestion;
import com.smartexsustway.api.domain.entity.ReponseQuestion;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.AuditQuestionRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.ReponseQuestionRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.dto.EnregistrerReponsesRequestDto;
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
        AuditCritere auditCritere = trouverAuditCritereDeLaMission(entrepriseId, auditId, auditCritereId);

        if (requete == null) {
            throw new BadRequestException("Corps de requête manquant");
        }

        auditCritere.setScenario(normaliser(requete.scenario()));

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
            reponse.setCommentaire(commentaire);
            reponse.setAuteur(utilisateurRepository.findById(utilisateurId));

            boolean renseignee = saisie.valeur() != null || commentaire != null;
            auditQuestion.setStatut(renseignee ? STATUT_REPONDU : STATUT_A_REPONDRE);
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
