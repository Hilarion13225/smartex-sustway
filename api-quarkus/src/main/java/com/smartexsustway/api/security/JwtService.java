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
 * voir application.properties). Deux usages distincts :
 *   - token de SESSION (login) : subject = id utilisateur, claims role/entreprise_id
 *   - token de VÉRIFICATION D'EMAIL (RG36) : subject = id utilisateur, claim
 *     purpose=EMAIL_VERIFICATION, durée de vie courte, à usage unique par nature
 *     (aucune table de révocation en phase B — suffisant pour un lien envoyé par email).
 */
@ApplicationScoped
public class JwtService {

    @ConfigProperty(name = "mp.jwt.verify.issuer")
    String issuer;

    @Inject
    JWTParser jwtParser;

    private static final Duration DUREE_VALIDITE_SESSION = Duration.ofHours(8);
    private static final Duration DUREE_VALIDITE_VERIFICATION_EMAIL = Duration.ofHours(24);
    private static final String CLAIM_PURPOSE = "purpose";
    private static final String PURPOSE_EMAIL_VERIFICATION = "EMAIL_VERIFICATION";

    public String genererToken(Utilisateur utilisateur, String roleCode, String entrepriseIdCourante) {
        var builder = Jwt.issuer(issuer)
                .subject(utilisateur.getId().toString())
                .claim("email", utilisateur.getEmail())
                .claim("role", roleCode)
                .expiresIn(DUREE_VALIDITE_SESSION);

        if (entrepriseIdCourante != null) {
            builder = builder.claim("entreprise_id", entrepriseIdCourante);
        }

        // Le rôle applicatif est également exposé comme "groups" JAX-RS standard,
        // pour que @RolesAllowed("ADMIN_AUDIT") etc. fonctionne nativement.
        return builder.groups(java.util.Set.of(roleCode)).sign();
    }

    /** RG36 — lien de vérification d'email envoyé après inscription. */
    public String genererTokenVerificationEmail(UUID utilisateurId) {
        return Jwt.issuer(issuer)
                .subject(utilisateurId.toString())
                .claim(CLAIM_PURPOSE, PURPOSE_EMAIL_VERIFICATION)
                .expiresIn(DUREE_VALIDITE_VERIFICATION_EMAIL)
                .sign();
    }

    /**
     * Valide un token de vérification d'email et retourne l'id utilisateur concerné.
     * Lève une exception si le token est invalide, expiré, ou ne porte pas le bon "purpose".
     */
    public UUID validerTokenVerificationEmail(String token) throws ParseException {
        JsonWebToken jwt = jwtParser.parse(token);
        Object purpose = jwt.getClaim(CLAIM_PURPOSE);
        if (!PURPOSE_EMAIL_VERIFICATION.equals(purpose)) {
            throw new ParseException("Token présenté hors de son usage prévu (vérification email)");
        }
        return UUID.fromString(jwt.getSubject());
    }
}

