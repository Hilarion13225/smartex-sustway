package com.smartexsustway.api.resource.dto;

import java.math.BigDecimal;

/** Pondération d'un critère pour un secteur donné. */
public record CoefficientSecteurDto(
        String secteurCode,
        String secteurNom,
        BigDecimal coefficient
) {
}
