package com.smartexsustway.api.domain.enums;

/** Correspond au type PostgreSQL {@code type_referentiel}. CDC §7 et §7.7. */
public enum TypeReferentiel {
    SMARTEX,
    PRI,
    GRESB,
    ITIE,
    IFC_SFI,
    // Standards internationaux ouverts par V29 : la plateforme centralise
    // l'ensemble des cadres d'audit ESG, pas les seuls cinq d'origine.
    ISO,
    GRI,
    SASB,
    TCFD,
    CSRD,
    ISSB,
    CDP,
    UNGC,
    AUTRE
}
