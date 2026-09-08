package com.smartexsustway.api.resource.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Déclaration enregistrée sur un critère.
 *
 * Volontairement distincte d'EvaluationDto : une déclaration n'est pas une
 * évaluation et ne porte ni note ni probabilité — la renvoyer sous la même
 * forme laisserait croire qu'elle compte dans le score.
 */
public record DeclarationCritereDto(
        UUID auditCritereId,
        Integer niveauDeclare,
        String statutCritere,
        OffsetDateTime dateDeclaration
) {
}
