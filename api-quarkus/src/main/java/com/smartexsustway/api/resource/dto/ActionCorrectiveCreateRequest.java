package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Corps de la requête de création d'une action corrective (RG18).
 * {@code responsableId} et {@code dateEcheance} sont optionnels : une
 * action peut être créée avant d'être assignée. {@code priorite} est
 * optionnelle, par défaut MOYENNE (voir ActionCorrectiveResource).
 */
public record ActionCorrectiveCreateRequest(
        @NotBlank String titre,
        String description,
        UUID responsableId,
        LocalDate dateEcheance,
        String priorite
) {
}
