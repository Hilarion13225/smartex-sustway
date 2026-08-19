package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Site;

import java.util.UUID;

public record SiteDto(
        UUID id,
        UUID entrepriseId,
        String paysCodeIso2,
        String paysNom,
        String nom,
        String adresse,
        String ville,
        String codePostal,
        String statut
) {
    public static SiteDto depuis(Site s) {
        return new SiteDto(
                s.getId(),
                s.getEntreprise().getId(),
                s.getPays().getCodeIsoAlpha2(),
                s.getPays().getNom(),
                s.getNom(),
                s.getAdresse(),
                s.getVille(),
                s.getCodePostal(),
                s.getStatut().name()
        );
    }
}
