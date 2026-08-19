package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Entreprise;

import java.util.UUID;

public record EntrepriseDto(
        UUID id,
        String raisonSociale,
        String identifiantLegal,
        String secteurCode,
        String taille,
        String statut
) {
    public static EntrepriseDto depuis(Entreprise e) {
        return new EntrepriseDto(
                e.getId(),
                e.getRaisonSociale(),
                e.getIdentifiantLegal(),
                e.getSecteur() != null ? e.getSecteur().getCode() : null,
                e.getTaille() != null ? e.getTaille().name() : null,
                e.getStatut().name()
        );
    }
}
