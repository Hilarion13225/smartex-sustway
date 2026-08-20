package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/** RG10/RG11 : une mission concerne une entreprise et un référentiel donnés, sur une période définie. */
public record AuditCreateRequest(
        @NotBlank(message = "Le code du référentiel est obligatoire (ex. SMARTEX_SUSTWAY)")
        String referentielCode,

        @NotBlank(message = "Le nom de la mission est obligatoire")
        String nom,

        String description,

        @NotNull(message = "La date de début est obligatoire")
        LocalDate dateDebut,

        LocalDate dateFin
) {
}
