package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;

/** Corps de la requête de changement de statut d'une non-conformité (OUVERTE / EN_TRAITEMENT / CLOTUREE). */
public record NonConformeStatutRequestDto(
        @NotBlank String statut
) {
}
