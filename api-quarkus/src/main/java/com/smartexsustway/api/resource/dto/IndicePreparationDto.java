package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.IndicePreparation;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/** RG41/RG42/RG43 : indice de préparation bailleur — un alignement mesuré, jamais une garantie d'éligibilité. */
public record IndicePreparationDto(
        UUID id,
        UUID auditId,
        String bailleurCode,
        String bailleurNom,
        BigDecimal score,
        OffsetDateTime dateCalcul
) {
    public static IndicePreparationDto depuis(IndicePreparation i) {
        return new IndicePreparationDto(
                i.getId(),
                i.getAudit().getId(),
                i.getBailleur().getCode(),
                i.getBailleur().getNom(),
                i.getScore(),
                i.getDateCalcul()
        );
    }
}
