package com.smartexsustway.api.resource.dto;

/** Secteur auquel un critère réservé s'applique. */
public record CritereSecteurDto(
        String secteurCode,
        String secteurNom,
        Boolean applicable
) {
}
