package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.dto.UtilisateurDto;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/api/v1/utilisateurs")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class UtilisateurResource {

    @Inject
    UtilisateurRepository utilisateurRepository;

    @Inject
    TenantContext tenantContext;

    @GET
    @Path("/moi")
    public Response moi() {
        Utilisateur utilisateur = utilisateurRepository.findById(tenantContext.utilisateurCourantId());
        if (utilisateur == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(UtilisateurDto.depuis(utilisateur)).build();
    }
}
