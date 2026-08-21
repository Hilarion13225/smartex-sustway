package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Rapport;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Vue d'un rapport généré pour une mission d'audit (module 12). */
public record RapportDto(
        UUID id,
        UUID auditId,
        String type,
        String format,
        String version,
        UUID generePar,
        String generePasNom,
        OffsetDateTime createdAt
) {
    public static RapportDto depuis(Rapport r) {
        var auteur = r.getGenerePar();
        return new RapportDto(
                r.getId(),
                r.getAudit().getId(),
                r.getType().name(),
                r.getFormat().name(),
                r.getVersion(),
                auteur == null ? null : auteur.getId(),
                auteur == null ? null : (auteur.getPrenom() + " " + auteur.getNom()),
                r.getCreatedAt()
        );
    }
}
