package com.smartexsustway.api.resource;

import com.smartexsustway.api.abonnement.PaiementService;
import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Abonnement;
import com.smartexsustway.api.domain.entity.Paiement;
import com.smartexsustway.api.domain.enums.FournisseurPaiement;
import com.smartexsustway.api.domain.repository.AbonnementRepository;
import com.smartexsustway.api.domain.repository.PaiementRepository;
import com.smartexsustway.api.resource.dto.AbonnementDto;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.PaiementCreateRequest;
import com.smartexsustway.api.resource.dto.PaiementDto;
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
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.UUID;

/**
 * RG20 : une entreprise ne peut lancer un audit que si son abonnement est
 * actif — cette ressource expose la consultation de l'abonnement et
 * l'initiation d'un paiement pour le faire passer de EN_ATTENTE_PAIEMENT
 * à ACTIF (voir PaiementService — traitement stub, intégration PI-SPI/Wave
 * réelle non câblée, cf. CDC §5.3).
 */
@Path("/api/v1/entreprises/{entrepriseId}/abonnement")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class AbonnementResource {

    @Inject AbonnementRepository abonnementRepository;
    @Inject PaiementRepository paiementRepository;
    @Inject PaiementService paiementService;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @GET
    public Response consulter(@PathParam("entrepriseId") UUID entrepriseId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);

        Abonnement abonnement = abonnementRepository.leplusRecentParEntreprise(entrepriseId)
                .orElseThrow(() -> new NotFoundException("Aucun abonnement pour cette entreprise"));
        return Response.ok(AbonnementDto.depuis(abonnement)).build();
    }

    @GET
    @Path("/paiements")
    public Response listerPaiements(@PathParam("entrepriseId") UUID entrepriseId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);

        Abonnement abonnement = abonnementRepository.leplusRecentParEntreprise(entrepriseId)
                .orElseThrow(() -> new NotFoundException("Aucun abonnement pour cette entreprise"));
        var paiements = paiementRepository.parAbonnement(abonnement.getId()).stream().map(PaiementDto::depuis).toList();
        return Response.ok(paiements).build();
    }

    @POST
    @Path("/paiements")
    @Transactional
    public Response payer(@PathParam("entrepriseId") UUID entrepriseId, @Valid PaiementCreateRequest requete) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);

        Abonnement abonnement = abonnementRepository.leplusRecentParEntreprise(entrepriseId)
                .orElseThrow(() -> new NotFoundException("Aucun abonnement pour cette entreprise"));

        if (abonnement.estActif()) {
            return Response.status(Response.Status.CONFLICT)
                    .entity(new ErreurDto("Cet abonnement est déjà actif"))
                    .build();
        }

        FournisseurPaiement fournisseur = FournisseurPaiement.valueOf(requete.fournisseur());
        Paiement paiement = paiementService.initierEtTraiter(abonnement, fournisseur);

        auditLogService.journaliser(utilisateurId, entrepriseId, "PAIEMENT_TRAITE", "paiement", paiement.getId());
        auditLogService.journaliser(utilisateurId, entrepriseId, "ABONNEMENT_ACTIVE", "abonnement", abonnement.getId());

        return Response.status(Response.Status.CREATED).entity(PaiementDto.depuis(paiement)).build();
    }
}
