package com.smartexsustway.api.resource.dto;

import java.util.List;

/** Saisie déclarative d'un critère de mission : scénario textuel + réponses au questionnaire. */
public record SaisieCritereDto(
        String scenario,
        List<QuestionMissionDto> questions
) {
}
