package com.smartexsustway.api.resource.dto;

import java.math.BigDecimal;

/** Pose ou remplace la pondération d'un critère pour un secteur. */
public record DefinirCoefficientSecteurRequestDto(
        String secteurCode,
        BigDecimal coefficient
) {
}
