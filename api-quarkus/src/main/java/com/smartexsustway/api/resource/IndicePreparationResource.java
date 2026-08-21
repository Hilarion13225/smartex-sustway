package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.Bailleur;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.BailleurRepository;
import com.smartexsustway.api.domain.repository.IndicePreparationRepository;
import com.smartexsustway.api.indice.IndicePreparationService;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.IndicePreparationDto;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Map;

import java.util.UUID;

/**
 * RG41/RG42/RG43 — indice de préparation aux exigences d'un bailleur
 * (financements verts), réservé à la formule Avancées de l'entreprise
 * (même garde que le Risk/Recommendation Agent, voir EvaluationResource).
 * RG42 : readiness ≠ garantie d'éligibilité — ce disclaimer est porté par
 * le frontend, jamais par ce calcul.
 */
@Path("/api/v1/entreprises/{entrepriseId}/audits/{auditId}/indice-preparation")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class IndicePreparationResource {

    private static final String FORMULE_AVANCEES = "AVANCEES";

    @Inject AuditRepository auditRepository;
    @Inject BailleurRepository bailleurRepository;
    @Inject IndicePreparationRepository indicePreparationRepository;
    @Inject IndicePreparationService indicePreparationService;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @GET
    public Response lister(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);

        var indices = indicePreparationRepository.parAudit(audit.getId()).stream()
                .map(IndicePreparationDto::depuis)
                .toList();
        return Response.ok(indices).build();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response calculer(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId,
                              Map<String, String> requete) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);

        if (!estFormuleAvancees(audit)) {
            return erreur(403, "RG41 : l'indice de préparation bailleur est réservé à la formule Avancées");
        }

        String bailleurCode = requete == null ? null : requete.get("bailleurCode");
        if (bailleurCode == null || bailleurCode.isBlank()) {
            return erreur(400, "bailleurCode est requis");
        }
        Bailleur bailleur = bailleurRepository.parCode(bailleurCode)
                .orElseThrow(() -> new NotFoundException("Bailleur inconnu : " + bailleurCode));

        var indice = indicePreparationService.calculerEtEnregistrer(audit, bailleur);

        auditLogService.journaliser(utilisateurId, entrepriseId, "INDICE_PREPARATION_CALCULE", "indice_preparation", indice.getId());

        return Response.ok(IndicePreparationDto.depuis(indice)).build();
    }

    /** RG21 : même garde que le Risk/Recommendation Agent — dépend de la formule souscrite au moment de l'audit. */
    private boolean estFormuleAvancees(Audit audit) {
        return audit.getFormuleAbonnement() != null
                && FORMULE_AVANCEES.equals(audit.getFormuleAbonnement().getCode());
    }

    private Audit trouverAuditDeLEntreprise(UUID entrepriseId, UUID auditId) {
        Audit audit = auditRepository.findById(auditId);
        if (audit == null || !audit.getEntreprise().getId().equals(entrepriseId)) {
            throw new NotFoundException("Audit introuvable pour cette entreprise");
        }
        return audit;
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}
