package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Evaluation;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record EvaluationDto(
        UUID id,
        UUID auditCritereId,
        BigDecimal probabiliteConforme,
        short niveauEngagement,
        BigDecimal confianceIa,
        String justification,
        String source,
        String statut,
        OffsetDateTime dateEvaluation,
        Boolean signalRisque,
        String categorieRisque,
        String justificationRisque,
        Boolean recommandationNecessaire,
        String pistesAmelioration
) {
    public static EvaluationDto depuis(Evaluation e) {
        return new EvaluationDto(
                e.getId(), e.getAuditCritere().getId(), e.getProbabiliteConforme(), e.getNote(),
                e.getConfianceIa(), e.getJustification(), e.getSource().name(), e.getStatut().name(),
                e.getDateEvaluation(),
                e.getSignalRisque(), e.getCategorieRisque(), e.getJustificationRisque(),
                e.getRecommandationNecessaire(), e.getPistesAmelioration()
        );
    }
}
