package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.enums.ValeurReponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

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
    /**
     * {@code niveau} (1 à 5) porte la réponse depuis le passage à l'échelle de
     * maturité ; {@code valeur} reste accepté pour les clients antérieurs.
     */
    public record ReponseSaisieDto(
            UUID auditQuestionId,
            ValeurReponse valeur,
            @Min(1) @Max(5) Integer niveau,
            String commentaire
    ) {
    }
}
