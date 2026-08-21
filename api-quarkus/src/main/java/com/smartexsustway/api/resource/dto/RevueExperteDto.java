package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.RevueExperte;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Vue d'une entrée de la file de revue experte (module 9, RG22/RG38). */
public record RevueExperteDto(
        UUID id,
        UUID evaluationId,
        UUID auditCritereId,
        String critereCode,
        String critereLibelle,
        String statut,
        BigDecimal probabiliteInitiale,
        Short noteInitiale,
        BigDecimal probabiliteFinale,
        Short noteFinale,
        String commentaire,
        UUID expertId,
        OffsetDateTime dateAttribution,
        OffsetDateTime dateCompletion
) {
    public static RevueExperteDto depuis(RevueExperte r) {
        var auditCritere = r.getEvaluation().getAuditCritere();
        return new RevueExperteDto(
                r.getId(),
                r.getEvaluation().getId(),
                auditCritere.getId(),
                auditCritere.getCritere().getCode(),
                auditCritere.getCritere().getLibelle(),
                r.getStatut().name(),
                r.getProbabiliteInitiale(),
                r.getNoteInitiale(),
                r.getProbabiliteFinale(),
                r.getNoteFinale(),
                r.getCommentaire(),
                r.getExpert() == null ? null : r.getExpert().getId(),
                r.getDateAttribution(),
                r.getDateCompletion()
        );
    }
}
