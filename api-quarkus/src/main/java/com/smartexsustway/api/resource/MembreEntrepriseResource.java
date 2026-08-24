package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Entreprise;
import com.smartexsustway.api.domain.entity.Invitation;
import com.smartexsustway.api.domain.entity.Role;
import com.smartexsustway.api.domain.entity.Site;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
import com.smartexsustway.api.domain.enums.StatutGenerique;
import com.smartexsustway.api.domain.enums.StatutInvitation;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.InvitationRepository;
import com.smartexsustway.api.domain.repository.RoleRepository;
import com.smartexsustway.api.domain.repository.SiteRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.notification.EmailService;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.InvitationDto;
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
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.Set;
import java.util.UUID;

/**
 * RG05 — utilisateurs rattachés à une entreprise et rôle porté par chacun.
 *
 * Deux cas selon que le collaborateur possède déjà un compte Smartex
 * Sustway : {@link #ajouter} le rattache directement s'il existe, sinon
 * bascule sur {@link #inviter} — une invitation par e-mail portant le
 * rôle/site choisis à l'avance, appliqués automatiquement à l'acceptation
 * (voir Invitation, InvitationResource).
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
     *
     * EMPLOYE retiré (décision produit) : dans cette première version, seul
     * le responsable de l'entreprise est audité — un rôle "collaborateur"
     * distinct pourra revenir dans une version ultérieure si pertinent. Le
     * rôle EMPLOYE lui-même n'est pas supprimé en base (voir V15, permission
     * preuve:deposer/rapport:consulter) pour ne pas casser les rattachements
     * déjà existants ni compliquer sa réintroduction.
     */
    private static final Set<String> ROLES_ATTRIBUABLES =
            Set.of("RESPONSABLE_ENTREPRISE", "VISITEUR");

    private static final int DUREE_VALIDITE_INVITATION_JOURS = 7;

    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject SiteRepository siteRepository;
    @Inject RoleRepository roleRepository;
    @Inject InvitationRepository invitationRepository;
    @Inject EmailService emailService;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @ConfigProperty(name = "smartex.frontend.base-url", defaultValue = "http://localhost:5173")
    String frontendBaseUrl;

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

        var collaborateurExistant = utilisateurRepository.parEmail(requete.email());
        if (collaborateurExistant.isEmpty()) {
            return inviter(entreprise, requete);
        }
        Utilisateur collaborateur = collaborateurExistant.get();

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

    @GET
    @Path("/invitations")
    @Transactional
    public Response listerInvitations(@PathParam("entrepriseId") UUID entrepriseId) {
        exigerAdministrationDesAcces(entrepriseId);

        var invitations = invitationRepository.enAttenteParEntreprise(entrepriseId).stream()
                .map(InvitationDto::depuis)
                .toList();
        return Response.ok(invitations).build();
    }

    @DELETE
    @Path("/invitations/{invitationId}")
    @Transactional
    public Response revoquerInvitation(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("invitationId") UUID invitationId) {
        UUID utilisateurId = exigerAdministrationDesAcces(entrepriseId);

        Invitation invitation = invitationRepository.findByIdOptional(invitationId)
                .filter(i -> i.getEntreprise().getId().equals(entrepriseId))
                .orElseThrow(() -> new NotFoundException("Invitation introuvable pour cette entreprise : " + invitationId));

        invitation.setStatut(StatutInvitation.REVOQUEE);
        auditLogService.journaliser(utilisateurId, entrepriseId, "INVITATION_REVOQUEE", "invitation", invitationId);

        return Response.noContent().build();
    }

    /**
     * Le collaborateur n'a pas encore de compte : on fige le rôle/site
     * choisis dans une invitation plutôt que d'échouer en 404 comme avant
     * (le responsable devait alors demander à l'intéressé de s'inscrire
     * d'abord, puis relancer l'ajout).
     */
    private Response inviter(Entreprise entreprise, MembreCreateRequest requete) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();

        if (invitationRepository.invitationEnAttenteExiste(entreprise.getId(), requete.email())) {
            return Response.status(Response.Status.CONFLICT)
                    .entity(new ErreurDto("Une invitation est déjà en attente pour cet e-mail sur cette entreprise"))
                    .build();
        }

        Role role = trouverRoleAttribuable(requete.roleCode());
        Site site = requete.siteId() == null ? null : trouverSiteDeLEntreprise(entreprise.getId(), requete.siteId());
        Utilisateur invitePar = utilisateurRepository.findById(utilisateurId);

        String token = genererTokenInvitation();
        Invitation invitation = new Invitation(entreprise, requete.email(), role, site, token, invitePar,
                OffsetDateTime.now().plusDays(DUREE_VALIDITE_INVITATION_JOURS));
        invitationRepository.persist(invitation);

        String lien = frontendBaseUrl + "/invitation/" + token;
        emailService.envoyerInvitationEntreprise(requete.email(), entreprise.getRaisonSociale(), role.getNom(), lien);

        auditLogService.journaliser(utilisateurId, entreprise.getId(), "INVITATION_ENVOYEE", "invitation", invitation.getId());

        return Response.status(Response.Status.ACCEPTED).entity(InvitationDto.depuis(invitation)).build();
    }

    private static String genererTokenInvitation() {
        byte[] octets = new byte[32];
        new SecureRandom().nextBytes(octets);
        return HexFormat.of().formatHex(octets);
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
