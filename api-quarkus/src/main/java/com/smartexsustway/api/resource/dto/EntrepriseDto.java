package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Entreprise;

import java.util.UUID;

public record EntrepriseDto(
        UUID id,
        String raisonSociale,
        String identifiantLegal,
        String secteurCode,
        String taille,
        String statut,
        String formuleCode
) {
    public static EntrepriseDto depuis(Entreprise e) {
        return depuis(e, null);
    }

    /**
     * formuleCode est nécessaire côté frontend pour restreindre la navigation
     * selon RESTRICTIONS_PAR_PLAN (ex. « Financements verts » masqué hors
     * formule Avancées) — sans elle, un appelant qui n'a pas encore résolu
     * l'abonnement le plus récent de l'entreprise (ex. lister() en accès
     * global) peut passer null explicitement.
     */
    public static EntrepriseDto depuis(Entreprise e, String formuleCode) {
        return new EntrepriseDto(
                e.getId(),
                e.getRaisonSociale(),
                e.getIdentifiantLegal(),
                e.getSecteur() != null ? e.getSecteur().getCode() : null,
                e.getTaille() != null ? e.getTaille().name() : null,
                e.getStatut().name(),
                formuleCode
        );
    }
}
