package com.smartexsustway.api.referentiel;

import com.smartexsustway.api.resource.dto.ErreurDto;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

/**
 * Traduit un refus d'écriture sur une version figée en 409, avec son motif.
 *
 * Sans ce relais, le refus remonterait en 500 : soit depuis le service, soit
 * — pour les chemins qu'il ne couvrirait pas — depuis le déclencheur de V49,
 * sous la forme d'une erreur SQL. Un conflit d'état n'est pas une panne, et
 * l'appelant doit savoir quoi faire ensuite : ouvrir une version brouillon.
 */
@Provider
public class VersionFigeeMapper implements ExceptionMapper<VersionReferentielService.VersionFigeeException> {

    @Override
    public Response toResponse(VersionReferentielService.VersionFigeeException exception) {
        return Response.status(Response.Status.CONFLICT)
                .entity(new ErreurDto(exception.getMessage()))
                .build();
    }
}
