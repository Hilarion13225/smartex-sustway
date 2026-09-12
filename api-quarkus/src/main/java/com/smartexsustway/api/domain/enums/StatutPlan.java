package com.smartexsustway.api.domain.enums;

/**
 * Correspond au type PostgreSQL {@code statut_plan}.
 *
 * <p>{@link #CLOTURE} et {@link #ARCHIVE} gèlent tous deux le plan, et ne
 * disent pas la même chose : le premier est arrivé à son terme, le second a
 * été retiré sans l'être. Les confondre ferait lire un abandon comme un
 * accomplissement.
 *
 * <p>Ce type n'est utilisé que par {@code plan_action} — contrairement à
 * {@code statut_action_corrective}, partagé avec {@code action_corrective}.
 */
public enum StatutPlan {
    BROUILLON,
    ACTIF,
    CLOTURE,
    ARCHIVE;

    /** Vrai lorsque le plan ne peut plus être modifié (D25). */
    public boolean estGele() {
        return this == CLOTURE || this == ARCHIVE;
    }
}
