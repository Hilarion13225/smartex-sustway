package com.smartexsustway.api.ia.contrat;

/**
 * Une référence rendue par le modèle ne désigne rien de connu.
 *
 * Le contrat V2 demande aux agents de rattacher ce qu'ils produisent — un
 * élément relevé, une action recommandée — à une référence du contexte qui
 * leur a été transmis. Une référence hors de ce contexte est soit une erreur
 * de recopie, soit une invention.
 *
 * Dans les deux cas elle doit être refusée bruyamment. L'accepter en silence
 * reviendrait à laisser passer une recommandation portant sur une exigence
 * qui n'existe pas — crédible, et fausse.
 */
public class ReferenceIaInvalide extends RuntimeException {

    /** Pourquoi la référence est refusée. Sert au diagnostic, pas au message utilisateur. */
    public enum Motif {
        /** Ne respecte pas la forme {@code <code_exigence>-P<rang>}. */
        MALFORMEE,
        /**
         * Bien formée, mais absente du contexte transmis.
         *
         * Couvre aussi bien la référence inventée que celle d'une autre
         * exigence ou d'un autre critère : la table ne contient que les
         * preuves attendues du critère analysé, donc tout ce qui vient
         * d'ailleurs y est simplement absent. C'est ce cloisonnement qui rend
         * le contrôle exhaustif sans avoir à énumérer les cas.
         */
        INCONNUE
    }

    private final transient Motif motif;
    private final transient String reference;

    public ReferenceIaInvalide(Motif motif, String reference, String message) {
        super(message);
        this.motif = motif;
        this.reference = reference;
    }

    public Motif motif() {
        return motif;
    }

    public String reference() {
        return reference;
    }
}
