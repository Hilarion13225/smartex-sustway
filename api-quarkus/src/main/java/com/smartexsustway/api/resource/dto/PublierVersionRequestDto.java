package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Publication d'une nouvelle version de référentiel. */
public record PublierVersionRequestDto(
        @NotBlank(message = "Le numéro de version est obligatoire")
        @Size(max = 20, message = "Le numéro de version ne peut dépasser 20 caractères")
        String numero,

        @Size(max = 1000, message = "Les notes ne peuvent dépasser 1000 caractères")
        String notes
) {
}
