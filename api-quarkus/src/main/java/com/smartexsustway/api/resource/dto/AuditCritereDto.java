package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.AuditCritere;

import java.math.BigDecimal;
import java.util.UUID;

public record AuditCritereDto(
        UUID id,
        String critereCode,
        String critereLibelle,
        String domaineCode,
        String criticite,
        BigDecimal coefficientPonderation,
        boolean actif,
        boolean applicable,
        String statut
) {
    public static AuditCritereDto depuis(AuditCritere ac) {
        return new AuditCritereDto(
                ac.getId(),
                ac.getCritere().getCode(),
                ac.getCritere().getLibelle(),
                ac.getCritere().getDomaine().getCode(),
                ac.getCriticite() != null ? ac.getCriticite().getCode().name() : null,
                ac.getCoefficientPonderation(),
                ac.isActif(),
                ac.isApplicable(),
                ac.getStatut()
        );
    }
}
