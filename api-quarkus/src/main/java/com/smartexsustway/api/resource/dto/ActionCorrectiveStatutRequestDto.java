package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;

/** Corps de la requête de changement de statut d'une action corrective (OUVERTE / EN_COURS / TERMINEE / VALIDEE). */
public record ActionCorrectiveStatutRequestDto(
        @NotBlank String statut
) {
}
