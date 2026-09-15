package com.smartexsustway.api.domain.enums;

/** Correspond au type PostgreSQL {@code statut_pipeline} : cycle de vie d'une passe d'analyse IA. */
public enum StatutPipeline {
    EN_ATTENTE,
    EN_COURS,
    TERMINE,
    ERREUR
}
