package com.smartexsustway.api.resource.dto;

/** Tous les champs sont optionnels : seuls les champs non-null du corps sont appliqués. */
public record ReferentielUpdateRequestDto(
        String nom,
        String description,
        String version,
        String statut
) {
}
