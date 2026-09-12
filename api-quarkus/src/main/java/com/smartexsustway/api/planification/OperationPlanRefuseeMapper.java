package com.smartexsustway.api.planification;

import com.smartexsustway.api.resource.dto.ErreurDto;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

/**
 * Traduit un refus d'opération sur un plan ou une action en 409, avec son
 * motif.
 *
 * <p>Un relais plutôt qu'un {@code try/catch} par route : le gel d'un plan
 * peut être rencontré par la modification, l'ajout d'action, la réaffectation
 * ou le changement de statut, et une route qui oublierait de l'attraper
 * rendrait 500 — ce qui s'est effectivement produit avant l'ajout de ce
 * relais. Un conflit d'état n'est pas une panne.
 *
 * <p>Même motif que {@code VersionFigeeMapper}, pour la même raison.
 */
@Provider
public class OperationPlanRefuseeMapper implements ExceptionMapper<OperationPlanRefusee> {

    @Override
    public Response toResponse(OperationPlanRefusee exception) {
        return Response.status(Response.Status.CONFLICT)
                .entity(new ErreurDto(exception.getMessage()))
                .build();
    }
}
