package com.smartexsustway.api.resource.dto;

/** Tous les champs sont optionnels : seuls les champs non-null du corps sont appliqués. */
public record CritereUpdateRequestDto(
        String libelle,
        String description,
        String applicabilite,
        String criticiteCode,
        Boolean actif
) {
}
