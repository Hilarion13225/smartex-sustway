package com.smartexsustway.api.resource.dto;

/** Corps de requête PUT pour poser une surcharge de criticité sectorielle (RG37). */
public record DefinirCriticiteSecteurRequestDto(
        String secteurCode,
        String criticiteCode
) {
}
