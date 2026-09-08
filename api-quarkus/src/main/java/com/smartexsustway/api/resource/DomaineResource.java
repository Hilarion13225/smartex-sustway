package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Domaine;
import com.smartexsustway.api.domain.entity.Referentiel;
import com.smartexsustway.api.domain.repository.DomaineRepository;
import com.smartexsustway.api.domain.repository.ReferentielRepository;
import com.smartexsustway.api.resource.dto.DomaineCreateRequestDto;
import com.smartexsustway.api.resource.dto.DomaineDto;
import com.smartexsustway.api.resource.dto.DomaineUpdateRequestDto;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.referentiel.VersionReferentielService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/**
 * RG08 (module 4, back-office) : gestion des domaines d'un référentiel.
 * Lecture ouverte à tout utilisateur authentifié, écriture réservée à
 * SUPER_ADMIN — voir ReferentielResource pour la justification de
 * l'absence de DELETE (RG14, historique des audits).
 */
@Path("/api/v1/referentiels/{referentielCode}/domaines")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class DomaineResource {

    @Inject ReferentielRepository referentielRepository;
    @Inject DomaineRepository domaineRepository;
    @Inject VersionReferentielService versionService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @GET
    public Response lister(@PathParam("referentielCode") String referentielCode) {
        Referentiel referentiel = trouverReferentiel(referentielCode);
        // Contenu de la version de travail : brouillon s'il y en a un, sinon
        // version publiée. Lire par référentiel renverrait les domaines de
        // toutes les versions confondues.
        var version = versionService.versionDeTravail(referentiel);
        var domaines = domaineRepository.parVersion(version.getId()).stream().map(DomaineDto::depuis).toList();
        return Response.ok(domaines).build();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed({"SUPER_ADMIN", "ADMIN_AUDIT"})
    public Response creer(@PathParam("referentielCode") String referentielCode, DomaineCreateRequestDto requete) {
        Referentiel referentiel = trouverReferentiel(referentielCode);
        if (requete == null) {
            return erreur(400, "Corps de requête manquant");
        }
        // L'écriture ne porte que sur un brouillon : ajouter un domaine à
        // une version publiée changerait ce que des missions ont audité.
        var brouillon = versionService.brouillonPourEcriture(referentiel);
        if (domaineRepository.parVersionEtCode(brouillon.getId(), requete.code()).isPresent()) {
            return erreur(409, "Un domaine avec le code '" + requete.code() + "' existe déjà pour cette version");
        }

        Domaine domaine = new Domaine(brouillon, requete.code(), requete.nom());
        domaine.setDescription(requete.description());
        if (requete.ordre() != null) {
            domaine.setOrdre(requete.ordre());
        }
        domaineRepository.persist(domaine);

        auditLogService.journaliser(tenantContext.utilisateurCourantId(), null,
                "DOMAINE_CREE", "domaine", domaine.getId());

        return Response.status(Response.Status.CREATED).entity(DomaineDto.depuis(domaine)).build();
    }

    @PUT
    @Path("/{domaineCode}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    @RolesAllowed({"SUPER_ADMIN", "ADMIN_AUDIT"})
    public Response modifier(@PathParam("referentielCode") String referentielCode,
                              @PathParam("domaineCode") String domaineCode, DomaineUpdateRequestDto requete) {
        Referentiel referentiel = trouverReferentiel(referentielCode);
        Domaine domaine = domaineRepository
                .parVersionEtCode(versionService.versionDeTravail(referentiel).getId(), domaineCode)
                .orElseThrow(() -> new NotFoundException("Domaine inconnu : " + domaineCode));
        versionService.exigerVersionModifiable(domaine.getReferentielVersion());
        if (requete == null) {
            return erreur(400, "Corps de requête manquant");
        }

        if (requete.nom() != null) {
            domaine.setNom(requete.nom());
        }
        if (requete.description() != null) {
            domaine.setDescription(requete.description());
        }
        if (requete.ordre() != null) {
            domaine.setOrdre(requete.ordre());
        }

        auditLogService.journaliser(tenantContext.utilisateurCourantId(), null,
                "DOMAINE_MODIFIE", "domaine", domaine.getId());

        return Response.ok(DomaineDto.depuis(domaine)).build();
    }

    private Referentiel trouverReferentiel(String code) {
        return referentielRepository.parCode(code)
                .orElseThrow(() -> new NotFoundException("Référentiel inconnu : " + code));
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}
