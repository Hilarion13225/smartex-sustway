package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Referentiel;

import java.util.UUID;

public record ReferentielDto(UUID id, String code, String nom, String type, String version, String description, String statut) {
    public static ReferentielDto depuis(Referentiel r) {
        return new ReferentielDto(
                r.getId(), r.getCode(), r.getNom(), r.getType().name(), r.getVersion(), r.getDescription(),
                r.getStatut().name()
        );
    }
}
