package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Création d'un projet : un référentiel, une période, et les organisations à
 * auditer. Une mission est créée pour chacune (voir ProjetResource).
 */
public record ProjetCreateRequest(
        @NotBlank(message = "Le nom du projet est obligatoire")
        String nom,

        String description,

        @NotBlank(message = "Le référentiel est obligatoire")
        String referentielCode,

        @NotNull(message = "La date de début est obligatoire")
        LocalDate dateDebut,

        LocalDate dateFin,

        @NotEmpty(message = "Sélectionnez au moins une organisation")
        List<UUID> entrepriseIds
) {
}
