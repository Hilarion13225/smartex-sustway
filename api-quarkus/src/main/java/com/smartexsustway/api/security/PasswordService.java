package com.smartexsustway.api.security;

import io.quarkus.elytron.security.common.BcryptUtil;
import jakarta.enterprise.context.ApplicationScoped;

/**
 * Encapsule le hashage des mots de passe. Exigence sécurité CDC §1.4 :
 * les mots de passe ne sont jamais stockés en clair. BCrypt via
 * quarkus-elytron-security-common (coût par défaut : 10 rounds).
 */
@ApplicationScoped
public class PasswordService {

    public String hacher(String motDePasseClair) {
        if (motDePasseClair == null || motDePasseClair.isBlank()) {
            throw new IllegalArgumentException("Le mot de passe ne peut pas être vide");
        }
        return BcryptUtil.bcryptHash(motDePasseClair);
    }

    public boolean verifier(String motDePasseClair, String hash) {
        return BcryptUtil.matches(motDePasseClair, hash);
    }
}
