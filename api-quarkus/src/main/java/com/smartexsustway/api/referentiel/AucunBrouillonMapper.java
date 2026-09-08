package com.smartexsustway.api.referentiel;

import com.smartexsustway.api.resource.dto.ErreurDto;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

/**
 * Traduit en 409 l'absence de version brouillon.
 *
 * Le message dit quoi faire — ouvrir une version — plutôt que de constater
 * l'échec : c'est la seule chose que l'appelant puisse entreprendre.
 */
@Provider
public class AucunBrouillonMapper implements ExceptionMapper<VersionReferentielService.AucunBrouillonException> {

    @Override
    public Response toResponse(VersionReferentielService.AucunBrouillonException exception) {
        return Response.status(Response.Status.CONFLICT)
                .entity(new ErreurDto(exception.getMessage()))
                .build();
    }
}
