package com.smartexsustway.api.domain.enums;

/**
 * Correspond au type PostgreSQL {@code statut_generique}.
 * Utilisé pour les entités dont le statut n'a pas de cycle de vie propre
 * (site, rattachement utilisateur/entreprise...).
 */
public enum StatutGenerique {
    ACTIF,
    INACTIF,
    SUSPENDU,
    ARCHIVE
}
