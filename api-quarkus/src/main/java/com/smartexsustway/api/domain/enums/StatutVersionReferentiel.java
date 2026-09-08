package com.smartexsustway.api.domain.enums;

/**
 * Cycle de vie d'une version de référentiel. Correspond au type PostgreSQL
 * {@code statut_version_referentiel} (V46).
 *
 * Les transitions permises sont BROUILLON → PUBLIEE puis PUBLIEE → ARCHIVEE,
 * et rien d'autre : les déclencheurs de V49 refusent tout retour en arrière,
 * y compris par une console SQL.
 */
public enum StatutVersionReferentiel {

    /** En cours d'édition. Seul état dans lequel le contenu se modifie. */
    BROUILLON,

    /** Figée et courante : c'est elle que reçoivent les nouvelles missions. */
    PUBLIEE,

    /** Figée et remplacée : ne sert plus qu'aux missions qui l'ont auditée. */
    ARCHIVEE
}
