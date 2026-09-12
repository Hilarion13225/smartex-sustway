package com.smartexsustway.api.domain.enums;

/** Correspond au type PostgreSQL {@code statut_axe}.
 *
 * <p>{@code PROPOSE} est le seul état qu'une recommandation de l'IA peut
 * atteindre sans intervention humaine. */
public enum StatutAxe {
    PROPOSE,
    VALIDE,
    REJETE
}
