package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.repository.SecteurRepository;
import com.smartexsustway.api.resource.dto.SecteurDto;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/**
 * Lecture seule, volontairement PUBLIQUE (pas de @Authenticated) : la liste
 * des secteurs est nécessaire dès le formulaire d'inscription, avant toute
 * connexion (CDC §5.4 — composition du questionnaire selon secteur/taille/statut).
 */
@Path("/api/v1/secteurs")
@Produces(MediaType.APPLICATION_JSON)
public class SecteurResource {

    @Inject
    SecteurRepository secteurRepository;

    @GET
    public Response lister() {
        var secteurs = secteurRepository.listAll().stream().map(SecteurDto::depuis).toList();
        return Response.ok(secteurs).build();
    }
}
