package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.RegleAnalyse;
import com.smartexsustway.api.domain.enums.NiveauCriticite;
import com.smartexsustway.api.domain.enums.TypeRegleAnalyse;
import com.smartexsustway.api.domain.repository.RegleAnalyseRepository;
import com.smartexsustway.api.referentiel.RegleAnalyseValidation;
import com.smartexsustway.api.referentiel.ValidationContenuImporteService;
import com.smartexsustway.api.referentiel.VersionReferentielService;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.RegleAnalyseDto;
import com.smartexsustway.api.resource.dto.RejetContenuRequestDto;
import com.smartexsustway.api.resource.dto.ValidationContenuRequestDto;
import com.smartexsustway.api.resource.dto.RegleAnalyseRequestDto;
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

import java.util.Map;
import java.util.UUID;

/**
 * Modification d'une règle d'analyse existante, par id.
 *
 * La portée d'une règle ne se change pas ici : la déplacer d'une exigence à
 * une autre reviendrait à en faire une autre règle, et la supprimer pour la
 * recréer dit plus clairement ce qui se passe. Seuls le type, le libellé,
 * la sévérité, la définition et l'ordre évoluent.
 */
@Path("/api/v1/referentiels/regles/{regleId}")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class RegleAnalyseModificationResource {

    @Inject RegleAnalyseRepository regleAnalyseRepository;
    @Inject VersionReferentielService versionService;
    @Inject ValidationContenuImporteService validationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @PUT
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response modifier(@PathParam("regleId") UUID regleId, @Valid RegleAnalyseRequestDto requete) {
        RegleAnalyse regle = trouver(regleId);
        versionService.exigerVersionModifiable(regle.getReferentielVersion());
        if (requete == null) {
            return erreur(400, "Corps de requête manquant");
        }

        TypeRegleAnalyse type = regle.getType();
        if (requete.type() != null) {
            try {
                type = TypeRegleAnalyse.valueOf(requete.type());
            } catch (IllegalArgumentException e) {
                return erreur(400, "Type de règle invalide : " + requete.type());
            }
        }

        // La définition est validée contre le type effectif après
        // modification : changer le type sans revoir la définition
        // laisserait une règle que le service d'agents ne saurait pas rendre.
        Map<String, Object> definition = requete.definition() == null
                ? regle.getDefinition() : requete.definition();
        try {
            RegleAnalyseValidation.verifier(type, definition);
        } catch (RegleAnalyseValidation.DefinitionInvalideException e) {
            return erreur(400, e.getMessage());
        }

        regle.setType(type);
        regle.setDefinition(definition);
        if (requete.libelle() != null) {
            regle.setLibelle(requete.libelle());
        }
        if (requete.ordre() != null) {
            regle.setOrdre(requete.ordre());
        }
        if (requete.severite() != null && !requete.severite().isBlank()) {
            try {
                regle.setSeverite(NiveauCriticite.valueOf(requete.severite()));
            } catch (IllegalArgumentException e) {
                return erreur(400, "Sévérité invalide : " + requete.severite());
            }
        }

        auditLogService.journaliser(tenantContext.utilisateurCourantId(), null,
                "REGLE_ANALYSE_MODIFIEE", "regle_analyse", regle.getId());

        return Response.ok(RegleAnalyseDto.depuis(regle)).build();
    }

    @DELETE
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response supprimer(@PathParam("regleId") UUID regleId) {
        RegleAnalyse regle = trouver(regleId);
        versionService.exigerVersionModifiable(regle.getReferentielVersion());
        regleAnalyseRepository.delete(regle);

        auditLogService.journaliser(tenantContext.utilisateurCourantId(), null,
                "REGLE_ANALYSE_SUPPRIMEE", "regle_analyse", regleId);

        return Response.noContent().build();
    }

    /**
     * Accepte une règle d'analyse proposée par un import assisté.
     *
     * Voir ExigenceModificationResource.valider : même opération, même
     * garanties, sur la portée la plus fine du contenu importé.
     */
    @POST
    @Path("/validation")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed("SUPER_ADMIN")
    public Response valider(@PathParam("regleId") UUID regleId,
                            ValidationContenuRequestDto requete) {
        RegleAnalyse regle = trouver(regleId);
        try {
            validationService.validerRegle(regle,
                    ValidationContenuRequestDto.versionAttendue(requete),
                    tenantContext.utilisateurCourantId());
        } catch (ValidationContenuImporteService.ValidationRefuseeException e) {
            return erreur(e.statutHttp(), e.getMessage());
        }
        return Response.ok(RegleAnalyseDto.depuis(regle)).build();
    }

    /**
     * Écarte une règle d'analyse proposée par un import assisté.
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
    public Response rejeter(@PathParam("regleId") UUID regleId,
                            @Valid RejetContenuRequestDto requete) {
        RegleAnalyse regle = trouver(regleId);
        try {
            validationService.rejeterRegle(regle,
                    RejetContenuRequestDto.versionAttendue(requete),
                    RejetContenuRequestDto.motif(requete),
                    tenantContext.utilisateurCourantId());
        } catch (ValidationContenuImporteService.ValidationRefuseeException e) {
            return erreur(e.statutHttp(), e.getMessage());
        }
        return Response.ok(RegleAnalyseDto.depuis(regle)).build();
    }

    private RegleAnalyse trouver(UUID regleId) {
        RegleAnalyse regle = regleAnalyseRepository.findById(regleId);
        if (regle == null) {
            throw new NotFoundException("Règle d'analyse introuvable : " + regleId);
        }
        return regle;
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}
