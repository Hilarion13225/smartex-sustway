package com.smartexsustway.api.domain.enums;

/**
 * Cycle de vie d'un import de référentiel. Correspond au type PostgreSQL
 * {@code statut_import_referentiel} (V57).
 *
 * Les états s'arrêtent au brouillon généré. Ce qui suit — validation puis
 * publication — appartient au cycle de vie de la version, que
 * {@link StatutVersionReferentiel} porte déjà : le redire ici créerait deux
 * vérités sur le même fait.
 */
public enum StatutImportReferentiel {

    /** Fichier reçu et contrôlé, extraction pas encore lancée. */
    EN_ATTENTE,

    /** Extraction confiée au service d'agents. */
    ANALYSE_EN_COURS,

    /** Contenu proposé, déposé dans une version brouillon. */
    BROUILLON_GENERE,

    /** Extraction impossible. Le fichier source reste conservé. */
    ECHEC
}
