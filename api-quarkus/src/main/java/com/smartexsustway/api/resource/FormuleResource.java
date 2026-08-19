package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.entity.FormuleAbonnement;
import com.smartexsustway.api.domain.repository.FormuleAbonnementRepository;
import com.smartexsustway.api.resource.dto.FormuleAbonnementDto;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/**
 * Lecture seule, volontairement PUBLIQUE (pas de @Authenticated) : CDC §5 —
 * "le visiteur choisit sa formule avant même la création de son compte".
 */
@Path("/api/v1/formules")
@Produces(MediaType.APPLICATION_JSON)
public class FormuleResource {

    @Inject
    FormuleAbonnementRepository formuleAbonnementRepository;

    @GET
    public Response lister() {
        var formules = formuleAbonnementRepository.listAll().stream()
                .filter(FormuleAbonnement::isActive)
                .map(FormuleAbonnementDto::depuis)
                .toList();
        return Response.ok(formules).build();
    }
}
