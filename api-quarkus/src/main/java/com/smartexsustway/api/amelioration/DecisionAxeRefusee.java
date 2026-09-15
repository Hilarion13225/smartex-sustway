package com.smartexsustway.api.amelioration;

/**
 * Une décision demandée sur un axe qui ne peut pas la recevoir.
 *
 * <p>Porte son propre message parce que le refus doit dire <em>pourquoi</em> :
 * « déjà validé » et « déjà rejeté » n'appellent pas la même correction de la
 * part de l'appelant.
 *
 * <p>Traduite en {@code 409 CONFLICT} par {@code AxeAmeliorationResource} —
 * l'état de la ressource, et non la requête, est ce qui fait obstacle.
 */
public class DecisionAxeRefusee extends RuntimeException {

    public DecisionAxeRefusee(String message) {
        super(message);
    }
}
