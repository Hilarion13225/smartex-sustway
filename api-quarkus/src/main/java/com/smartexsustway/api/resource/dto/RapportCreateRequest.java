package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;

/** Corps de la requête de génération d'un rapport (module 12). */
public record RapportCreateRequest(
        @NotBlank String type,
        @NotBlank String format
) {
}
