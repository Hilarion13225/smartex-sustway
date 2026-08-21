package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.ActionCorrective;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.NonConforme;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.enums.PrioriteAction;
import com.smartexsustway.api.domain.enums.StatutActionCorrective;
import com.smartexsustway.api.domain.repository.ActionCorrectiveRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.NonConformeRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.dto.ActionCorrectiveCreateRequest;
import com.smartexsustway.api.resource.dto.ActionCorrectiveDto;
import com.smartexsustway.api.resource.dto.ActionCorrectiveStatutRequestDto;
import com.smartexsustway.api.resource.dto.ErreurDto;
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
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.UUID;

/** RG18 : plan d'actions correctives d'une non-conformité. */
@Path("/api/v1/entreprises/{entrepriseId}/audits/{auditId}/non-conformites/{nonConformeId}/actions")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class ActionCorrectiveResource {

    @Inject AuditRepository auditRepository;
    @Inject NonConformeRepository nonConformeRepository;
    @Inject ActionCorrectiveRepository actionCorrectiveRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @GET
    public Response lister(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId,
                            @PathParam("nonConformeId") UUID nonConformeId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);
        NonConforme nonConforme = trouverNonConformeDeLaMission(entrepriseId, auditId, nonConformeId);

        var actions = actionCorrectiveRepository.parNonConforme(nonConforme.getId()).stream()
                .map(ActionCorrectiveDto::depuis)
                .toList();
        return Response.ok(actions).build();
    }

    @POST
    @Transactional
    public Response creer(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId,
                           @PathParam("nonConformeId") UUID nonConformeId, @Valid ActionCorrectiveCreateRequest requete) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        NonConforme nonConforme = trouverNonConformeDeLaMission(entrepriseId, auditId, nonConformeId);

        PrioriteAction priorite = PrioriteAction.MOYENNE;
        if (requete.priorite() != null && !requete.priorite().isBlank()) {
            try {
                priorite = PrioriteAction.valueOf(requete.priorite());
            } catch (IllegalArgumentException e) {
                return erreur(400, "Priorité inconnue : " + requete.priorite());
            }
        }

        Utilisateur responsable = null;
        if (requete.responsableId() != null) {
            responsable = utilisateurRepository.findById(requete.responsableId());
            if (responsable == null) {
                return erreur(400, "Responsable introuvable : " + requete.responsableId());
            }
        }

        ActionCorrective action = new ActionCorrective(nonConforme, requete.titre());
        action.setDescription(requete.description());
        action.setResponsable(responsable);
        action.setDateEcheance(requete.dateEcheance());
        action.setPriorite(priorite);
        actionCorrectiveRepository.persist(action);

        auditLogService.journaliser(utilisateurId, entrepriseId, "ACTION_CORRECTIVE_CREEE", "action_corrective", action.getId());

        return Response.status(Response.Status.CREATED).entity(ActionCorrectiveDto.depuis(action)).build();
    }

    @PUT
    @Path("/{actionId}/statut")
    @Transactional
    public Response changerStatut(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId,
                                   @PathParam("nonConformeId") UUID nonConformeId, @PathParam("actionId") UUID actionId,
                                   @Valid ActionCorrectiveStatutRequestDto requete) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        NonConforme nonConforme = trouverNonConformeDeLaMission(entrepriseId, auditId, nonConformeId);

        ActionCorrective action = actionCorrectiveRepository.parIdEtNonConforme(actionId, nonConforme.getId())
                .orElseThrow(() -> new NotFoundException("Action corrective introuvable pour cette non-conformité"));

        StatutActionCorrective statut;
        try {
            statut = StatutActionCorrective.valueOf(requete.statut());
        } catch (IllegalArgumentException e) {
            return erreur(400, "Statut d'action corrective inconnu : " + requete.statut());
        }

        action.setStatut(statut);
        auditLogService.journaliser(utilisateurId, entrepriseId, "ACTION_CORRECTIVE_STATUT_CHANGE", "action_corrective", action.getId());

        return Response.ok(ActionCorrectiveDto.depuis(action)).build();
    }

    private NonConforme trouverNonConformeDeLaMission(UUID entrepriseId, UUID auditId, UUID nonConformeId) {
        Audit audit = auditRepository.findById(auditId);
        if (audit == null || !audit.getEntreprise().getId().equals(entrepriseId)) {
            throw new NotFoundException("Audit introuvable pour cette entreprise");
        }
        return nonConformeRepository.parIdEtAudit(nonConformeId, auditId)
                .orElseThrow(() -> new NotFoundException("Non-conformité introuvable pour cette mission"));
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}
