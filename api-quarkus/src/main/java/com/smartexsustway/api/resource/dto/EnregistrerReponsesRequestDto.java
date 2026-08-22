package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.enums.ValeurReponse;

import java.util.List;
import java.util.UUID;

/**
 * Saisie déclarative d'un critère : réponses au questionnaire (RG09) et
 * scénario textuel décrivant la situation de l'entreprise, tous deux
 * transmis ensuite au pipeline d'agents IA en complément des preuves.
 */
public record EnregistrerReponsesRequestDto(
        String scenario,
        List<ReponseSaisieDto> reponses
) {
    public record ReponseSaisieDto(
            UUID auditQuestionId,
            ValeurReponse valeur,
            String commentaire
    ) {
    }
}
