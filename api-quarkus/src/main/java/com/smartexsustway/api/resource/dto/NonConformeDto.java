package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.NonConforme;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Vue d'une non-conformité (module 11, RG17). */
public record NonConformeDto(
        UUID id,
        UUID evaluationId,
        UUID auditCritereId,
        String critereCode,
        String critereLibelle,
        String titre,
        String description,
        String niveau,
        BigDecimal risqueAttendu,
        String statut,
        OffsetDateTime createdAt,
        int nombreActionsCorrectives
) {
    public static NonConformeDto depuis(NonConforme nc, int nombreActionsCorrectives) {
        var auditCritere = nc.getEvaluation().getAuditCritere();
        return new NonConformeDto(
                nc.getId(),
                nc.getEvaluation().getId(),
                auditCritere.getId(),
                auditCritere.getCritere().getCode(),
                auditCritere.getCritere().getLibelle(),
                nc.getTitre(),
                nc.getDescription(),
                nc.getNiveau().name(),
                nc.getRisqueAttendu(),
                nc.getStatut().name(),
                nc.getCreatedAt(),
                nombreActionsCorrectives
        );
    }
}
