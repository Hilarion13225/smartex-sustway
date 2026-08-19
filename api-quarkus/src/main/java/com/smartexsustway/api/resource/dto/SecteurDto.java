package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Secteur;

import java.util.UUID;

public record SecteurDto(UUID id, String code, String nom) {
    public static SecteurDto depuis(Secteur s) {
        return new SecteurDto(s.getId(), s.getCode(), s.getNom());
    }
}
