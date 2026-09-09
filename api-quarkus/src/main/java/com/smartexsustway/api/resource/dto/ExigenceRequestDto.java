package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Création ou modification d'une exigence. Les champs nuls sont laissés en l'état. */
public record ExigenceRequestDto(
        @Size(max = 40, message = "Le code ne peut dépasser 40 caractères")
        String code,

        @Size(max = 300, message = "L'intitulé ne peut dépasser 300 caractères")
        String intitule,

        String enonce,

        Integer ordre
) {
    /** Création : intitulé et énoncé sont indispensables, le code se déduit sinon. */
    public record Creation(
            @Size(max = 40) String code,
            @NotBlank(message = "L'intitulé est obligatoire")
            @Size(max = 300) String intitule,
            @NotBlank(message = "L'énoncé est obligatoire") String enonce,
            Integer ordre
    ) {
    }
}
