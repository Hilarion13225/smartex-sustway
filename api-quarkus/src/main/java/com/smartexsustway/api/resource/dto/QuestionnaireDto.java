package com.smartexsustway.api.resource.dto;

import java.util.List;

public record QuestionnaireDto(String referentielCode, int nombreCriteres, List<CritereDto> criteres) {
}
