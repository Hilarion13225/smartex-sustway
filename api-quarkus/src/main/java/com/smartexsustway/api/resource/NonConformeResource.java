package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.NonConforme;
import com.smartexsustway.api.domain.enums.StatutNonConformite;
import com.smartexsustway.api.domain.repository.ActionCorrectiveRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.NonConformeRepository;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.NonConformeDto;
import com.smartexsustway.api.resource.dto.NonConformeStatutRequestDto;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.UUID;

/**
 * RG17 : consultation et suivi des non-conformités d'une mission d'audit.
 * La création est exclusivement automatique (voir NonConformiteService,
 * déclenché à la validation d'une évaluation) — cette ressource ne fait
 * que lister et faire progresser leur statut de traitement.
 */
@Path("/api/v1/entreprises/{entrepriseId}/audits/{auditId}/non-conformites")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class NonConformeResource {

    @Inject AuditRepository auditRepository;
    @Inject NonConformeRepository nonConformeRepository;
    @Inject ActionCorrectiveRepository actionCorrectiveRepository;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @GET
    public Response lister(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);
        trouverAuditDeLEntreprise(entrepriseId, auditId);

        var nonConformites = nonConformeRepository.parAudit(auditId).stream()
                .map(nc -> NonConformeDto.depuis(nc, actionCorrectiveRepository.parNonConforme(nc.getId()).size()))
                .toList();
        return Response.ok(nonConformites).build();
    }

    @GET
    @Path("/{nonConformeId}")
    public Response detail(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId,
                            @PathParam("nonConformeId") UUID nonConformeId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);
        trouverAuditDeLEntreprise(entrepriseId, auditId);

        NonConforme nonConforme = trouverNonConformeDeLaMission(auditId, nonConformeId);
        int nombreActions = actionCorrectiveRepository.parNonConforme(nonConforme.getId()).size();
        return Response.ok(NonConformeDto.depuis(nonConforme, nombreActions)).build();
    }

    @PUT
    @Path("/{nonConformeId}/statut")
    @Transactional
    public Response changerStatut(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId,
                                   @PathParam("nonConformeId") UUID nonConformeId, @Valid NonConformeStatutRequestDto requete) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);
        String formuleCode = audit.getFormuleAbonnement() == null ? null : audit.getFormuleAbonnement().getCode();
        autorisationService.exigerPermission(utilisateurId, entrepriseId, formuleCode, "audit:modifier");

        NonConforme nonConforme = trouverNonConformeDeLaMission(auditId, nonConformeId);

        StatutNonConformite statut;
        try {
            statut = StatutNonConformite.valueOf(requete.statut());
        } catch (IllegalArgumentException e) {
            return erreur(400, "Statut de non-conformité inconnu : " + requete.statut());
        }

        nonConforme.setStatut(statut);
        auditLogService.journaliser(utilisateurId, entrepriseId, "NON_CONFORME_STATUT_CHANGE", "non_conforme", nonConforme.getId());

        int nombreActions = actionCorrectiveRepository.parNonConforme(nonConforme.getId()).size();
        return Response.ok(NonConformeDto.depuis(nonConforme, nombreActions)).build();
    }

    private Audit trouverAuditDeLEntreprise(UUID entrepriseId, UUID auditId) {
        Audit audit = auditRepository.findById(auditId);
        if (audit == null || !audit.getEntreprise().getId().equals(entrepriseId)) {
            throw new NotFoundException("Audit introuvable pour cette entreprise");
        }
        return audit;
    }

    private NonConforme trouverNonConformeDeLaMission(UUID auditId, UUID nonConformeId) {
        return nonConformeRepository.parIdEtAudit(nonConformeId, auditId)
                .orElseThrow(() -> new NotFoundException("Non-conformité introuvable pour cette mission"));
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}
