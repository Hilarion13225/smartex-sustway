package com.smartexsustway.api.resource;

import com.smartexsustway.api.referentiel.ImportProposition22Service;
import com.smartexsustway.api.referentiel.Proposition22Dto;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/**
 * Import d'une proposition d'enrichissement d'un référentiel publié.
 *
 * Distinct de l'import documentaire, et volontairement : celui-là part d'un
 * document que le service d'agents analyse pour en tirer un référentiel
 * entier ; celui-ci part d'une proposition déjà produite, relue et arbitrée,
 * et ne fait qu'ajouter à un catalogue existant. Aucune analyse n'est
 * déclenchée ici — l'opération est locale et déterministe.
 *
 * Le contenu déposé porte {@code IMPORT_IA} et n'est validé par personne : le
 * déclencheur {@code refuser_publication_sans_validation} refusera la
 * publication de la version tant qu'une personne ne l'aura pas accepté ou
 * écarté, critère par critère. Les endpoints de décision sont ceux du
 * back-office, communs aux deux imports.
 */
@Path("/api/v1/referentiels/imports/proposition")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class ImportProposition22Resource {

    @Inject ImportProposition22Service importService;
    @Inject TenantContext tenantContext;

    /**
     * Applique une proposition au référentiel visé, dans une version neuve.
     *
     * Le numéro de version n'est pas déduit du document : c'est à la personne
     * qui importe de dire ce qu'elle ouvre. Une numérotation inventée
     * s'inscrirait dans le catalogue et suivrait chaque mission menée sur
     * cette version.
     */
    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @RolesAllowed("SUPER_ADMIN")
    public Response importer(@QueryParam("referentiel") String codeReferentiel,
                             @QueryParam("version") String numeroVersion,
                             Proposition22Dto proposition) {
        if (estVide(codeReferentiel)) {
            return erreur(400, "Le code du référentiel visé doit être précisé");
        }
        if (estVide(numeroVersion)) {
            return erreur(400, "Le numéro de la version à ouvrir doit être précisé");
        }
        if (proposition == null || proposition.criteres() == null
                || proposition.criteres().isEmpty()) {
            return erreur(400, "La proposition ne contient aucun critère");
        }

        try {
            var resultat = importService.importer(codeReferentiel, numeroVersion,
                    proposition, tenantContext.utilisateurCourantId());
            return Response.status(201).entity(resultat).build();
        } catch (ImportProposition22Service.ImportRefuseException e) {
            return erreur(e.statutHttp(), e.getMessage());
        }
    }

    private static boolean estVide(String valeur) {
        return valeur == null || valeur.isBlank();
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}
