package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Abonnement;

import java.time.LocalDate;
import java.util.UUID;

public record AbonnementDto(
        UUID id,
        UUID entrepriseId,
        String formuleCode,
        String formuleNom,
        String periodicite,
        LocalDate dateDebut,
        LocalDate dateFin,
        String statut
) {
    public static AbonnementDto depuis(Abonnement a) {
        return new AbonnementDto(
                a.getId(),
                a.getEntreprise().getId(),
                a.getFormule().getCode(),
                a.getFormule().getNom(),
                a.getPeriodicite() != null ? a.getPeriodicite().name() : null,
                a.getDateDebut(),
                a.getDateFin(),
                a.getStatut().name()
        );
    }
}
