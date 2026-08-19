package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;

/** RG04 : une entreprise peut posséder plusieurs sites. */
public record SiteRequest(
        @NotBlank(message = "Le nom du site est obligatoire")
        String nom,

        String adresse,
        String ville,
        String codePostal,

        @NotBlank(message = "Le code pays (ISO alpha-2) est obligatoire")
        String paysCodeIso2
) {
}
