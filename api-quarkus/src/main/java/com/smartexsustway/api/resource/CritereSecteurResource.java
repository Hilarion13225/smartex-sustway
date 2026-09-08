package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.Secteur;
import com.smartexsustway.api.domain.repository.CritereRepository;
import com.smartexsustway.api.domain.repository.CritereSecteurRepository;
import com.smartexsustway.api.domain.repository.SecteurRepository;
import com.smartexsustway.api.resource.dto.CritereSecteurDto;
import com.smartexsustway.api.resource.dto.DefinirCritereSecteurRequestDto;
import com.smartexsustway.api.resource.dto.ErreurDto;
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
 * Secteurs auxquels s'applique un critère réservé (applicabilité
 * SECTORIELLE).
 *
 * Sans aucun secteur rattaché, un tel critère n'est posé à personne : c'est
 * le comportement attendu d'un critère réservé, mais il est assez facile à
 * obtenir par mégarde pour que l'écran d'administration le signale.
 */
@Path("/api/v1/referentiels/criteres/{critereId}/secteurs")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({"SUPER_ADMIN", "ADMIN_AUDIT"})
public class CritereSecteurResource {

    @Inject CritereRepository critereRepository;
    @Inject SecteurRepository secteurRepository;
    @Inject CritereSecteurRepository critereSecteurRepository;

    @GET
    public Response lister(@PathParam("critereId") UUID critereId) {
        trouverCritere(critereId);

        List<CritereSecteurDto> resultat = critereSecteurRepository.listerPourCritere(critereId).stream()
                .map(this::versDto)
                .toList();
        return Response.ok(resultat).build();
    }

    @PUT
    public Response definir(@PathParam("critereId") UUID critereId,
                            DefinirCritereSecteurRequestDto requete) {
        trouverCritere(critereId);

        if (requete == null || requete.secteurCode() == null) {
            return erreur(400, "secteurCode est requis");
        }
        Secteur secteur = secteurRepository.parCode(requete.secteurCode())
                .orElseThrow(() -> new NotFoundException("Secteur inconnu : " + requete.secteurCode()));

        boolean applicable = requete.applicable() == null || requete.applicable();
        critereSecteurRepository.definir(critereId, secteur.getId(), applicable);

        return Response.ok(new CritereSecteurDto(secteur.getCode(), secteur.getNom(), applicable)).build();
    }

    @DELETE
    @Path("/{secteurCode}")
    public Response supprimer(@PathParam("critereId") UUID critereId,
                              @PathParam("secteurCode") String secteurCode) {
        trouverCritere(critereId);
        Secteur secteur = secteurRepository.parCode(secteurCode)
                .orElseThrow(() -> new NotFoundException("Secteur inconnu : " + secteurCode));

        critereSecteurRepository.supprimer(critereId, secteur.getId());
        return Response.noContent().build();
    }

    private Critere trouverCritere(UUID critereId) {
        Critere critere = critereRepository.findById(critereId);
        if (critere == null) {
            throw new NotFoundException("Critère introuvable : " + critereId);
        }
        return critere;
    }

    private CritereSecteurDto versDto(Object[] ligne) {
        Secteur secteur = secteurRepository.findById(UUID.fromString((String) ligne[0]));
        return new CritereSecteurDto(
                secteur == null ? null : secteur.getCode(),
                secteur == null ? null : secteur.getNom(),
                (Boolean) ligne[1]);
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}
