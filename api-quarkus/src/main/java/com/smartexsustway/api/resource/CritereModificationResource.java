package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.Criticite;
import com.smartexsustway.api.domain.enums.NiveauCriticite;
import com.smartexsustway.api.domain.enums.TypeApplicabilite;
import com.smartexsustway.api.domain.repository.CriticiteRepository;
import com.smartexsustway.api.domain.repository.CritereRepository;
import com.smartexsustway.api.resource.dto.CritereDto;
import com.smartexsustway.api.resource.dto.CritereUpdateRequestDto;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.UUID;

/**
 * RG09 (module 4, back-office) : modification d'un critère existant, par
 * id. Réservé à SUPER_ADMIN. Un critère "retiré" se désactive
 * (actif=false, voir CritereUpdateRequestDto), il n'est jamais supprimé
 * (RG14, historique des audits). Préfixe partagé avec
 * CriticiteSecteurResource (/api/v1/referentiels/criteres/{critereId}/...)
 * — chemins distincts, aucun chevauchement de route JAX-RS.
 */
@Path("/api/v1/referentiels/criteres/{critereId}")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class CritereModificationResource {

    @Inject CritereRepository critereRepository;
    @Inject CriticiteRepository criticiteRepository;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @PUT
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response modifier(@PathParam("critereId") UUID critereId, CritereUpdateRequestDto requete) {
        Critere critere = critereRepository.findById(critereId);
        if (critere == null) {
            throw new NotFoundException("Critère introuvable : " + critereId);
        }
        if (requete == null) {
            return erreur(400, "Corps de requête manquant");
        }

        if (requete.libelle() != null) {
            critere.setLibelle(requete.libelle());
        }
        if (requete.description() != null) {
            critere.setDescription(requete.description());
        }
        if (requete.applicabilite() != null) {
            try {
                critere.setApplicabilite(TypeApplicabilite.valueOf(requete.applicabilite()));
            } catch (IllegalArgumentException e) {
                return erreur(400, "Applicabilité invalide : " + requete.applicabilite()
                        + " (attendu : GENERALE, SECTORIELLE, BAILLEUR)");
            }
        }
        if (requete.criticiteCode() != null) {
            NiveauCriticite niveau;
            try {
                niveau = NiveauCriticite.valueOf(requete.criticiteCode());
            } catch (IllegalArgumentException e) {
                return erreur(400, "Code de criticité invalide : " + requete.criticiteCode()
                        + " (attendu : FAIBLE, MOYENNE, ELEVEE, CRITIQUE)");
            }
            Criticite criticite = criticiteRepository.parCode(niveau)
                    .orElseThrow(() -> new NotFoundException("Criticité inconnue : " + requete.criticiteCode()));
            critere.setCriticite(criticite);
        }
        if (requete.actif() != null) {
            critere.setActif(requete.actif());
        }

        auditLogService.journaliser(tenantContext.utilisateurCourantId(), null,
                "CRITERE_MODIFIE", "critere", critere.getId());

        return Response.ok(CritereDto.depuis(critere)).build();
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}
