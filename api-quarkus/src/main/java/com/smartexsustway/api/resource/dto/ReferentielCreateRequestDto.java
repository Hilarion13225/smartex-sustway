package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;

public record ReferentielCreateRequestDto(
        @NotBlank(message = "Le code est obligatoire") String code,
        @NotBlank(message = "Le nom est obligatoire") String nom,
        @NotBlank(message = "Le type est obligatoire (SMARTEX, PRI, GRESB, ITIE, IFC_SFI)") String type,
        String description,
        String version
) {
}
