package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Invitation;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
import com.smartexsustway.api.domain.enums.StatutInvitation;
import com.smartexsustway.api.domain.repository.InvitationRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.dto.AccepterInvitationRequest;
import com.smartexsustway.api.resource.dto.ConnexionResponse;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.InvitationDto;
import com.smartexsustway.api.security.JwtService;
import com.smartexsustway.api.security.PasswordService;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/**
 * RG05 — acceptation d'une invitation par un collaborateur qui ne possède
 * pas encore de compte. Ressource publique (pas d'authentification) : le
 * token dans l'URL en tient lieu, comme pour la vérification d'email.
 * Voir Invitation, MembreEntrepriseResource (émission de l'invitation).
 */
@Path("/api/v1/invitations")
@Produces(MediaType.APPLICATION_JSON)
public class InvitationResource {

    @Inject InvitationRepository invitationRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject PasswordService passwordService;
    @Inject JwtService jwtService;
    @Inject AuditLogService auditLogService;

    @GET
    @Path("/{token}")
    public Response detail(@PathParam("token") String token) {
        Invitation invitation = trouverInvitation(token);
        return Response.ok(InvitationDto.depuis(invitation)).build();
    }

    @POST
    @Path("/{token}/accepter")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response accepter(@PathParam("token") String token, @Valid AccepterInvitationRequest requete) {
        Invitation invitation = trouverInvitation(token);
        if (!invitation.estValide()) {
            return erreur(410, "Cette invitation n'est plus valable (déjà acceptée, révoquée ou expirée)");
        }

        // Cas limite : un compte a pu être créé sur cet e-mail entre l'envoi
        // de l'invitation et son acceptation (ex. inscription indépendante).
        if (utilisateurRepository.emailExiste(invitation.getEmail())) {
            return erreur(409, "Un compte existe déjà avec cet e-mail — connectez-vous, puis demandez à nouveau l'accès si besoin");
        }

        String hash = passwordService.hacher(requete.motDePasse());
        Utilisateur utilisateur = new Utilisateur(requete.nom(), requete.prenom(), invitation.getEmail(), hash);
        // L'invitation a été reçue à cette adresse : elle vaut preuve de
        // possession, au même titre qu'un clic sur le lien de vérification
        // (RG36) — pas de double vérification à faire subir à l'invité.
        utilisateur.marquerEmailVerifie();
        utilisateurRepository.persist(utilisateur);

        UtilisateurEntreprise rattachement = new UtilisateurEntreprise(
                utilisateur, invitation.getEntreprise(), invitation.getSite(), invitation.getRole());
        utilisateurEntrepriseRepository.persist(rattachement);

        invitation.setStatut(StatutInvitation.ACCEPTEE);

        auditLogService.journaliser(utilisateur.getId(), invitation.getEntreprise().getId(),
                "INVITATION_ACCEPTEE", "invitation", invitation.getId());

        String jeton = jwtService.genererToken(utilisateur, invitation.getRole().getCode(), invitation.getEntreprise().getId().toString());
        return Response.ok(ConnexionResponse.session(jeton)).build();
    }

    private Invitation trouverInvitation(String token) {
        return invitationRepository.parToken(token)
                .orElseThrow(() -> new NotFoundException("Invitation introuvable"));
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}
