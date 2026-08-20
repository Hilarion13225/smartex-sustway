package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Document;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DocumentDto(
        UUID id,
        UUID entrepriseId,
        UUID siteId,
        String nomOriginal,
        String typeMime,
        long taille,
        String statutScan,
        OffsetDateTime createdAt
) {
    public static DocumentDto depuis(Document d) {
        return new DocumentDto(
                d.getId(), d.getEntreprise().getId(), d.getSite() != null ? d.getSite().getId() : null,
                d.getNomOriginal(), d.getTypeMime(), d.getTaille(), d.getStatutScan().name(), d.getCreatedAt()
        );
    }
}
