package com.smartexsustway.api.referentiel;

/**
 * Refus d'une opération sur une justification de mapping bailleur, porté
 * avec le statut HTTP qui le décrit : 403 (droits), 404 (critère, bailleur,
 * mapping ou justification absent), 409 (état incompatible), 400 (requête
 * incomplète).
 *
 * Levée par le service avant toute écriture, pour que l'appelant reçoive un
 * motif lisible plutôt que de buter sur une contrainte de V74 — que
 * ContrainteJustificationMapper rendrait certes en 409, mais sans pouvoir
 * distinguer un 404 d'un 403.
 */
public class JustificationRefuseeException extends RuntimeException {

    private final int statutHttp;

    public JustificationRefuseeException(int statutHttp, String message) {
        super(message);
        this.statutHttp = statutHttp;
    }

    public int statutHttp() {
        return statutHttp;
    }
}
