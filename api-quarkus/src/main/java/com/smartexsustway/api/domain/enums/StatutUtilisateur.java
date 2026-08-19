package com.smartexsustway.api.domain.enums;

/**
 * Correspond au type PostgreSQL {@code statut_utilisateur}.
 * RG36 : un compte n'est activé qu'après vérification de l'email.
 */
public enum StatutUtilisateur {
    EN_ATTENTE_VERIFICATION,
    ACTIF,
    SUSPENDU,
    DESACTIVE
}
