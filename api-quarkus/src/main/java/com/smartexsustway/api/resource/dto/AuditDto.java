package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Audit;

import java.time.LocalDate;
import java.util.UUID;

public record AuditDto(
        UUID id,
        UUID entrepriseId,
        String referentielCode,
        String nom,
        String description,
        LocalDate dateDebut,
        LocalDate dateFin,
        String statut,
        int nombreCriteres
) {
    public static AuditDto depuis(Audit a, int nombreCriteres) {
        return new AuditDto(
                a.getId(), a.getEntreprise().getId(), a.getReferentiel().getCode(),
                a.getNom(), a.getDescription(), a.getDateDebut(), a.getDateFin(),
                a.getStatut().name(), nombreCriteres
        );
    }
}
