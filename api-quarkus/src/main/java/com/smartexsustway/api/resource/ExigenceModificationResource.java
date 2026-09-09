package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Exigence;
import com.smartexsustway.api.domain.entity.PreuveAttendue;
import com.smartexsustway.api.domain.enums.OrigineContenu;
import com.smartexsustway.api.domain.enums.TypePreuveAttendue;
import com.smartexsustway.api.domain.repository.ExigenceRepository;
import com.smartexsustway.api.domain.repository.PreuveAttendueRepository;
import com.smartexsustway.api.referentiel.VersionReferentielService;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.ExigenceDto;
import com.smartexsustway.api.resource.dto.ExigenceRequestDto;
import com.smartexsustway.api.resource.dto.PreuveAttendueDto;
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
 * Modification d'une exigence existante, par id, et ajout des preuves
 * qu'elle appelle en démonstration.
 *
 * Séparée d'ExigenceResource comme CritereModificationResource l'est de
 * CritereCreationResource : la création se fait sous le critère, la
 * modification par identifiant, et les deux chemins racines ne peuvent pas
 * cohabiter dans une même classe JAX-RS.
 *
 * Une exigence n'est jamais désactivée, elle est supprimée — mais seulement
 * dans un brouillon, où aucune mission ne s'y appuie. Dans une version
 * publiée, c'est l'immuabilité qui tient lieu d'historique.
 */
@Path("/api/v1/referentiels/exigences/{exigenceId}")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class ExigenceModificationResource {

    @Inject ExigenceRepository exigenceRepository;
    @Inject PreuveAttendueRepository preuveAttendueRepository;
    @Inject VersionReferentielService versionService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @PUT
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response modifier(@PathParam("exigenceId") UUID exigenceId,
                             @Valid ExigenceRequestDto requete) {
        Exigence exigence = trouverExigence(exigenceId);
        versionService.exigerVersionModifiable(exigence.getReferentielVersion());
        if (requete == null) {
            return erreur(400, "Corps de requête manquant");
        }

        if (requete.intitule() != null) {
            exigence.setIntitule(requete.intitule());
        }
        if (requete.enonce() != null) {
            exigence.setEnonce(requete.enonce());
            // Réécrire l'énoncé fait sortir l'exigence du contenu initial :
            // c'est précisément le travail que la marque signalait.
            if (exigence.getOrigine() == OrigineContenu.CONTENU_INITIAL) {
                exigence.setOrigine(OrigineContenu.CONTENU_HUMAIN);
            }
        }
        if (requete.ordre() != null) {
            exigence.setOrdre(requete.ordre());
        }

        auditLogService.journaliser(tenantContext.utilisateurCourantId(), null,
                "EXIGENCE_MODIFIEE", "exigence", exigence.getId());

        return Response.ok(ExigenceDto.depuis(exigence, preuvesAttendues(exigenceId))).build();
    }

    @DELETE
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response supprimer(@PathParam("exigenceId") UUID exigenceId) {
        Exigence exigence = trouverExigence(exigenceId);
        versionService.exigerVersionModifiable(exigence.getReferentielVersion());

        // Les preuves attendues et les règles de portée suivent par cascade
        // (V51, V52) : rien ne subsiste qui désignerait une exigence disparue.
        exigenceRepository.delete(exigence);

        auditLogService.journaliser(tenantContext.utilisateurCourantId(), null,
                "EXIGENCE_SUPPRIMEE", "exigence", exigenceId);

        return Response.noContent().build();
    }

    @POST
    @Path("/preuves-attendues")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response creerPreuveAttendue(@PathParam("exigenceId") UUID exigenceId,
                                        @Valid PreuveAttendueRequestDto.Creation requete) {
        Exigence exigence = trouverExigence(exigenceId);
        versionService.exigerVersionModifiable(exigence.getReferentielVersion());
        if (requete == null) {
            return erreur(400, "Corps de requête manquant");
        }

        TypePreuveAttendue type;
        try {
            type = requete.type() == null || requete.type().isBlank()
                    ? TypePreuveAttendue.AUTRE
                    : TypePreuveAttendue.valueOf(requete.type());
        } catch (IllegalArgumentException e) {
            return erreur(400, "Type de preuve attendue invalide : " + requete.type());
        }

        PreuveAttendue preuve = new PreuveAttendue(exigence, type, requete.libelle());
        preuve.setDescription(requete.description());
        preuve.setObligatoire(requete.obligatoire() == null || requete.obligatoire());
        preuve.setOrdre(requete.ordre() == null
                ? preuveAttendueRepository.parExigence(exigenceId).size() : requete.ordre());
        preuveAttendueRepository.persist(preuve);

        auditLogService.journaliser(tenantContext.utilisateurCourantId(), null,
                "PREUVE_ATTENDUE_CREEE", "preuve_attendue", preuve.getId());

        return Response.status(Response.Status.CREATED).entity(PreuveAttendueDto.depuis(preuve)).build();
    }

    private java.util.List<PreuveAttendueDto> preuvesAttendues(UUID exigenceId) {
        return preuveAttendueRepository.parExigence(exigenceId).stream()
                .map(PreuveAttendueDto::depuis).toList();
    }

    private Exigence trouverExigence(UUID exigenceId) {
        Exigence exigence = exigenceRepository.findById(exigenceId);
        if (exigence == null) {
            throw new NotFoundException("Exigence introuvable : " + exigenceId);
        }
        return exigence;
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}
