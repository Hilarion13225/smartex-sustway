package com.smartexsustway.api.resource.dto;

/** Vue d'une surcharge de criticité pour un critère et un secteur donnés (RG37). */
public record CriticiteSecteurDto(
        String secteurCode,
        String secteurNom,
        String criticiteCode,
        String criticiteLibelle
) {
}
