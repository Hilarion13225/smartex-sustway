package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * RG02 : identifiantLegal doit être unique.
 * RG24 : une entreprise ne peut être créée sans formule d'abonnement valide
 * choisie au préalable — formuleCode est donc désormais obligatoire.
 * RG25 : la formule FREE ne permet aucune création d'entité métier —
 * EntrepriseResource.creer refuse la requête si formuleCode == "FREE".
 * periodicite (MENSUELLE|ANNUELLE) est obligatoire pour les formules
 * payantes, ignorée pour FREE.
 */
public record EntrepriseCreateRequest(
        @NotBlank(message = "La raison sociale est obligatoire")
        String raisonSociale,

        @NotBlank(message = "L'identifiant légal est obligatoire")
        String identifiantLegal,

        String secteurCode,

        String taille,

        @NotBlank(message = "La formule d'abonnement est obligatoire (RG24)")
        String formuleCode,

        String periodicite
) {
}
