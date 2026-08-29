package com.smartexsustway.api.resource.dto;

public record EntrepriseAvecAbonnementDto(
        EntrepriseDto entreprise,
        AbonnementDto abonnement,
        /**
         * Nouveau jeton de session, portant le rôle RESPONSABLE_ENTREPRISE sur
         * cette entreprise — le jeton que l'appelant utilisait jusqu'ici (ex.
         * juste après vérification d'email) porte encore le rôle transitoire
         * AUCUN_ROLE_ATTRIBUE, qui ne donne accès à aucune permission. Sans ce
         * nouveau jeton, le frontend resterait bloqué dessus jusqu'à une
         * déconnexion/reconnexion manuelle.
         */
        String token
) {
}
