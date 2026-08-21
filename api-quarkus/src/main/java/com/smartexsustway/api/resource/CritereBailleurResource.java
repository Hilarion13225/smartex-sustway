package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.entity.Bailleur;
import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.repository.BailleurRepository;
import com.smartexsustway.api.domain.repository.CritereBailleurRepository;
import com.smartexsustway.api.domain.repository.CritereRepository;
import com.smartexsustway.api.resource.dto.CritereBailleurDto;
import com.smartexsustway.api.resource.dto.DefinirCritereBailleurRequestDto;
import com.smartexsustway.api.resource.dto.ErreurDto;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.UUID;

/**
 * RG39 (CDC §7.7, Phase F) : administration des tags d'applicabilité
 * bailleur d'un critère — back-office minimal, réservé à SUPER_ADMIN. Sans
 * cette ressource, {@code critere_bailleur} resterait toujours vide et
 * l'indice de préparation (IndicePreparationService) ne pourrait jamais
 * être démontré, même si son calcul est correct.
 */
@Path("/api/v1/referentiels/criteres/{critereId}/bailleur")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class CritereBailleurResource {

    @Inject CritereRepository critereRepository;
    @Inject BailleurRepository bailleurRepository;
    @Inject CritereBailleurRepository critereBailleurRepository;

    @GET
    @RolesAllowed({"SUPER_ADMIN", "ADMIN_AUDIT"})
    public Response lister(@PathParam("critereId") UUID critereId) {
        trouverCritere(critereId);

        List<CritereBailleurDto> resultat = critereBailleurRepository.listerPourCritere(critereId).stream()
                .map(this::versDto)
                .toList();
        return Response.ok(resultat).build();
    }

    @PUT
    @RolesAllowed("SUPER_ADMIN")
    public Response definir(@PathParam("critereId") UUID critereId, DefinirCritereBailleurRequestDto requete) {
        trouverCritere(critereId);

        if (requete == null || requete.bailleurCode() == null || requete.applicable() == null) {
            return erreur(400, "bailleurCode et applicable sont requis");
        }

        Bailleur bailleur = bailleurRepository.parCode(requete.bailleurCode())
                .orElseThrow(() -> new NotFoundException("Bailleur inconnu : " + requete.bailleurCode()));

        critereBailleurRepository.definir(critereId, bailleur.getId(), requete.applicable());

        return Response.ok(new CritereBailleurDto(bailleur.getCode(), bailleur.getNom(), requete.applicable())).build();
    }

    @DELETE
    @Path("/{bailleurCode}")
    @RolesAllowed("SUPER_ADMIN")
    public Response supprimer(@PathParam("critereId") UUID critereId, @PathParam("bailleurCode") String bailleurCode) {
        trouverCritere(critereId);
        Bailleur bailleur = bailleurRepository.parCode(bailleurCode)
                .orElseThrow(() -> new NotFoundException("Bailleur inconnu : " + bailleurCode));

        critereBailleurRepository.supprimer(critereId, bailleur.getId());
        return Response.noContent().build();
    }

    private Critere trouverCritere(UUID critereId) {
        Critere critere = critereRepository.findById(critereId);
        if (critere == null) {
            throw new NotFoundException("Critère introuvable : " + critereId);
        }
        return critere;
    }

    private CritereBailleurDto versDto(Object[] ligne) {
        UUID bailleurId = UUID.fromString((String) ligne[0]);
        boolean applicable = (boolean) ligne[1];
        Bailleur bailleur = bailleurRepository.findById(bailleurId);
        return new CritereBailleurDto(
                bailleur == null ? null : bailleur.getCode(),
                bailleur == null ? null : bailleur.getNom(),
                applicable
        );
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}
