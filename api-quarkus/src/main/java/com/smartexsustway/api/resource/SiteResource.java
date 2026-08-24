package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Entreprise;
import com.smartexsustway.api.domain.entity.Pays;
import com.smartexsustway.api.domain.entity.Site;
import com.smartexsustway.api.domain.enums.StatutGenerique;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.PaysRepository;
import com.smartexsustway.api.domain.repository.SiteRepository;
import com.smartexsustway.api.resource.dto.SiteDto;
import com.smartexsustway.api.resource.dto.SiteRequest;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.UUID;

/**
 * RG04 : une entreprise peut posséder plusieurs sites.
 * Imbriquée sous /entreprises/{entrepriseId} plutôt qu'exposée à plat : un
 * site n'a de sens qu'associé à une entreprise, et ça permet de vérifier
 * l'isolation multi-tenant une seule fois en tête de chaque méthode, dans
 * le même style que EntrepriseResource.
 *
 * Suppression = désactivation (statut ARCHIVE), jamais de DELETE physique :
 * un site peut déjà être référencé par des missions d'audit (AUDIT_SITE),
 * et l'exigence de traçabilité du CDC (§1.4) va à l'encontre d'une perte
 * d'historique silencieuse.
 */
@Path("/api/v1/entreprises/{entrepriseId}/sites")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class SiteResource {

    @Inject EntrepriseRepository entrepriseRepository;
    @Inject SiteRepository siteRepository;
    @Inject PaysRepository paysRepository;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @GET
    public Response lister(@PathParam("entrepriseId") UUID entrepriseId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);

        var sites = siteRepository.parEntreprise(entrepriseId).stream().map(SiteDto::depuis).toList();
        return Response.ok(sites).build();
    }

    @GET
    @Path("/{siteId}")
    public Response detail(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("siteId") UUID siteId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);

        Site site = trouverSiteDeLEntreprise(entrepriseId, siteId);
        return Response.ok(SiteDto.depuis(site)).build();
    }

    @POST
    @Transactional
    public Response creer(@PathParam("entrepriseId") UUID entrepriseId, @Valid SiteRequest requete) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);

        Entreprise entreprise = entrepriseRepository.findById(entrepriseId);
        if (entreprise == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        Pays pays = paysRepository.parCodeIso2(requete.paysCodeIso2())
                .orElseThrow(() -> new BadRequestException("Pays inconnu : " + requete.paysCodeIso2()));

        Site site = new Site(entreprise, pays, requete.nom());
        site.setAdresse(requete.adresse());
        site.setVille(requete.ville());
        site.setCodePostal(requete.codePostal());
        siteRepository.persist(site);

        auditLogService.journaliser(utilisateurId, entrepriseId, "SITE_CREE", "site", site.getId());

        return Response.status(Response.Status.CREATED).entity(SiteDto.depuis(site)).build();
    }

    @PUT
    @Path("/{siteId}")
    @Transactional
    public Response modifier(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("siteId") UUID siteId,
                              @Valid SiteRequest requete) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);

        Site site = trouverSiteDeLEntreprise(entrepriseId, siteId);
        Pays pays = paysRepository.parCodeIso2(requete.paysCodeIso2())
                .orElseThrow(() -> new BadRequestException("Pays inconnu : " + requete.paysCodeIso2()));

        site.setNom(requete.nom());
        site.setAdresse(requete.adresse());
        site.setVille(requete.ville());
        site.setCodePostal(requete.codePostal());
        site.setPays(pays);

        auditLogService.journaliser(utilisateurId, entrepriseId, "SITE_MODIFIE", "site", site.getId());

        return Response.ok(SiteDto.depuis(site)).build();
    }

    @DELETE
    @Path("/{siteId}")
    @Transactional
    public Response desactiver(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("siteId") UUID siteId) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);

        Site site = trouverSiteDeLEntreprise(entrepriseId, siteId);
        site.setStatut(StatutGenerique.ARCHIVE);

        auditLogService.journaliser(utilisateurId, entrepriseId, "SITE_DESACTIVE", "site", site.getId());

        return Response.noContent().build();
    }

    /**
     * Symétrique de {@link #desactiver} — sans ça, un site archivé par
     * erreur n'a aucun chemin de retour hors intervention manuelle en base.
     * {@code @Consumes(WILDCARD)} : ne consomme aucun corps, contrairement
     * au reste de la ressource (@Consumes JSON porté par la classe) — sans
     * ce override, un appel sans en-tête Content-Type est rejeté en 415
     * avant même d'atteindre la méthode.
     */
    @POST
    @Path("/{siteId}/reactivation")
    @Consumes(MediaType.WILDCARD)
    @Transactional
    public Response reactiver(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("siteId") UUID siteId) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);

        Site site = trouverSiteDeLEntreprise(entrepriseId, siteId);
        site.setStatut(StatutGenerique.ACTIF);

        auditLogService.journaliser(utilisateurId, entrepriseId, "SITE_REACTIVE", "site", site.getId());

        return Response.ok(SiteDto.depuis(site)).build();
    }

    /**
     * Charge le site et vérifie qu'il appartient bien à l'entreprise du
     * chemin — sans ce contrôle, un utilisateur rattaché à l'entreprise A
     * pourrait accéder au site d'une entreprise B en devinant son UUID
     * (l'appartenance à A ne suffit pas, il faut aussi que le site soit
     * réellement celui de A).
     */
    private Site trouverSiteDeLEntreprise(UUID entrepriseId, UUID siteId) {
        Site site = siteRepository.findById(siteId);
        if (site == null || !site.getEntreprise().getId().equals(entrepriseId)) {
            throw new jakarta.ws.rs.NotFoundException("Site introuvable pour cette entreprise");
        }
        return site;
    }
}
