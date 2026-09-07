package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.PositiveOrZero;

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

        String taille,

        /** Chiffre d'affaires annuel déclaré ; null pour l'effacer. */
        @PositiveOrZero(message = "Le chiffre d'affaires ne peut être négatif")
        BigDecimal chiffreAffaires,

        @Size(min = 3, max = 3, message = "La devise doit compter trois lettres")
        String deviseChiffreAffaires,

        @PositiveOrZero(message = "L'effectif ne peut être négatif")
        Integer effectif
) {
}
