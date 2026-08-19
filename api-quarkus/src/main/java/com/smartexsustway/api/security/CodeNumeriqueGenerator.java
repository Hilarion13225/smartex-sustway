package com.smartexsustway.api.security;

import java.security.SecureRandom;

/** Génération de codes numériques à 6 chiffres pour la 2FA par SMS (connexion et activation). */
public final class CodeNumeriqueGenerator {

    private static final SecureRandom ALEATOIRE = new SecureRandom();

    private CodeNumeriqueGenerator() {
    }

    public static String genererCode6Chiffres() {
        return String.format("%06d", ALEATOIRE.nextInt(1_000_000));
    }
}
