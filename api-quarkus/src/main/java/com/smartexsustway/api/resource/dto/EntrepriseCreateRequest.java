package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * RG02 : identifiantLegal doit être unique.
 * RG24 (à enforcer en phase C) : une entreprise ne peut être créée sans
 * formule d'abonnement valide choisie au préalable — non vérifié dans ce
 * squelette phase B, le module Abonnements n'existe pas encore.
 */
public record EntrepriseCreateRequest(
        @NotBlank(message = "La raison sociale est obligatoire")
        String raisonSociale,

        @NotBlank(message = "L'identifiant légal est obligatoire")
        String identifiantLegal,

        String secteurCode,

        String taille
) {
}
