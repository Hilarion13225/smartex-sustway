package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.repository.CritereRepository;
import com.smartexsustway.api.referentiel.ValidationContenuImporteService;
import com.smartexsustway.api.resource.dto.CritereDto;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.RejetContenuRequestDto;
import com.smartexsustway.api.resource.dto.ValidationContenuRequestDto;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.UUID;

/**
 * Acceptation et rejet d'un critère proposé par un import assisté.
 *
 * Depuis V75, un critère importé bloque la publication de sa version tant que
 * personne ne l'a tranché. Sans ces deux endpoints, il serait comptabilisé
 * comme bloquant sans qu'aucun chemin HTTP ne permette de le rejeter, et la
 * version deviendrait impubliable — un contenu qu'on peut compter mais pas
 * traiter ne vaut pas mieux qu'un contenu qu'on ne compte pas.
 *
 * L'unité de décision est la LIGNE : accepter un critère accepte du même geste
 * son libellé, sa description, son applicabilité, son coefficient de
 * pondération et sa criticité. Ces valeurs viennent de la même proposition, et
 * les séparer supposerait cinq décisions là où le relecteur n'en prend qu'une.
 *
 * La modification ordinaire d'un critère n'est pas servie ici : elle relève du
 * back-office de catalogue, et se confondre avec elle ferait de la validation
 * une écriture de champs plutôt qu'une décision.
 */
@Path("/api/v1/referentiels/criteres/{critereId}")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class CritereValidationResource {

    @Inject CritereRepository critereRepository;
    @Inject ValidationContenuImporteService validationService;
    @Inject TenantContext tenantContext;

    /**
     * Accepte un critère proposé par un import assisté.
     *
     * Rejouable sans effet : un second appel rend le même critère sans
     * déplacer ni le validateur ni la date.
     */
    @POST
    @Path("/validation")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response valider(@PathParam("critereId") UUID critereId,
                            ValidationContenuRequestDto requete) {
        Critere critere = trouver(critereId);
        try {
            validationService.validerCritere(critere,
                    ValidationContenuRequestDto.versionAttendue(requete),
                    tenantContext.utilisateurCourantId());
        } catch (ValidationContenuImporteService.ValidationRefuseeException e) {
            return erreur(e.statutHttp(), e.getMessage());
        }
        return Response.ok(CritereDto.depuis(critere)).build();
    }

    /**
     * Écarte un critère proposé par un import assisté.
     *
     * Opération distincte de la suppression : la ligne subsiste, marquée du
     * relecteur, de la date et d'un motif s'il en a donné un. Supprimer
     * emporterait en cascade ses exigences, ses preuves et ses règles — dont
     * certaines peuvent avoir été acceptées — et effacerait la trace qu'une
     * machine avait proposé ce critère.
     *
     * Rejouable sans effet — un second rejet ne déplace ni la date ni le motif.
     */
    @POST
    @Path("/rejet")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response rejeter(@PathParam("critereId") UUID critereId,
                            @Valid RejetContenuRequestDto requete) {
        Critere critere = trouver(critereId);
        try {
            validationService.rejeterCritere(critere,
                    RejetContenuRequestDto.versionAttendue(requete),
                    RejetContenuRequestDto.motif(requete),
                    tenantContext.utilisateurCourantId());
        } catch (ValidationContenuImporteService.ValidationRefuseeException e) {
            return erreur(e.statutHttp(), e.getMessage());
        }
        return Response.ok(CritereDto.depuis(critere)).build();
    }

    private Critere trouver(UUID critereId) {
        Critere critere = critereRepository.findById(critereId);
        if (critere == null) {
            throw new NotFoundException("Critère introuvable : " + critereId);
        }
        return critere;
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}
