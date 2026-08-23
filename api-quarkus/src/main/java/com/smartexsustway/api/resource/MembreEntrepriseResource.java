package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Entreprise;
import com.smartexsustway.api.domain.entity.Role;
import com.smartexsustway.api.domain.entity.Site;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
import com.smartexsustway.api.domain.enums.StatutGenerique;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.RoleRepository;
import com.smartexsustway.api.domain.repository.SiteRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.MembreCreateRequest;
import com.smartexsustway.api.resource.dto.MembreEntrepriseDto;
import com.smartexsustway.api.resource.dto.MembreUpdateRequest;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.Set;
import java.util.UUID;

/**
 * RG05 — utilisateurs rattachés à une entreprise et rôle porté par chacun.
 *
 * Le rattachement se fait sur un compte déjà inscrit, désigné par son
 * e-mail : l'entreprise accorde un accès, elle ne crée pas de compte à la
 * place de l'intéressé (pas d'e-mail d'invitation à ce stade).
 *
 * Retirer un accès le passe en INACTIF plutôt que de le supprimer : les
 * dépôts de preuves et évaluations déjà réalisés par ce collaborateur
 * restent rattachables à lui (traçabilité CDC §1.4).
 *
 * {@code @Transactional} est nécessaire même en lecture : le DTO lit la
 * collection {@code role.permissions}, chargée en LAZY.
 */
@Path("/api/v1/entreprises/{entrepriseId}/membres")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class MembreEntrepriseResource {

    /**
     * Rôles qu'une entreprise cliente peut attribuer elle-même : les rôles
     * internes Smartex (SUPER_ADMIN, ADMIN_AUDIT, EXPERT_REVIEWER) auditent
     * au nom de Smartex et ne s'accordent pas depuis un espace client.
     */
    private static final Set<String> ROLES_ATTRIBUABLES =
            Set.of("RESPONSABLE_ENTREPRISE", "EMPLOYE", "VISITEUR");

    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject SiteRepository siteRepository;
    @Inject RoleRepository roleRepository;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @GET
    @Transactional
    public Response lister(@PathParam("entrepriseId") UUID entrepriseId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);

        var membres = utilisateurEntrepriseRepository.parEntreprise(entrepriseId).stream()
                .map(MembreEntrepriseDto::depuis)
                .toList();
        return Response.ok(membres).build();
    }

    @POST
    @Transactional
    public Response ajouter(@PathParam("entrepriseId") UUID entrepriseId, @Valid MembreCreateRequest requete) {
        UUID utilisateurId = exigerAdministrationDesAcces(entrepriseId);

        Entreprise entreprise = entrepriseRepository.findById(entrepriseId);
        if (entreprise == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        Utilisateur collaborateur = utilisateurRepository.parEmail(requete.email())
                .orElseThrow(() -> new NotFoundException(
                        "Aucun compte Smartex Sustway avec l'e-mail " + requete.email()
                                + " — le collaborateur doit d'abord s'inscrire."));

        boolean dejaRattache = !utilisateurEntrepriseRepository
                .actifsParUtilisateurEtEntreprise(collaborateur.getId(), entrepriseId).isEmpty();
        if (dejaRattache) {
            return Response.status(Response.Status.CONFLICT)
                    .entity(new ErreurDto("Ce collaborateur a déjà un accès actif à cette entreprise"))
                    .build();
        }

        Role role = trouverRoleAttribuable(requete.roleCode());
        Site site = requete.siteId() == null ? null : trouverSiteDeLEntreprise(entrepriseId, requete.siteId());

        // Un accès révoqué est réactivé plutôt que dupliqué : les index
        // d'unicité partielle de utilisateur_entreprise (avec/sans site)
        // rejetteraient une seconde ligne pour le même périmètre.
        UtilisateurEntreprise rattachement = utilisateurEntrepriseRepository
                .revoqueParUtilisateurEtPerimetre(collaborateur.getId(), entrepriseId, requete.siteId())
                .orElseGet(() -> {
                    var nouveau = new UtilisateurEntreprise(collaborateur, entreprise, site, role);
                    utilisateurEntrepriseRepository.persist(nouveau);
                    return nouveau;
                });
        rattachement.setRole(role);
        rattachement.setStatut(StatutGenerique.ACTIF);

        auditLogService.journaliser(utilisateurId, entrepriseId, "ACCES_ACCORDE", "utilisateur_entreprise",
                rattachement.getId());

        return Response.status(Response.Status.CREATED).entity(MembreEntrepriseDto.depuis(rattachement)).build();
    }

    @PUT
    @Path("/{membreId}")
    @Transactional
    public Response modifier(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("membreId") UUID membreId,
                             @Valid MembreUpdateRequest requete) {
        UUID utilisateurId = exigerAdministrationDesAcces(entrepriseId);

        UtilisateurEntreprise rattachement = trouverRattachementDeLEntreprise(entrepriseId, membreId);
        exigerRattachementDUnTiers(rattachement, utilisateurId,
                "Vous ne pouvez pas modifier votre propre rôle sur cette entreprise");

        rattachement.setRole(trouverRoleAttribuable(requete.roleCode()));
        rattachement.setSite(
                requete.siteId() == null ? null : trouverSiteDeLEntreprise(entrepriseId, requete.siteId()));

        auditLogService.journaliser(utilisateurId, entrepriseId, "ACCES_MODIFIE", "utilisateur_entreprise", membreId);

        return Response.ok(MembreEntrepriseDto.depuis(rattachement)).build();
    }

    @DELETE
    @Path("/{membreId}")
    @Transactional
    public Response revoquer(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("membreId") UUID membreId) {
        UUID utilisateurId = exigerAdministrationDesAcces(entrepriseId);

        UtilisateurEntreprise rattachement = trouverRattachementDeLEntreprise(entrepriseId, membreId);
        exigerRattachementDUnTiers(rattachement, utilisateurId,
                "Vous ne pouvez pas retirer votre propre accès à cette entreprise");

        rattachement.setStatut(StatutGenerique.INACTIF);

        auditLogService.journaliser(utilisateurId, entrepriseId, "ACCES_REVOQUE", "utilisateur_entreprise", membreId);

        return Response.noContent().build();
    }

    private UUID exigerAdministrationDesAcces(UUID entrepriseId) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        autorisationService.exigerRoleSurEntreprise(
                utilisateurId, entrepriseId, AutorisationService.ROLES_ADMINISTRATION_ENTREPRISE);
        return utilisateurId;
    }

    /**
     * Empêche un responsable de se dégrader ou de se retirer lui-même :
     * l'entreprise se retrouverait sans administrateur, sans moyen de
     * rétablir un accès depuis l'application.
     */
    private void exigerRattachementDUnTiers(UtilisateurEntreprise rattachement, UUID utilisateurId, String message) {
        if (rattachement.getUtilisateur().getId().equals(utilisateurId)) {
            throw new ForbiddenException(message);
        }
    }

    private Role trouverRoleAttribuable(String roleCode) {
        if (!ROLES_ATTRIBUABLES.contains(roleCode)) {
            throw new BadRequestException(
                    "Rôle non attribuable depuis un espace entreprise : " + roleCode + " (attendu " + ROLES_ATTRIBUABLES + ")");
        }
        return roleRepository.parCode(roleCode)
                .orElseThrow(() -> new IllegalStateException("Rôle " + roleCode + " absent — vérifier les seeds"));
    }

    /**
     * Charge le rattachement et vérifie qu'il concerne bien l'entreprise du
     * chemin : sans ce contrôle, un responsable pourrait révoquer l'accès
     * d'un collaborateur d'une autre entreprise en devinant son UUID.
     */
    private UtilisateurEntreprise trouverRattachementDeLEntreprise(UUID entrepriseId, UUID membreId) {
        UtilisateurEntreprise rattachement = utilisateurEntrepriseRepository.findById(membreId);
        if (rattachement == null || !rattachement.getEntreprise().getId().equals(entrepriseId)) {
            throw new NotFoundException("Accès introuvable pour cette entreprise : " + membreId);
        }
        return rattachement;
    }

    private Site trouverSiteDeLEntreprise(UUID entrepriseId, UUID siteId) {
        Site site = siteRepository.findById(siteId);
        if (site == null || !site.getEntreprise().getId().equals(entrepriseId)) {
            throw new BadRequestException("Site introuvable pour cette entreprise : " + siteId);
        }
        return site;
    }
}
