package com.smartexsustway.api.domain.rules;

/**
 * Échelle de maturité à cinq niveaux sur laquelle l'entreprise se situe pour
 * chaque question du questionnaire (RG09) et que reprend la note d'évaluation
 * (RG27).
 *
 * Les libellés sont portés ici plutôt que dans l'interface : ils sont
 * transmis au pipeline d'agents IA, qui reçoit ainsi « Active » et non un
 * « 4 » privé de sens. L'écran de saisie affiche les mêmes intitulés
 * (frontend-react/src/components/audit/niveauxMaturite.js) ; toute
 * reformulation doit rester alignée entre les deux.
 */
public enum NiveauMaturite {

    TOTALEMENT_REACTIVE(1, "Totalement réactive",
            "Aucune démarche formalisée. Réagit uniquement en cas d'exigence externe ou de crise."),
    HESITANTE(2, "Hésitante",
            "Quelques initiatives ponctuelles et informelles. Démarche non structurée."),
    REACTIVE(3, "Réactive",
            "Des actions sont entreprises en réponse à des attentes externes ou internes."),
    ACTIVE(4, "Active",
            "Politique formalisée et mise en œuvre de manière proactive dans l'organisation."),
    FORTEMENT_ACTIVEE(5, "Fortement activée",
            "Politique pleinement intégrée, pilotée, évaluée et communiquée. Amélioration continue démontrée.");

    private final int niveau;
    private final String libelle;
    private final String description;

    NiveauMaturite(int niveau, String libelle, String description) {
        this.niveau = niveau;
        this.libelle = libelle;
        this.description = description;
    }

    public int niveau() {
        return niveau;
    }

    public String libelle() {
        return libelle;
    }

    public String description() {
        return description;
    }

    /** Niveau correspondant, ou {@code null} si la valeur est hors échelle. */
    public static NiveauMaturite parNiveau(Integer niveau) {
        if (niveau == null) {
            return null;
        }
        for (NiveauMaturite valeur : values()) {
            if (valeur.niveau == niveau) {
                return valeur;
            }
        }
        return null;
    }

    /**
     * Libellé transmis aux agents IA : « 4 — Active » plutôt que « 4 », pour
     * que le modèle dispose de l'intitulé et non d'un rang isolé.
     */
    public static String libelleComplet(Integer niveau) {
        NiveauMaturite valeur = parNiveau(niveau);
        return valeur == null ? null : valeur.niveau + " — " + valeur.libelle;
    }
}
