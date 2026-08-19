package com.smartexsustway.api.domain.enums;

/**
 * Méthode de 2FA choisie par l'utilisateur (CDC §5.4, décision actée §13 :
 * "code par SMS ou application d'authentification, au choix de l'utilisateur").
 * Stockée en base dans une colonne VARCHAR(20) simple (utilisateur.deuxfa_methode),
 * pas un type ENUM PostgreSQL — mappée ici en Java pour la sécurité de typage.
 */
public enum MethodeDeuxFa {
    SMS,
    APP
}
