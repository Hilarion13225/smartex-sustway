package com.smartexsustway.api.security;

import dev.samstevens.totp.code.CodeGenerator;
import dev.samstevens.totp.code.CodeVerifier;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.time.TimeProvider;
import jakarta.enterprise.context.ApplicationScoped;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * 2FA "application d'authentification" (RG36, CDC §5.4) — TOTP (RFC 6238)
 * via la librairie dev.samstevens.totp (MIT, github.com/samdjstevens/java-totp).
 * Paramètres par défaut de la librairie : SHA1, 6 chiffres, période 30s —
 * ce sont aussi les valeurs standard comprises par Google Authenticator,
 * Authy, etc. Ne pas changer sans mettre à jour uriProvisionnement en
 * conséquence (les deux doivent toujours correspondre).
 */
@ApplicationScoped
public class TotpService {

    private final SecretGenerator secretGenerator = new DefaultSecretGenerator();
    private final CodeVerifier codeVerifier;

    public TotpService() {
        CodeGenerator codeGenerator = new DefaultCodeGenerator();
        TimeProvider timeProvider = new SystemTimeProvider();
        this.codeVerifier = new DefaultCodeVerifier(codeGenerator, timeProvider);
    }

    public String genererSecret() {
        return secretGenerator.generate();
    }

    /** Tolère un décalage de +/-30s entre l'horloge du serveur et celle du téléphone (comportement par défaut de la librairie). */
    public boolean verifier(String secret, String code) {
        if (secret == null || code == null || code.isBlank()) {
            return false;
        }
        return codeVerifier.isValidCode(secret, code);
    }

    /**
     * URI otpauth:// à encoder en QR code côté frontend (aucune génération
     * d'image ici — évite une dépendance supplémentaire côté backend pour
     * un besoin purement d'affichage). Le secret est aussi retourné en
     * clair pour permettre une saisie manuelle si le QR code ne peut pas
     * être scanné.
     */
    public String uriProvisionnement(String email, String secret) {
        String label = URLEncoder.encode("SMARTEX SustWay:" + email, StandardCharsets.UTF_8);
        String issuer = URLEncoder.encode("SMARTEX SustWay", StandardCharsets.UTF_8);
        return "otpauth://totp/" + label + "?secret=" + secret + "&issuer=" + issuer
                + "&algorithm=SHA1&digits=6&period=30";
    }
}
