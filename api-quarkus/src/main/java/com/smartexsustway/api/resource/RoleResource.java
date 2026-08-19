package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.repository.RoleRepository;
import com.smartexsustway.api.resource.dto.RoleDto;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/** Lecture seule — la gestion des rôles (création/modification) est réservée au back-office (phase F). */
@Path("/api/v1/roles")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class RoleResource {

    @Inject
    RoleRepository roleRepository;

    @GET
    public Response lister() {
        var roles = roleRepository.listAll().stream().map(RoleDto::depuis).toList();
        return Response.ok(roles).build();
    }
}
