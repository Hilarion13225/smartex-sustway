package com.smartexsustway.api.domain.enums;

/**
 * Correspond au type PostgreSQL {@code statut_indice}.
 *
 * <p>Ce que cet enum protège : un indice de préparation qui vaut zéro ne dit
 * pas la même chose selon la raison de ce zéro. Jusqu'ici, une mission dont
 * aucun critère n'était rattaché au bailleur rendait {@code score = 0.00} avec
 * un HTTP 200 — un dirigeant y lisait « préparation nulle » là où la vérité
 * était « personne n'a encore défini ce qui compte pour ce bailleur ». Les
 * deux situations appellent des décisions opposées : l'une demande du travail
 * de mise en conformité, l'autre du paramétrage.
 *
 * <p>Le statut porte donc la raison, et {@code score} devient nul dès qu'il
 * n'y a rien à mesurer — plutôt que de laisser un chiffre tenir lieu de
 * réponse à une question qui n'a pas été posée.
 */
public enum StatutIndice {

    /**
     * Aucun critère n'est marqué applicable à ce bailleur : le périmètre de
     * mesure n'existe pas. Rien ne peut être calculé, et ce n'est pas un
     * défaut de l'entreprise auditée.
     */
    NON_CALCULABLE,

    /**
     * Des critères sont applicables au bailleur, mais aucun n'a d'évaluation
     * validée dans cette mission — soit qu'elle n'ait pas assez avancé, soit
     * qu'aucun critère tagué n'appartienne à son référentiel. Les deux
     * compteurs portés par l'indice distinguent ces deux cas.
     */
    SANS_EVALUATION,

    /** Au moins un critère applicable est évalué et validé : le score a un sens. */
    CALCULE;

    /** Vrai lorsque l'indice porte un score exploitable ; faux quand il n'y a rien à lire. */
    public boolean porteUnScore() {
        return this == CALCULE;
    }
}
