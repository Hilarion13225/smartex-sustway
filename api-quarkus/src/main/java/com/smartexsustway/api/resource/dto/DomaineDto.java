package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Domaine;

import java.util.UUID;

public record DomaineDto(UUID id, String code, String nom, String description, int ordre) {
    public static DomaineDto depuis(Domaine d) {
        return new DomaineDto(d.getId(), d.getCode(), d.getNom(), d.getDescription(), d.getOrdre());
    }
}
