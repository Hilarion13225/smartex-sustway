package com.smartexsustway.api.domain.enums;

/** Correspond au type PostgreSQL {@code couverture_preuve_attendue}.
 *
 * <p>Quatre valeurs là où {@code evaluation.couverture_preuve} n'en portait
 * que deux. {@code NON_VERIFIABLE} et {@code INSUFFISANTE} ne disent pas la
 * même chose et ne doivent jamais être fusionnées. */
public enum CouverturePreuveAttendue {
    COMPLETE,
    PARTIELLE,
    INSUFFISANTE,
    NON_VERIFIABLE
}
