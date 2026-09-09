package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Création ou modification d'une preuve attendue. */
public record PreuveAttendueRequestDto(
        String type,

        @Size(max = 300, message = "Le libellé ne peut dépasser 300 caractères")
        String libelle,

        String description,

        Boolean obligatoire,

        Integer ordre
) {
    public record Creation(
            String type,
            @NotBlank(message = "Le libellé est obligatoire")
            @Size(max = 300) String libelle,
            String description,
            Boolean obligatoire,
            Integer ordre
    ) {
    }
}
