package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Referentiel;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ReferentielDto(UUID id, String code, String nom, String type, String version, String description,
                             String statut,
                             /** Date d'ajout au catalogue — la table ne porte pas de date de modification. */
                             OffsetDateTime createdAt) {
    public static ReferentielDto depuis(Referentiel r) {
        return new ReferentielDto(
                r.getId(), r.getCode(), r.getNom(), r.getType().name(), r.getVersion(), r.getDescription(),
                r.getStatut().name(), r.getCreatedAt()
        );
    }
}
