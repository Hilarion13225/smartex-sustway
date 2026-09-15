package com.smartexsustway.api.domain.enums;

/**
 * Degré de correspondance entre un critère et l'exigence d'un bailleur, tel
 * qu'un humain l'a lu dans le document officiel. Correspond au type
 * PostgreSQL {@code correspondance_bailleur} (V74).
 *
 * Aucune valeur n'est déduite : ni par similarité de libellé, ni par un
 * modèle. Tant que personne n'a tranché, la justification reste
 * {@link #NON_DETERMINEE}, et la base en refuse la validation.
 */
public enum CorrespondanceBailleur {

    /** Le critère couvre l'exigence du bailleur. */
    EXACTE,

    /** Le critère couvre une partie de l'exigence seulement. */
    PARTIELLE,

    /** Le document a été lu : il ne rattache pas ce critère au bailleur. */
    AUCUNE,

    /** Pas encore tranché. Valeur de départ, interdite à la validation. */
    NON_DETERMINEE
}
