package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.FormuleAbonnement;

import java.math.BigDecimal;
import java.util.UUID;

public record FormuleAbonnementDto(
        UUID id,
        String code,
        String nom,
        String description,
        BigDecimal prix
) {
    public static FormuleAbonnementDto depuis(FormuleAbonnement f) {
        return new FormuleAbonnementDto(f.getId(), f.getCode(), f.getNom(), f.getDescription(), f.getPrix());
    }
}
