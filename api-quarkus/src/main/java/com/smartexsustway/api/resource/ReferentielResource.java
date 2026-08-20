package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.entity.Referentiel;
import com.smartexsustway.api.domain.repository.CritereRepository;
import com.smartexsustway.api.domain.repository.ReferentielRepository;
import com.smartexsustway.api.resource.dto.CritereDto;
import com.smartexsustway.api.resource.dto.ReferentielDto;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/**
 * Lecture du référentiel (RG07/RG08/RG09) : liste des référentiels et de
 * leurs critères. La prévisualisation du questionnaire dynamique par
 * entreprise (RG34) vit dans QuestionnaireResource — volontairement
 * séparée de cette classe pour suivre le même schéma que AuditResource/
 * SiteResource/AbonnementResource (préfixe complet déclaré au niveau de
 * la classe, jamais mélangé à des routes non imbriquées sous /entreprises).
 */
@Path("/api/v1/referentiels")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class ReferentielResource {

    @Inject ReferentielRepository referentielRepository;
    @Inject CritereRepository critereRepository;

    @GET
    public Response lister() {
        var referentiels = referentielRepository.listAll().stream().map(ReferentielDto::depuis).toList();
        return Response.ok(referentiels).build();
    }

    @GET
    @Path("/{code}/criteres")
    public Response criteres(@PathParam("code") String code) {
        Referentiel referentiel = referentielRepository.parCode(code)
                .orElseThrow(() -> new NotFoundException("Référentiel inconnu : " + code));

        var criteres = critereRepository.parReferentiel(referentiel.getId()).stream().map(CritereDto::depuis).toList();
        return Response.ok(criteres).build();
    }
}
