package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.enums.StatutUtilisateur;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.notification.EmailService;
import com.smartexsustway.api.resource.dto.ChangerMotDePasseRequest;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.ProfilUpdateRequest;
import com.smartexsustway.api.resource.dto.StatutUtilisateurRequest;
import com.smartexsustway.api.resource.dto.UtilisateurDto;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.security.JwtService;
import com.smartexsustway.api.security.PasswordService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.UUID;

@Path("/api/v1/utilisateurs")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class UtilisateurResource {

    @Inject
    UtilisateurRepository utilisateurRepository;

    @Inject
    PasswordService passwordService;

    @Inject
    TenantContext tenantContext;

    @Inject
    AutorisationService autorisationService;

    @Inject
    AuditLogService auditLogService;

    @Inject
    JwtService jwtService;

    @Inject
    EmailService emailService;

    @ConfigProperty(name = "smartex.frontend.base-url", defaultValue = "http://localhost:5173")
    String frontendBaseUrl;

    @GET
    @Path("/moi")
    public Response moi() {
        Utilisateur utilisateur = utilisateurRepository.findById(tenantContext.utilisateurCourantId());
        if (utilisateur == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(UtilisateurDto.depuis(utilisateur)).build();
    }

    /**
     * Profil & sécurité — chaque compte modifie ses propres informations,
     * quel que soit son rôle. Volontairement limité à nom/prénom/téléphone :
     * l'email n'est pas modifiable ici (RG36 le lie à la vérification du
     * compte), le mot de passe a son propre endpoint ({@link #changerMotDePasse}).
     */
    @PUT
    @Path("/moi")
    @Transactional
    public Response modifierProfil(@Valid ProfilUpdateRequest requete) {
        Utilisateur utilisateur = utilisateurRepository.findById(tenantContext.utilisateurCourantId());
        if (utilisateur == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        utilisateur.setNom(requete.nom());
        utilisateur.setPrenom(requete.prenom());
        utilisateur.setTelephone(requete.telephone());

        return Response.ok(UtilisateurDto.depuis(utilisateur)).build();
    }

    /**
     * Changement de mot de passe pour un compte déjà connecté — distinct du
     * mot de passe oublié (AuthResource, non authentifié) : ici, l'ancien
     * mot de passe est exigé pour prouver que la session n'a pas été volée.
     */
    @PUT
    @Path("/moi/mot-de-passe")
    @Transactional
    public Response changerMotDePasse(@Valid ChangerMotDePasseRequest requete) {
        Utilisateur utilisateur = utilisateurRepository.findById(tenantContext.utilisateurCourantId());
        if (utilisateur == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        if (!passwordService.verifier(requete.ancienMotDePasse(), utilisateur.getMotDePasseHash())) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new ErreurDto("Mot de passe actuel incorrect"))
                    .build();
        }

        utilisateur.setMotDePasseHash(passwordService.hacher(requete.nouveauMotDePasse()));

        return Response.noContent().build();
    }

    // === Administration d'un compte tiers (SUPER_ADMIN) ===================
    //
    // Les trois opérations qui suivent portent sur le compte d'autrui, ce que
    // rien ne permettait jusqu'ici. Elles partagent trois règles.
    //
    // 1. Le contrôle passe par AutorisationService, jamais par un test de rôle
    //    écrit ici. Et il porte sur un rôle de plateforme : depuis V76, un
    //    SUPER_ADMIN n'est rattaché à aucune organisation, demander « sur
    //    quelle entreprise » n'aurait pas de sens.
    //
    // 2. Chaque geste est journalisé. Administrer le compte d'un tiers doit
    //    laisser une trace nominative : sans elle, on ne saurait pas qui a
    //    suspendu qui, ni quand.
    //
    // 3. Aucune ne fixe ni ne révèle un mot de passe. Un administrateur qui
    //    choisirait le mot de passe d'un utilisateur pourrait se connecter à sa
    //    place, et les actions — validations d'évaluations, dépôts de preuves —
    //    seraient attribuées à cet utilisateur. Sur une plateforme dont chaque
    //    verdict doit être opposable, c'est inacceptable. D'où une
    //    réinitialisation que l'intéressé seul peut conclure.

    /**
     * Modifie les informations d'un autre compte.
     *
     * <p>Même périmètre que {@link #modifierProfil} — nom, prénom, téléphone —
     * et pour la même raison : l'email n'est pas modifiable, RG36 le liant à
     * la vérification du compte. Le rendre modifiable par un tiers reviendrait
     * à déplacer l'identité d'un compte sans repasser par cette vérification.
     */
    @PUT
    @Path("/{utilisateurId}")
    @Transactional
    public Response modifierUtilisateur(@PathParam("utilisateurId") UUID utilisateurId,
                                        @Valid ProfilUpdateRequest requete) {
        UUID auteurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerRoleDePlateforme(auteurId, AutorisationService.ROLES_GESTION_MEMBRES);

        Utilisateur cible = utilisateurRepository.findById(utilisateurId);
        if (cible == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(new ErreurDto("Compte introuvable")).build();
        }

        cible.setNom(requete.nom());
        cible.setPrenom(requete.prenom());
        cible.setTelephone(requete.telephone());

        auditLogService.journaliser(auteurId, null, "UTILISATEUR_MODIFIE", "utilisateur", cible.getId());
        return Response.ok(UtilisateurDto.depuis(cible)).build();
    }

    /**
     * Déclenche une réinitialisation de mot de passe pour un autre compte.
     *
     * <p>L'administrateur débloque, il ne choisit pas : le lien part vers
     * l'intéressé, qui seul fixera son mot de passe. Le mécanisme est celui de
     * {@code /auth/mot-de-passe-oublie} — même jeton, même page d'arrivée — et
     * n'est pas dupliqué ici.
     *
     * <p>Contrairement à la route publique, celle-ci dit franchement si le
     * compte existe : l'appelant est déjà administrateur et lit la liste des
     * comptes, l'anti-énumération n'aurait rien à protéger.
     */
    @POST
    @Path("/{utilisateurId}/reinitialisation")
    @Transactional
    public Response reinitialiserPourUtilisateur(@PathParam("utilisateurId") UUID utilisateurId) {
        UUID auteurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerRoleDePlateforme(auteurId, AutorisationService.ROLES_GESTION_MEMBRES);

        Utilisateur cible = utilisateurRepository.findById(utilisateurId);
        if (cible == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(new ErreurDto("Compte introuvable")).build();
        }

        String token = jwtService.genererTokenReinitialisationMotDePasse(cible.getId());
        String lien = frontendBaseUrl + "/reinitialiser-mot-de-passe?token=" + token;
        emailService.envoyerReinitialisationMotDePasse(cible.getEmail(), cible.getPrenom(), lien);

        auditLogService.journaliser(auteurId, null, "REINITIALISATION_DECLENCHEE", "utilisateur", cible.getId());
        return Response.noContent().build();
    }

    /**
     * Suspend ou réactive un compte.
     *
     * <p>Seuls {@code ACTIF} et {@code SUSPENDU} sont acceptés.
     * {@code EN_ATTENTE_VERIFICATION} appartient au parcours d'inscription et
     * {@code DESACTIVE} est un état terminal : les poser à la main depuis
     * l'administration reviendrait à court-circuiter RG36 pour le premier, et
     * à supprimer un compte sans le dire pour le second.
     *
     * <p>Un administrateur ne peut pas se suspendre lui-même : il se
     * retirerait l'accès qui lui permettrait de revenir en arrière — et sur
     * une base où il est le seul SUPER_ADMIN, la plateforme se retrouverait
     * sans administrateur, sans autre issue qu'une écriture directe en base.
     */
    @PUT
    @Path("/{utilisateurId}/statut")
    @Transactional
    public Response changerStatut(@PathParam("utilisateurId") UUID utilisateurId,
                                  @Valid StatutUtilisateurRequest requete) {
        UUID auteurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerRoleDePlateforme(auteurId, AutorisationService.ROLES_GESTION_MEMBRES);

        if (auteurId.equals(utilisateurId)) {
            return Response.status(Response.Status.CONFLICT)
                    .entity(new ErreurDto("Vous ne pouvez pas changer le statut de votre propre compte")).build();
        }

        StatutUtilisateur cible;
        try {
            cible = StatutUtilisateur.valueOf(requete.statut());
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new ErreurDto("Statut inconnu : " + requete.statut())).build();
        }
        if (cible != StatutUtilisateur.ACTIF && cible != StatutUtilisateur.SUSPENDU) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new ErreurDto("Seuls ACTIF et SUSPENDU peuvent être posés depuis l'administration"))
                    .build();
        }

        Utilisateur compte = utilisateurRepository.findById(utilisateurId);
        if (compte == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(new ErreurDto("Compte introuvable")).build();
        }

        compte.setStatut(cible);
        auditLogService.journaliser(auteurId, null,
                cible == StatutUtilisateur.SUSPENDU ? "UTILISATEUR_SUSPENDU" : "UTILISATEUR_REACTIVE",
                "utilisateur", compte.getId());
        return Response.ok(UtilisateurDto.depuis(compte)).build();
    }
}
