package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.ActionCorrective;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Vue d'une action corrective (module 11, RG18). */
public record ActionCorrectiveDto(
        UUID id,
        UUID nonConformeId,
        String titre,
        String description,
        UUID responsableId,
        String responsableNom,
        LocalDate dateEcheance,
        String statut,
        String priorite,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public static ActionCorrectiveDto depuis(ActionCorrective ac) {
        var responsable = ac.getResponsable();
        return new ActionCorrectiveDto(
                ac.getId(),
                ac.getNonConforme().getId(),
                ac.getTitre(),
                ac.getDescription(),
                responsable == null ? null : responsable.getId(),
                responsable == null ? null : (responsable.getPrenom() + " " + responsable.getNom()),
                ac.getDateEcheance(),
                ac.getStatut().name(),
                ac.getPriorite().name(),
                ac.getCreatedAt(),
                ac.getUpdatedAt()
        );
    }
}
