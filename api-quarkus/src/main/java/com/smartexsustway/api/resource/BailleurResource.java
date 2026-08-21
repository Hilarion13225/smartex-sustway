package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.repository.BailleurRepository;
import com.smartexsustway.api.resource.dto.BailleurDto;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/** RG40 : liste des bailleurs (financements verts) — lecture publique, comme SecteurResource. */
@Path("/api/v1/bailleurs")
@Produces(MediaType.APPLICATION_JSON)
public class BailleurResource {

    @Inject
    BailleurRepository bailleurRepository;

    @GET
    public Response lister() {
        var bailleurs = bailleurRepository.listAll().stream().map(BailleurDto::depuis).toList();
        return Response.ok(bailleurs).build();
    }
}
