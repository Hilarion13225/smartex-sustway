package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Corps de la requête de génération d'un rapport (module 12).
 * {@code bailleurCode} n'est requis que pour le type INDICE_FINANCEMENTS_VERTS
 * (validé manuellement dans RapportResource, pas via @NotBlank, puisqu'il
 * est optionnel pour les 3 autres types).
 */
public record RapportCreateRequest(
        @NotBlank String type,
        @NotBlank String format,
        String bailleurCode
) {
}
