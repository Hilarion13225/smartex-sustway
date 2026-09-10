package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.PreuveAttendue;
import com.smartexsustway.api.domain.enums.TypePreuveAttendue;
import com.smartexsustway.api.domain.repository.PreuveAttendueRepository;
import com.smartexsustway.api.referentiel.ValidationContenuImporteService;
import com.smartexsustway.api.referentiel.VersionReferentielService;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.PreuveAttendueDto;
import com.smartexsustway.api.resource.dto.RejetContenuRequestDto;
import com.smartexsustway.api.resource.dto.ValidationContenuRequestDto;
import com.smartexsustway.api.resource.dto.PreuveAttendueRequestDto;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.UUID;

/**
 * Modification d'une preuve attendue existante.
 *
 * Rappel de ce que cette table n'est pas : une pièce déposée par une
 * organisation. Ce que l'audit attend appartient au référentiel et se
 * versionne ; ce que l'entreprise fournit appartient à la mission (voir
 * DocumentResource et PreuveResource).
 */
@Path("/api/v1/referentiels/preuves-attendues/{preuveAttendueId}")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class PreuveAttendueResource {

    @Inject PreuveAttendueRepository preuveAttendueRepository;
    @Inject VersionReferentielService versionService;
    @Inject ValidationContenuImporteService validationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @PUT
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response modifier(@PathParam("preuveAttendueId") UUID preuveAttendueId,
                             @Valid PreuveAttendueRequestDto requete) {
        PreuveAttendue preuve = trouver(preuveAttendueId);
        versionService.exigerVersionModifiable(preuve.getReferentielVersion());
        if (requete == null) {
            return erreur(400, "Corps de requête manquant");
        }

        if (requete.type() != null) {
            try {
                preuve.setType(TypePreuveAttendue.valueOf(requete.type()));
            } catch (IllegalArgumentException e) {
                return erreur(400, "Type de preuve attendue invalide : " + requete.type());
            }
        }
        if (requete.libelle() != null) {
            preuve.setLibelle(requete.libelle());
        }
        if (requete.description() != null) {
            preuve.setDescription(requete.description());
        }
        if (requete.obligatoire() != null) {
            preuve.setObligatoire(requete.obligatoire());
        }
        if (requete.ordre() != null) {
            preuve.setOrdre(requete.ordre());
        }

        auditLogService.journaliser(tenantContext.utilisateurCourantId(), null,
                "PREUVE_ATTENDUE_MODIFIEE", "preuve_attendue", preuve.getId());

        return Response.ok(PreuveAttendueDto.depuis(preuve)).build();
    }

    @DELETE
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response supprimer(@PathParam("preuveAttendueId") UUID preuveAttendueId) {
        PreuveAttendue preuve = trouver(preuveAttendueId);
        versionService.exigerVersionModifiable(preuve.getReferentielVersion());
        preuveAttendueRepository.delete(preuve);

        auditLogService.journaliser(tenantContext.utilisateurCourantId(), null,
                "PREUVE_ATTENDUE_SUPPRIMEE", "preuve_attendue", preuveAttendueId);

        return Response.noContent().build();
    }

    /**
     * Accepte une preuve attendue proposée par un import assisté.
     *
     * Voir ExigenceModificationResource.valider : même opération, même
     * garanties, sur l'autre étage du contenu importé.
     */
    @POST
    @Path("/validation")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response valider(@PathParam("preuveAttendueId") UUID preuveAttendueId,
                            ValidationContenuRequestDto requete) {
        PreuveAttendue preuve = trouver(preuveAttendueId);
        try {
            validationService.validerPreuveAttendue(preuve,
                    ValidationContenuRequestDto.versionAttendue(requete),
                    tenantContext.utilisateurCourantId());
        } catch (ValidationContenuImporteService.ValidationRefuseeException e) {
            return erreur(e.statutHttp(), e.getMessage());
        }
        return Response.ok(PreuveAttendueDto.depuis(preuve)).build();
    }

    /**
     * Écarte une preuve attendue proposée par un import assisté.
     *
     * Opération distincte de la suppression : la ligne subsiste, marquée du
     * relecteur, de la date et d'un motif s'il en a donné un. Supprimer
     * effacerait la trace qu'une machine l'avait proposée, et l'import
     * deviendrait invérifiable après coup. Une proposition écartée cesse de
     * bloquer la publication sans pour autant entrer dans le contenu retenu.
     *
     * Rejouable sans effet — un second rejet ne déplace ni la date ni le motif.
     */
    @POST
    @Path("/rejet")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response rejeter(@PathParam("preuveAttendueId") UUID preuveAttendueId,
                            @Valid RejetContenuRequestDto requete) {
        PreuveAttendue preuve = trouver(preuveAttendueId);
        try {
            validationService.rejeterPreuveAttendue(preuve,
                    RejetContenuRequestDto.versionAttendue(requete),
                    RejetContenuRequestDto.motif(requete),
                    tenantContext.utilisateurCourantId());
        } catch (ValidationContenuImporteService.ValidationRefuseeException e) {
            return erreur(e.statutHttp(), e.getMessage());
        }
        return Response.ok(PreuveAttendueDto.depuis(preuve)).build();
    }

    private PreuveAttendue trouver(UUID preuveAttendueId) {
        PreuveAttendue preuve = preuveAttendueRepository.findById(preuveAttendueId);
        if (preuve == null) {
            throw new NotFoundException("Preuve attendue introuvable : " + preuveAttendueId);
        }
        return preuve;
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}
