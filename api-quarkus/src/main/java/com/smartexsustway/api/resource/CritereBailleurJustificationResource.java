package com.smartexsustway.api.resource;

import com.smartexsustway.api.referentiel.JustificationMappingService;
import com.smartexsustway.api.referentiel.JustificationRefuseeException;
import com.smartexsustway.api.resource.dto.CritereBailleurJustificationRequest;
import com.smartexsustway.api.resource.dto.ErreurDto;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.UUID;
import java.util.function.Supplier;

/**
 * Justification documentaire d'un mapping critère ↔ bailleur (V74-A),
 * réservée à SUPER_ADMIN.
 *
 * <p>Distincte de CritereBailleurResource, qui pose le mapping et reste
 * inchangée : un mapping dit qu'un critère compte pour un bailleur ; sa
 * justification dit sur quel document, quel passage, et qui l'a validé.
 *
 * <p>{@code @RolesAllowed} filtre sur le jeton ; le service relit en base le
 * compte, le rattachement et le rôle, qu'un jeton encore valide ne garantit
 * plus.
 */
@Path("/api/v1/referentiels/criteres/{critereId}/bailleur/{bailleurCode}/justification")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class CritereBailleurJustificationResource {

    @Inject JustificationMappingService service;

    /** La justification en cours, ou l'état NON_DOCUMENTE. */
    @GET
    @RolesAllowed("SUPER_ADMIN")
    public Response consulter(@PathParam("critereId") UUID critereId,
                              @PathParam("bailleurCode") String bailleurCode) {
        return repondre(() -> Response.ok(service.consulter(critereId, bailleurCode)));
    }

    @GET
    @Path("/historique")
    @RolesAllowed("SUPER_ADMIN")
    public Response historique(@PathParam("critereId") UUID critereId,
                               @PathParam("bailleurCode") String bailleurCode) {
        return repondre(() -> Response.ok(service.historique(critereId, bailleurCode)));
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response creer(@PathParam("critereId") UUID critereId,
                          @PathParam("bailleurCode") String bailleurCode,
                          @Valid CritereBailleurJustificationRequest requete) {
        return repondre(() -> Response.status(Response.Status.CREATED)
                .entity(service.creer(critereId, bailleurCode, requete)));
    }

    @PUT
    @Path("/{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response modifier(@PathParam("critereId") UUID critereId,
                             @PathParam("bailleurCode") String bailleurCode,
                             @PathParam("id") UUID id,
                             @Valid CritereBailleurJustificationRequest requete) {
        return repondre(() -> Response.ok(service.modifier(critereId, bailleurCode, id, requete)));
    }

    @POST
    @Path("/{id}/validation")
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response valider(@PathParam("critereId") UUID critereId,
                            @PathParam("bailleurCode") String bailleurCode,
                            @PathParam("id") UUID id) {
        return repondre(() -> Response.ok(service.valider(critereId, bailleurCode, id)));
    }

    @POST
    @Path("/{id}/rejet")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response rejeter(@PathParam("critereId") UUID critereId,
                            @PathParam("bailleurCode") String bailleurCode,
                            @PathParam("id") UUID id,
                            CritereBailleurJustificationRequest.Motif motif) {
        return repondre(() -> Response.ok(service.rejeter(critereId, bailleurCode, id, motif)));
    }

    @POST
    @Path("/{id}/peremption")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response perimer(@PathParam("critereId") UUID critereId,
                            @PathParam("bailleurCode") String bailleurCode,
                            @PathParam("id") UUID id,
                            CritereBailleurJustificationRequest.Motif motif) {
        return repondre(() -> Response.ok(service.perimer(critereId, bailleurCode, id, motif)));
    }

    /** Reporte sur ce critère la justification de son équivalent dans la version parente. */
    @POST
    @Path("/report")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response reporter(@PathParam("critereId") UUID critereId,
                             @PathParam("bailleurCode") String bailleurCode,
                             CritereBailleurJustificationRequest.Report report) {
        return repondre(() -> Response.status(Response.Status.CREATED)
                .entity(service.reporter(critereId, bailleurCode, report)));
    }

    /**
     * Rend un refus du service avec son statut. Les refus de la base, eux,
     * traversent : ils doivent sortir de la méthode pour que la transaction
     * soit annulée, puis ContrainteJustificationMapper les rend en 409.
     */
    private static Response repondre(Supplier<Response.ResponseBuilder> operation) {
        try {
            return operation.get().build();
        } catch (JustificationRefuseeException e) {
            return Response.status(e.statutHttp()).entity(new ErreurDto(e.getMessage())).build();
        }
    }
}
