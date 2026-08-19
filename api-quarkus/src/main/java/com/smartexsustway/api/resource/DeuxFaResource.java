package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.enums.MethodeDeuxFa;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.dto.CodeRequest;
import com.smartexsustway.api.resource.dto.ConfirmerSmsRequest;
import com.smartexsustway.api.resource.dto.DeuxFaAppDemarrerResponse;
import com.smartexsustway.api.resource.dto.DeuxFaSmsDemarrerResponse;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.TelephoneRequest;
import com.smartexsustway.api.resource.dto.UtilisateurDto;
import com.smartexsustway.api.security.CodeNumeriqueGenerator;
import com.smartexsustway.api.security.JwtService;
import com.smartexsustway.api.security.PasswordService;
import com.smartexsustway.api.security.TotpService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;

import java.util.UUID;

/**
 * Gestion de la 2FA optionnelle (RG36, CDC §5.4 : "code par SMS ou
 * application d'authentification, au choix de l'utilisateur").
 *
 * Activation en deux temps pour les deux méthodes (démarrer/confirmer) :
 * on ne bascule jamais deuxfa_active à true tant que l'utilisateur n'a pas
 * prouvé, en soumettant un code correct, qu'il a bien accès au second
 * facteur — sinon un utilisateur pourrait se verrouiller lui-même hors de
 * son compte en activant une 2FA mal configurée (secret non scanné,
 * mauvais numéro de téléphone...).
 */
@Path("/api/v1/auth/2fa")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class DeuxFaResource {

    private static final Logger LOG = Logger.getLogger(DeuxFaResource.class);

    @Inject UtilisateurRepository utilisateurRepository;
    @Inject TotpService totpService;
    @Inject PasswordService passwordService;
    @Inject JwtService jwtService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    // --- Méthode APP (TOTP) ----------------------------------------------

    @POST
    @Path("/app/demarrer")
    @Transactional
    public Response demarrerApp() {
        Utilisateur utilisateur = utilisateurCourant();
        String secret = totpService.genererSecret();
        utilisateur.demarrerActivationDeuxFa(MethodeDeuxFa.APP, secret);

        String uri = totpService.uriProvisionnement(utilisateur.getEmail(), secret);
        return Response.ok(new DeuxFaAppDemarrerResponse(secret, uri)).build();
    }

    @POST
    @Path("/app/confirmer")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response confirmerApp(@Valid CodeRequest requete) {
        Utilisateur utilisateur = utilisateurCourant();

        if (utilisateur.getDeuxfaMethode() != MethodeDeuxFa.APP || utilisateur.getDeuxfaSecret() == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new ErreurDto("Aucune activation de 2FA application en cours — appelez d'abord /app/demarrer"))
                    .build();
        }
        if (!totpService.verifier(utilisateur.getDeuxfaSecret(), requete.code())) {
            return Response.status(Response.Status.UNAUTHORIZED).entity(new ErreurDto("Code invalide")).build();
        }

        utilisateur.confirmerActivationDeuxFa();
        auditLogService.journaliser(utilisateur.getId(), null, "2FA_ACTIVEE_APP", "utilisateur", utilisateur.getId());

        return Response.ok(UtilisateurDto.depuis(utilisateur)).build();
    }

    // --- Méthode SMS -------------------------------------------------------

    @POST
    @Path("/sms/demarrer")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response demarrerSms(@Valid TelephoneRequest requete) {
        Utilisateur utilisateur = utilisateurCourant();
        utilisateur.setTelephone(requete.telephone());

        String code = CodeNumeriqueGenerator.genererCode6Chiffres();
        String codeHash = passwordService.hacher(code);
        String tokenActivation = jwtService.genererTokenActivationSms(utilisateur.getId(), codeHash);

        // TODO phase C (suite) : brancher un vrai envoi SMS.
        LOG.infof("[DEV] Code 2FA SMS d'activation pour %s (tél. %s) : %s",
                utilisateur.getEmail(), requete.telephone(), code);

        return Response.ok(new DeuxFaSmsDemarrerResponse(tokenActivation)).build();
    }

    @POST
    @Path("/sms/confirmer")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response confirmerSms(@Valid ConfirmerSmsRequest requete) {
        JwtService.TokenAvecCodeHash claims;
        try {
            claims = jwtService.validerTokenActivationSms(requete.tokenActivation());
        } catch (Exception e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new ErreurDto("Session d'activation invalide ou expirée — recommencez"))
                    .build();
        }

        // Sécurité : on n'autorise la confirmation que pour l'utilisateur
        // courant, même si le token d'activation désigne un autre id (ne
        // devrait jamais arriver en usage normal, mais on ne fait jamais
        // confiance à un token à but limité pour identifier "qui agit").
        UUID utilisateurCourantId = tenantContext.utilisateurCourantId();
        if (!utilisateurCourantId.equals(claims.utilisateurId())) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        if (claims.codeHash() == null || !passwordService.verifier(requete.code(), claims.codeHash())) {
            return Response.status(Response.Status.UNAUTHORIZED).entity(new ErreurDto("Code invalide")).build();
        }

        Utilisateur utilisateur = utilisateurRepository.findById(utilisateurCourantId);
        utilisateur.demarrerActivationDeuxFa(MethodeDeuxFa.SMS, null);
        utilisateur.confirmerActivationDeuxFa();

        auditLogService.journaliser(utilisateur.getId(), null, "2FA_ACTIVEE_SMS", "utilisateur", utilisateur.getId());

        return Response.ok(UtilisateurDto.depuis(utilisateur)).build();
    }

    // --- Désactivation -------------------------------------------------------

    @POST
    @Path("/desactiver")
    @Transactional
    public Response desactiver() {
        Utilisateur utilisateur = utilisateurCourant();
        utilisateur.desactiverDeuxFa();
        auditLogService.journaliser(utilisateur.getId(), null, "2FA_DESACTIVEE", "utilisateur", utilisateur.getId());
        return Response.ok(UtilisateurDto.depuis(utilisateur)).build();
    }

    private Utilisateur utilisateurCourant() {
        return utilisateurRepository.findById(tenantContext.utilisateurCourantId());
    }
}
