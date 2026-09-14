package com.smartexsustway.api.notification;

/**
 * Message du formulaire de contact, une fois validé et nettoyé par
 * ContactResource. Séparé du DTO d'entrée pour qu'EmailService ne dépende pas
 * de la couche REST.
 */
public record MessageContact(
        String nom,
        String email,
        String organisation,
        String telephone,
        String sujet,
        String message
) {
}
