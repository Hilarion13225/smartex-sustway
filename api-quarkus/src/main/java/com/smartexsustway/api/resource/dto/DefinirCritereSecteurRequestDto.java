package com.smartexsustway.api.resource.dto;

/** Rattache un critère à un secteur, ou révoque ce rattachement. */
public record DefinirCritereSecteurRequestDto(
        String secteurCode,
        /** Absent vaut « applicable » : on rattache pour inclure, pas pour exclure. */
        Boolean applicable
) {
}
