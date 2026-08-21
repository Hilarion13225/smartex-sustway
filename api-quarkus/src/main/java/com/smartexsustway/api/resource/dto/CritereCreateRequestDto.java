package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;

public record CritereCreateRequestDto(
        @NotBlank(message = "Le code est obligatoire") String code,
        @NotBlank(message = "Le libellé est obligatoire") String libelle,
        String description,
        String applicabilite,
        String criticiteCode
) {
}
