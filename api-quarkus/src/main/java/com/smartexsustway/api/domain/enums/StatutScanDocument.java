package com.smartexsustway.api.domain.enums;

/** Correspond au type PostgreSQL {@code statut_scan_document}. Exigence sécurité §1.4. */
public enum StatutScanDocument {
    EN_ATTENTE,
    SAIN,
    INFECTE,
    ERREUR
}
