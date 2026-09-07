package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Projet;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** Vue d'un projet d'audit multi-organisations. */
public record ProjetDto(
        UUID id,
        String nom,
        String description,
        String referentielCode,
        String referentielNom,
        LocalDate dateDebut,
        LocalDate dateFin,
        String statut,
        int nombreEntreprises,
        OffsetDateTime createdAt,
        /** Renseigné sur le détail uniquement ; vide dans la liste. */
        List<LigneDto> entreprises
) {
    /** Une organisation du projet et la mission créée pour elle. */
    public record LigneDto(
            UUID entrepriseId,
            String raisonSociale,
            UUID auditId,
            String auditNom,
            String auditStatut
    ) {
    }

    public static ProjetDto depuis(Projet p, int nombreEntreprises) {
        return depuis(p, nombreEntreprises, List.of());
    }

    public static ProjetDto depuis(Projet p, int nombreEntreprises, List<LigneDto> lignes) {
        return new ProjetDto(
                p.getId(), p.getNom(), p.getDescription(),
                p.getReferentiel().getCode(), p.getReferentiel().getNom(),
                p.getDateDebut(), p.getDateFin(), p.getStatut(),
                nombreEntreprises, p.getCreatedAt(), lignes);
    }
}
