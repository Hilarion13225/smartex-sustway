package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Bailleur;

import java.util.UUID;

public record BailleurDto(UUID id, String code, String nom, String description) {
    public static BailleurDto depuis(Bailleur b) {
        return new BailleurDto(b.getId(), b.getCode(), b.getNom(), b.getDescription());
    }
}
