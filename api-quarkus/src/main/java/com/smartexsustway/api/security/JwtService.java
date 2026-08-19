package com.smartexsustway.api.security;

import com.smartexsustway.api.domain.entity.Utilisateur;
import io.smallrye.jwt.auth.principal.JWTParser;
import io.smallrye.jwt.auth.principal.ParseException;
import io.smallrye.jwt.build.Jwt;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.time.Duration;
import java.util.UUID;

/**
 * Émission et validation des JWT applicatifs, signés avec la clé privée
 * configurée (mp.jwt.verify.issuer / smallrye.jwt.sign.key.location —
 * voir application.properties).
 *
 * Tous les tokens portent un claim "purpose" qui identifie leur usage.
 * C'est un point de sécurité important, pas un détail : sans lui, un token
 * à usage unique (vérification email, pré-authentification 2FA...),
 * pourtant valide cryptographiquement, pourrait servir à s'authentifier
 * sur n'importe quel endpoint protégé — un token "de session" n'a aucune
 * différence structurelle avec un token "à but limité" du point de vue de
 * la seule vérification de signature. SessionPurposeFilter (filtre JAX-RS
 * global) vérifie ce claim sur CHAQUE requête authentifiée et rejette tout
 * ce qui n'est pas purpose=SESSION — donc chaque nouvel usage de token à
 * but limité doit être ajouté ici avec un purpose dédié, jamais réutiliser
 * SESSION pour autre chose que l'authentification normale.
 */
@ApplicationScoped
public class JwtService {

    @ConfigProperty(name = "mp.jwt.verify.issuer")
    String issuer;

    @Inject
    JWTParser jwtParser;

    private static final Duration DUREE_VALIDITE_SESSION = Duration.ofHours(8);
    private static final Duration DUREE_VALIDITE_VERIFICATION_EMAIL = Duration.ofHours(24);
    private static final Duration DUREE_VALIDITE_PRE_AUTH_2FA = Duration.ofMinutes(5);
    private static final Duration DUREE_VALIDITE_ACTIVATION_SMS = Duration.ofMinutes(10);

    private static final String CLAIM_PURPOSE = "purpose";
    private static final String CLAIM_CODE_HASH = "code_hash";

    public static final String PURPOSE_SESSION = "SESSION";
    public static final String PURPOSE_EMAIL_VERIFICATION = "EMAIL_VERIFICATION";
    public static final String PURPOSE_PRE_AUTH_2FA = "PRE_AUTH_2FA";
    public static final String PURPOSE_ACTIVATION_SMS_2FA = "ACTIVATION_SMS_2FA";

    // --- Session (connexion normale) ------------------------------------

    public String genererToken(Utilisateur utilisateur, String roleCode, String entrepriseIdCourante) {
        var builder = Jwt.issuer(issuer)
                .subject(utilisateur.getId().toString())
                .claim("email", utilisateur.getEmail())
                .claim("role", roleCode)
                .claim(CLAIM_PURPOSE, PURPOSE_SESSION)
                .expiresIn(DUREE_VALIDITE_SESSION);

        if (entrepriseIdCourante != null) {
            builder = builder.claim("entreprise_id", entrepriseIdCourante);
        }

        // Le rôle applicatif est également exposé comme "groups" JAX-RS standard,
        // pour que @RolesAllowed("ADMIN_AUDIT") etc. fonctionne nativement.
        return builder.groups(java.util.Set.of(roleCode)).sign();
    }

    // --- Vérification email (RG36) ---------------------------------------

    public String genererTokenVerificationEmail(UUID utilisateurId) {
        return genererTokenAvecCodeHash(utilisateurId, PURPOSE_EMAIL_VERIFICATION, null, DUREE_VALIDITE_VERIFICATION_EMAIL);
    }

    public UUID validerTokenVerificationEmail(String token) throws ParseException {
        return validerTokenAvecCodeHash(token, PURPOSE_EMAIL_VERIFICATION).utilisateurId();
    }

    // --- Pré-authentification 2FA (login étape 1 -> étape 2) -------------

    /**
     * @param codeHashOuNull hash BCrypt du code envoyé (méthode SMS uniquement) ;
     *                        null pour la méthode APP, où le code se vérifie
     *                        directement contre le secret TOTP persisté (pas
     *                        besoin de le porter dans le token).
     */
    public String genererTokenPreAuth2Fa(UUID utilisateurId, String codeHashOuNull) {
        return genererTokenAvecCodeHash(utilisateurId, PURPOSE_PRE_AUTH_2FA, codeHashOuNull, DUREE_VALIDITE_PRE_AUTH_2FA);
    }

    public TokenAvecCodeHash validerTokenPreAuth2Fa(String token) throws ParseException {
        return validerTokenAvecCodeHash(token, PURPOSE_PRE_AUTH_2FA);
    }

    // --- Activation 2FA par SMS -------------------------------------------

    public String genererTokenActivationSms(UUID utilisateurId, String codeHash) {
        return genererTokenAvecCodeHash(utilisateurId, PURPOSE_ACTIVATION_SMS_2FA, codeHash, DUREE_VALIDITE_ACTIVATION_SMS);
    }

    public TokenAvecCodeHash validerTokenActivationSms(String token) throws ParseException {
        return validerTokenAvecCodeHash(token, PURPOSE_ACTIVATION_SMS_2FA);
    }

    // --- Mécanique commune --------------------------------------------------

    private String genererTokenAvecCodeHash(UUID utilisateurId, String purpose, String codeHashOuNull, Duration duree) {
        var builder = Jwt.issuer(issuer)
                .subject(utilisateurId.toString())
                .claim(CLAIM_PURPOSE, purpose)
                .expiresIn(duree);
        if (codeHashOuNull != null) {
            builder = builder.claim(CLAIM_CODE_HASH, codeHashOuNull);
        }
        return builder.sign();
    }

    private TokenAvecCodeHash validerTokenAvecCodeHash(String token, String purposeAttendu) throws ParseException {
        JsonWebToken jwt = jwtParser.parse(token);
        Object purpose = jwt.getClaim(CLAIM_PURPOSE);
        if (!purposeAttendu.equals(purpose)) {
            throw new ParseException("Token présenté hors de son usage prévu (attendu : " + purposeAttendu + ")");
        }
        String codeHash = jwt.getClaim(CLAIM_CODE_HASH);
        return new TokenAvecCodeHash(UUID.fromString(jwt.getSubject()), codeHash);
    }

    public record TokenAvecCodeHash(UUID utilisateurId, String codeHash) {
    }
}
