package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.enums.MethodeDeuxFa;
import com.smartexsustway.api.domain.enums.StatutUtilisateur;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.notification.EmailService;
import com.smartexsustway.api.resource.dto.Connexion2FaRequest;
import com.smartexsustway.api.resource.dto.ConnexionRequest;
import com.smartexsustway.api.resource.dto.ConnexionResponse;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.InscriptionRequest;
import com.smartexsustway.api.resource.dto.MotDePasseOublieRequest;
import com.smartexsustway.api.security.CodeVerificationService;
import com.smartexsustway.api.resource.dto.RenvoiCodeRequest;
import com.smartexsustway.api.resource.dto.VerificationCodeRequest;
import com.smartexsustway.api.resource.dto.ReinitialiserMotDePasseRequest;
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
import org.eclipse.microprofile.config.inject.ConfigProperty;
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

    @Inject
    EmailService emailService;

    @Inject
    CodeVerificationService codeVerificationService;

    /**
     * Sert uniquement à détecter l'absence d'envoi réel : sans clé Brevo, le
     * code n'atteindrait personne et le compte serait inactivable en local.
     */
    @ConfigProperty(name = "smartex.mail.brevo-api-key")
    Optional<String> mailApiKey;

    @ConfigProperty(name = "smartex.api.base-url", defaultValue = "http://localhost:8080")
    String apiBaseUrl;

    @ConfigProperty(name = "smartex.frontend.base-url", defaultValue = "http://localhost:5173")
    String frontendBaseUrl;

    /**
     * TEMPORAIRE : voir application.properties. true par défaut (RG36
     * pleinement appliquée) — désactivé uniquement en profil dev pour fluidifier
     * les tests manuels pendant la phase D. Ne jamais désactiver en production.
     */
    @ConfigProperty(name = "smartex.auth.verification-email-obligatoire", defaultValue = "true")
    boolean verificationEmailObligatoire;

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

        envoyerCode(utilisateur);

        // TEMPORAIRE (voir smartex.auth.verification-email-obligatoire) : en
        // dev uniquement, l'email reste envoyé/journalisé comme d'habitude,
        // mais le compte est activé immédiatement plutôt que d'attendre le
        // clic — pour ne plus avoir à copier un token à chaque test manuel
        // pendant la phase D. RG36 reste pleinement appliquée en test et par
        // défaut ailleurs (voir application.properties, %dev uniquement).
        if (!verificationEmailObligatoire) {
            utilisateur.marquerEmailVerifie();
        }

        auditLogService.journaliser(utilisateur.getId(), null, "INSCRIPTION", "utilisateur", utilisateur.getId());

        return Response.status(Response.Status.CREATED).entity(UtilisateurDto.depuis(utilisateur)).build();
    }

    /**
     * RG36 — activation du compte par code à usage unique.
     *
     * Les échecs renvoient tous 400 avec un message distinguant seulement la
     * cause utile à l'utilisateur (code faux, expiré, trop d'essais) : préciser
     * si l'adresse correspond à un compte permettrait d'énumérer les comptes,
     * comme sur /connexion.
     */
    @POST
    @Path("/verification-email")
    @Transactional
    public Response verifierEmail(@Valid VerificationCodeRequest requete) {
        Utilisateur utilisateur = utilisateurRepository.parEmail(requete.email()).orElse(null);
        if (utilisateur == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new ErreurDto("Code invalide ou expiré")).build();
        }
        if (utilisateur.isEmailVerifie()) {
            // Idempotent : un double envoi du formulaire ne doit pas se solder
            // par une erreur alors que le compte est déjà actif.
            return Response.ok(UtilisateurDto.depuis(utilisateur)).build();
        }

        var resultat = codeVerificationService.verifier(utilisateur, requete.code());
        if (resultat != CodeVerificationService.Resultat.VALIDE) {
            auditLogService.journaliser(utilisateur.getId(), null, "CODE_VERIFICATION_REFUSE",
                    "utilisateur", utilisateur.getId());
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new ErreurDto(messageEchec(resultat))).build();
        }

        utilisateur.marquerEmailVerifie(); // RG36 : passe aussi le statut à ACTIF
        auditLogService.journaliser(utilisateur.getId(), null, "EMAIL_VERIFIE", "utilisateur", utilisateur.getId());

        return Response.ok(UtilisateurDto.depuis(utilisateur)).build();
    }

    /**
     * Renvoie un code d'activation. Répond toujours 204, que l'adresse existe
     * ou non et que le compte soit déjà actif ou non : la réponse ne doit rien
     * apprendre sur l'existence d'un compte.
     */
    @POST
    @Path("/verification-email/renvoyer")
    @Transactional
    public Response renvoyerCodeVerification(@Valid RenvoiCodeRequest requete) {
        utilisateurRepository.parEmail(requete.email())
                .filter(utilisateur -> !utilisateur.isEmailVerifie())
                .ifPresent(this::envoyerCode);
        return Response.noContent().build();
    }

    /**
     * Émet un code et l'envoie par email.
     *
     * Le code n'est journalisé que si aucun envoi réel n'est possible (clé
     * Brevo absente, cas du poste de développement) : le journaliser en
     * production reviendrait à exposer un identifiant d'activation à
     * quiconque lit les logs.
     */
    private void envoyerCode(Utilisateur utilisateur) {
        String code = codeVerificationService.emettre(utilisateur);
        long minutes = CodeVerificationService.DUREE_VALIDITE.toMinutes();
        emailService.envoyerCodeVerification(utilisateur.getEmail(), utilisateur.getPrenom(), code, minutes);

        if (mailApiKey.isEmpty() || mailApiKey.get().isBlank()) {
            LOG.warnf("Envoi d'email non configuré — code d'activation de %s : %s (valable %d min)",
                    utilisateur.getEmail(), code, minutes);
        } else {
            LOG.infof("Code d'activation émis pour %s (valable %d min)", utilisateur.getEmail(), minutes);
        }
    }

    private static String messageEchec(CodeVerificationService.Resultat resultat) {
        return switch (resultat) {
            case CODE_EXPIRE -> "Ce code a expiré — demandez-en un nouveau";
            case TROP_DE_TENTATIVES -> "Trop de tentatives sur ce code — demandez-en un nouveau";
            case AUCUN_CODE -> "Aucun code en cours — demandez-en un nouveau";
            default -> "Code invalide ou expiré";
        };
    }

    /**
     * Ne révèle jamais si l'adresse correspond à un compte (même logique
     * anti-énumération que /connexion) : la réponse est identique que
     * l'email existe ou non, seul l'envoi (ou non) de l'email diffère.
     */
    @POST
    @Path("/mot-de-passe-oublie")
    public Response motDePasseOublie(@Valid MotDePasseOublieRequest requete) {
        utilisateurRepository.parEmail(requete.email()).ifPresent(utilisateur -> {
            String token = jwtService.genererTokenReinitialisationMotDePasse(utilisateur.getId());
            String lien = frontendBaseUrl + "/reinitialiser-mot-de-passe?token=" + token;
            LOG.infof("Lien de réinitialisation de mot de passe pour %s : %s", utilisateur.getEmail(), lien);
            emailService.envoyerReinitialisationMotDePasse(utilisateur.getEmail(), utilisateur.getPrenom(), lien);
            auditLogService.journaliser(utilisateur.getId(), null, "MOT_DE_PASSE_OUBLIE_DEMANDE", "utilisateur", utilisateur.getId());
        });
        return Response.noContent().build();
    }

    /** Choix du nouveau mot de passe depuis le lien reçu ; connecte directement pour éviter une double saisie. */
    @POST
    @Path("/reinitialiser-mot-de-passe")
    @Transactional
    public Response reinitialiserMotDePasse(@Valid ReinitialiserMotDePasseRequest requete) {
        UUID utilisateurId;
        try {
            utilisateurId = jwtService.validerTokenReinitialisationMotDePasse(requete.token());
        } catch (Exception e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new ErreurDto("Lien de réinitialisation invalide ou expiré"))
                    .build();
        }

        Utilisateur utilisateur = utilisateurRepository.findById(utilisateurId);
        if (utilisateur == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        utilisateur.setMotDePasseHash(passwordService.hacher(requete.motDePasse()));
        auditLogService.journaliser(utilisateur.getId(), null, "MOT_DE_PASSE_REINITIALISE", "utilisateur", utilisateur.getId());

        return Response.ok(ConnexionResponse.session(emettreTokenSession(utilisateur))).build();
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
