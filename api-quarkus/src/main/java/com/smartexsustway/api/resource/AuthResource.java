package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.enums.MethodeDeuxFa;
import com.smartexsustway.api.domain.enums.StatutUtilisateur;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.dto.Connexion2FaRequest;
import com.smartexsustway.api.resource.dto.ConnexionRequest;
import com.smartexsustway.api.resource.dto.ConnexionResponse;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.InscriptionRequest;
import com.smartexsustway.api.resource.dto.UtilisateurDto;
import com.smartexsustway.api.security.CodeNumeriqueGenerator;
import com.smartexsustway.api.security.JwtService;
import com.smartexsustway.api.security.PasswordService;
import com.smartexsustway.api.security.TotpService;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * RG36 : compte activé uniquement après vérification email ; 2FA optionnelle,
 * en deux étapes lorsqu'active (voir connexion() / confirmerDeuxFa()).
 * La gestion de l'activation/désactivation de la 2FA elle-même est dans
 * DeuxFaResource — cette classe ne fait qu'authentifier.
 *
 * Pas de logique d'autorisation "métier" ici : uniquement authentification.
 * Toute vérification de permission passe par security.AutorisationService.
 */
@Path("/api/v1/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AuthResource {

    private static final Logger LOG = Logger.getLogger(AuthResource.class);

    @Inject
    UtilisateurRepository utilisateurRepository;

    @Inject
    UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;

    @Inject
    PasswordService passwordService;

    @Inject
    JwtService jwtService;

    @Inject
    TotpService totpService;

    @Inject
    AuditLogService auditLogService;

    @POST
    @Path("/inscription")
    @Transactional
    public Response inscription(@Valid InscriptionRequest requete) {
        if (utilisateurRepository.emailExiste(requete.email())) {
            // Message volontairement générique : ne pas confirmer l'existence
            // d'un compte à un tiers (évite l'énumération d'emails).
            return Response.status(Response.Status.CONFLICT)
                    .entity(new ErreurDto("Impossible de créer ce compte avec ces informations"))
                    .build();
        }

        String hash = passwordService.hacher(requete.motDePasse());
        Utilisateur utilisateur = new Utilisateur(requete.nom(), requete.prenom(), requete.email(), hash);
        utilisateurRepository.persist(utilisateur);

        String tokenVerification = jwtService.genererTokenVerificationEmail(utilisateur.getId());
        // TODO phase C (suite) : brancher un vrai envoi d'email (SMTP/service transactionnel).
        // En attendant, le lien est journalisé pour permettre les tests manuels.
        LOG.infof("Lien de vérification email pour %s : GET /api/v1/auth/verification-email?token=%s",
                utilisateur.getEmail(), tokenVerification);

        auditLogService.journaliser(utilisateur.getId(), null, "INSCRIPTION", "utilisateur", utilisateur.getId());

        return Response.status(Response.Status.CREATED).entity(UtilisateurDto.depuis(utilisateur)).build();
    }

    @GET
    @Path("/verification-email")
    @Transactional
    public Response verifierEmail(@QueryParam("token") String token) {
        UUID utilisateurId;
        try {
            utilisateurId = jwtService.validerTokenVerificationEmail(token);
        } catch (Exception e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new ErreurDto("Lien de vérification invalide ou expiré"))
                    .build();
        }

        Utilisateur utilisateur = utilisateurRepository.findById(utilisateurId);
        if (utilisateur == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        utilisateur.marquerEmailVerifie(); // RG36 : passe aussi le statut à ACTIF
        auditLogService.journaliser(utilisateur.getId(), null, "EMAIL_VERIFIE", "utilisateur", utilisateur.getId());

        return Response.ok(UtilisateurDto.depuis(utilisateur)).build();
    }

    /**
     * Étape 1/1 (2FA inactive) ou 1/2 (2FA active). RG36 : la 2FA, quand
     * elle est activée, s'intercale entre la vérification du mot de passe
     * et l'émission du vrai token de session.
     */
    @POST
    @Path("/connexion")
    @Transactional
    public Response connexion(@Valid ConnexionRequest requete) {
        Optional<Utilisateur> utilisateurOpt = utilisateurRepository.parEmail(requete.email());

        if (utilisateurOpt.isEmpty()
                || !passwordService.verifier(requete.motDePasse(), utilisateurOpt.get().getMotDePasseHash())) {
            // Message volontairement identique que ce soit l'email ou le mot de
            // passe qui soit incorrect, pour ne pas faciliter l'énumération de comptes.
            auditLogService.journaliser(null, null, "CONNEXION_ECHEC", "utilisateur", null);
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity(new ErreurDto("Email ou mot de passe incorrect"))
                    .build();
        }

        Utilisateur utilisateur = utilisateurOpt.get();

        if (utilisateur.getStatut() != StatutUtilisateur.ACTIF) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity(new ErreurDto("Compte non actif (email non vérifié ou compte suspendu)"))
                    .build();
        }

        if (utilisateur.isDeuxfaActive()) {
            return demarrerVerificationDeuxFa(utilisateur);
        }

        return Response.ok(ConnexionResponse.session(emettreTokenSession(utilisateur))).build();
    }

    /** Étape 2/2 : soumission du code 2FA, obtenu via /connexion lorsque deuxFaRequise=true. */
    @POST
    @Path("/connexion/2fa")
    @Transactional
    public Response confirmerDeuxFa(@Valid Connexion2FaRequest requete) {
        JwtService.TokenAvecCodeHash claims;
        try {
            claims = jwtService.validerTokenPreAuth2Fa(requete.tokenPreAuth());
        } catch (Exception e) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity(new ErreurDto("Session de connexion invalide ou expirée — reconnectez-vous"))
                    .build();
        }

        Utilisateur utilisateur = utilisateurRepository.findById(claims.utilisateurId());
        if (utilisateur == null || !utilisateur.isDeuxfaActive()) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }

        boolean codeValide = utilisateur.getDeuxfaMethode() == MethodeDeuxFa.APP
                ? totpService.verifier(utilisateur.getDeuxfaSecret(), requete.code())
                : claims.codeHash() != null && passwordService.verifier(requete.code(), claims.codeHash());

        if (!codeValide) {
            auditLogService.journaliser(utilisateur.getId(), null, "2FA_CONNEXION_ECHEC", "utilisateur", utilisateur.getId());
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity(new ErreurDto("Code invalide"))
                    .build();
        }

        auditLogService.journaliser(utilisateur.getId(), null, "2FA_CONNEXION_REUSSIE", "utilisateur", utilisateur.getId());
        return Response.ok(ConnexionResponse.session(emettreTokenSession(utilisateur))).build();
    }

    private Response demarrerVerificationDeuxFa(Utilisateur utilisateur) {
        if (utilisateur.getDeuxfaMethode() == MethodeDeuxFa.APP) {
            String tokenPreAuth = jwtService.genererTokenPreAuth2Fa(utilisateur.getId(), null);
            return Response.ok(ConnexionResponse.deuxFaRequise("APP", tokenPreAuth)).build();
        }

        // SMS : génère un nouveau code à chaque tentative de connexion (celui
        // de l'activation, s'il y en a eu un, n'est plus valable).
        String code = CodeNumeriqueGenerator.genererCode6Chiffres();
        String codeHash = passwordService.hacher(code);
        String tokenPreAuth = jwtService.genererTokenPreAuth2Fa(utilisateur.getId(), codeHash);

        // TODO phase C (suite) : brancher un vrai envoi SMS. En attendant,
        // le code est journalisé pour permettre les tests manuels (même
        // logique que le lien de vérification email).
        LOG.infof("[DEV] Code 2FA SMS pour %s (tél. %s) : %s", utilisateur.getEmail(), utilisateur.getTelephone(), code);

        return Response.ok(ConnexionResponse.deuxFaRequise("SMS", tokenPreAuth)).build();
    }

    private String emettreTokenSession(Utilisateur utilisateur) {
        // TODO phase C (suite) : si l'utilisateur est rattaché à plusieurs
        // entreprises, proposer un sélecteur d'entreprise courante plutôt
        // que de prendre la première trouvée.
        List<UtilisateurEntreprise> rattachements = utilisateurEntrepriseRepository.parUtilisateur(utilisateur.getId());
        String roleCode = rattachements.isEmpty() ? "AUCUN_ROLE_ATTRIBUE" : rattachements.get(0).getRole().getCode();
        UUID entrepriseId = rattachements.isEmpty() ? null : rattachements.get(0).getEntreprise().getId();

        String token = jwtService.genererToken(utilisateur, roleCode, entrepriseId == null ? null : entrepriseId.toString());
        auditLogService.journaliser(utilisateur.getId(), entrepriseId, "CONNEXION_REUSSIE", "utilisateur", utilisateur.getId());
        return token;
    }
}
