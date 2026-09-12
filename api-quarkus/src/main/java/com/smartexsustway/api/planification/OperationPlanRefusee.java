package com.smartexsustway.api.planification;

/**
 * Une opération demandée sur un plan ou une action qui ne peut pas la
 * recevoir : transition interdite, plan gelé, action déjà définitive.
 *
 * <p>Traduite en {@code 409 CONFLICT} : c'est l'état de la ressource, et non
 * la requête, qui fait obstacle. Le message dit lequel — « déjà validée » et
 * « plan clôturé » n'appellent pas la même correction de la part de
 * l'appelant.
 */
public class OperationPlanRefusee extends RuntimeException {

    public OperationPlanRefusee(String message) {
        super(message);
    }
}
