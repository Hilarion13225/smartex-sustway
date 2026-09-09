package com.smartexsustway.api.domain.enums;

/**
 * Nature d'une règle d'analyse. Correspond au type PostgreSQL
 * {@code type_regle_analyse} (V52).
 *
 * Chaque type détermine les paramètres attendus dans la définition JSON —
 * voir RegleAnalyseValidation, qui les vérifie à l'écriture.
 *
 * Le caractère obligatoire d'une pièce n'y figure pas : c'est une propriété
 * de la preuve attendue elle-même, et la redire ici créerait deux sources
 * de vérité.
 */
public enum TypeRegleAnalyse {

    /** L'élément attendu doit être trouvé dans les pièces fournies. */
    PRESENCE,

    /** Éléments précis à rechercher dans une pièce (mentions, rubriques, valeurs). */
    ELEMENT_ATTENDU,

    /** Une date doit exister et rester dans une fenêtre de validité. */
    DATE_VALIDITE,

    /** La pièce doit porter une validation ou signature par une autorité identifiée. */
    SIGNATURE,

    /** La déclaration de l'organisation doit concorder avec les pièces. */
    COHERENCE_DECLARATION,

    /** Contradiction à détecter entre les éléments rassemblés. */
    INCOHERENCE,

    /** Condition exprimée sur les faits rassemblés, quand aucun autre type ne convient. */
    CONDITION
}
