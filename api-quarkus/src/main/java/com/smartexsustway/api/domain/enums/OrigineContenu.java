package com.smartexsustway.api.domain.enums;

/**
 * Provenance d'un contenu de référentiel. Correspond au type PostgreSQL
 * {@code origine_contenu} (V50).
 *
 * Sans cette marque, les 136 exigences reprises des libellés de critères par
 * la migration d'initialisation passeraient pour des exigences métier
 * rédigées, ce qu'elles ne sont pas.
 */
public enum OrigineContenu {

    /** Semé par une migration à partir de l'existant. Reste à réécrire. */
    CONTENU_INITIAL,

    /** Rédigé par une personne. */
    CONTENU_HUMAIN,

    /** Proposé par un import assisté. Réservé à une phase ultérieure. */
    IMPORT_IA
}
