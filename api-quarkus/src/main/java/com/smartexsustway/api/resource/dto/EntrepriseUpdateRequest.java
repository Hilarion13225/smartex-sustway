package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Modification de la fiche entreprise (RG02 : l'identifiant légal reste
 * unique — le conflit est vérifié côté ressource). La formule et la
 * périodicité ne sont pas modifiables ici : elles relèvent de
 * l'abonnement (RG24), géré par AbonnementResource.
 */
public record EntrepriseUpdateRequest(
        @NotBlank(message = "La raison sociale est obligatoire")
        String raisonSociale,

        @NotBlank(message = "L'identifiant légal est obligatoire")
        String identifiantLegal,

        String secteurCode,

        String taille
) {
}
