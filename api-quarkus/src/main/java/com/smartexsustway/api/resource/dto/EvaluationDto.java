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
        boolean revueExperteDeclenchee,
        OffsetDateTime dateEvaluation
) {
    public static EvaluationDto depuis(Evaluation e, boolean revueExperteDeclenchee) {
        return new EvaluationDto(
                e.getId(), e.getAuditCritere().getId(), e.getProbabiliteConforme(), e.getNote(),
                e.getConfianceIa(), e.getJustification(), e.getSource().name(), e.getStatut().name(),
                revueExperteDeclenchee, e.getDateEvaluation()
        );
    }
}
