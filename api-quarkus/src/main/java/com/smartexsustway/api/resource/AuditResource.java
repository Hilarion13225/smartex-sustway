package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Abonnement;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.AuditQuestion;
import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.Entreprise;
import com.smartexsustway.api.domain.entity.Question;
import com.smartexsustway.api.domain.entity.Referentiel;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.repository.AbonnementRepository;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.AuditQuestionRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.QuestionRepository;
import com.smartexsustway.api.domain.repository.ReferentielRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.referentiel.QuestionnaireService;
import com.smartexsustway.api.resource.dto.AuditCreateRequest;
import com.smartexsustway.api.resource.dto.AuditCritereDto;
import com.smartexsustway.api.resource.dto.AuditDto;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.UUID;

/**
 * RG10/RG11 : missions d'audit. RG20 : pas de lancement d'audit sans
 * abonnement actif de l'entreprise. RG34/RG35 : le questionnaire est
 * composé dynamiquement à la création (QuestionnaireService) puis figé
 * dans AUDIT_CRITERE/AUDIT_QUESTION — un audit en cours ne change pas de
 * périmètre si le référentiel évolue ensuite.
 *
 * Portée volontairement réduite pour ce sous-lot (phase D, 1/3) :
 * l'affectation d'auditeurs (AUDIT_AUDITEUR) et le multi-site (AUDIT_SITE)
 * ne sont pas encore exposés — le nécessaire pour composer et créer une
 * mission mono-site est déjà une base solide, l'affectation d'équipe
 * viendra avec la collecte de preuves (sous-lot 2).
 */
@Path("/api/v1/entreprises/{entrepriseId}/audits")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class AuditResource {

    @Inject EntrepriseRepository entrepriseRepository;
    @Inject ReferentielRepository referentielRepository;
    @Inject AbonnementRepository abonnementRepository;
    @Inject AuditRepository auditRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject AuditQuestionRepository auditQuestionRepository;
    @Inject QuestionRepository questionRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject QuestionnaireService questionnaireService;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @GET
    public Response lister(@PathParam("entrepriseId") UUID entrepriseId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);

        var audits = auditRepository.parEntreprise(entrepriseId).stream()
                .map(a -> AuditDto.depuis(a, auditCritereRepository.parAudit(a.getId()).size()))
                .toList();
        return Response.ok(audits).build();
    }

    @GET
    @Path("/{auditId}")
    public Response detail(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);

        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);
        int nombreCriteres = auditCritereRepository.parAudit(audit.getId()).size();
        return Response.ok(AuditDto.depuis(audit, nombreCriteres)).build();
    }

    @GET
    @Path("/{auditId}/criteres")
    public Response criteres(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);

        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);
        var criteres = auditCritereRepository.parAudit(audit.getId()).stream().map(AuditCritereDto::depuis).toList();
        return Response.ok(criteres).build();
    }

    @POST
    @Transactional
    public Response creer(@PathParam("entrepriseId") UUID entrepriseId, @Valid AuditCreateRequest requete) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);

        Entreprise entreprise = entrepriseRepository.findById(entrepriseId);
        if (entreprise == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        // RG20 : une entreprise ne peut lancer un audit que si son abonnement est actif.
        Abonnement abonnement = abonnementRepository.leplusRecentParEntreprise(entrepriseId).orElse(null);
        if (abonnement == null || !abonnement.estActif()) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity(new ErreurDto("RG20 : un abonnement actif est requis pour lancer un audit"))
                    .build();
        }

        Referentiel referentiel = referentielRepository.parCode(requete.referentielCode())
                .orElseThrow(() -> new BadRequestException("Référentiel inconnu : " + requete.referentielCode()));

        Audit audit = new Audit(entreprise, referentiel, requete.nom(), requete.dateDebut());
        audit.setDescription(requete.description());
        audit.setDateFin(requete.dateFin());
        audit.setFormuleAbonnement(abonnement.getFormule());
        audit.setCreatedBy(utilisateurRepository.findById(utilisateurId));
        auditRepository.persist(audit);

        // RG34/RG35 : composition dynamique du questionnaire, figée dans la
        // mission (voir javadoc QuestionnaireService et AuditCritere).
        List<Critere> criteresApplicables = questionnaireService.composer(entreprise, referentiel);
        for (Critere critere : criteresApplicables) {
            AuditCritere auditCritere = new AuditCritere(audit, critere);
            auditCritereRepository.persist(auditCritere);

            for (Question question : questionRepository.parCritere(critere.getId())) {
                auditQuestionRepository.persist(new AuditQuestion(auditCritere, question));
            }
        }

        auditLogService.journaliser(utilisateurId, entrepriseId, "AUDIT_CREE", "audit", audit.getId());

        return Response.status(Response.Status.CREATED)
                .entity(AuditDto.depuis(audit, criteresApplicables.size()))
                .build();
    }

    private Audit trouverAuditDeLEntreprise(UUID entrepriseId, UUID auditId) {
        Audit audit = auditRepository.findById(auditId);
        if (audit == null || !audit.getEntreprise().getId().equals(entrepriseId)) {
            throw new NotFoundException("Audit introuvable pour cette entreprise");
        }
        return audit;
    }
}
