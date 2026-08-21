package com.smartexsustway.api.resource.dto;

/** Tous les champs sont optionnels : seuls les champs non-null du corps sont appliqués. */
public record DomaineUpdateRequestDto(
        String nom,
        String description,
        Integer ordre
) {
}
