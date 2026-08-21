package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;

public record DomaineCreateRequestDto(
        @NotBlank(message = "Le code est obligatoire") String code,
        @NotBlank(message = "Le nom est obligatoire") String nom,
        String description,
        Integer ordre
) {
}
