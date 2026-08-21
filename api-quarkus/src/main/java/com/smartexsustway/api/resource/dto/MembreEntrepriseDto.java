package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Rattachement d'un utilisateur à une entreprise, tel qu'affiché par
 * l'écran « Utilisateurs et permissions » (RG05) : qui a accès, avec quel
 * rôle et sur quel périmètre (entreprise entière ou site précis). Les
 * droits attachés au rôle sont dérivés côté client du modèle rôle ×
 * formule (auth/permissions.js).
 */
public record MembreEntrepriseDto(
        UUID id,
        UUID utilisateurId,
        String nom,
        String prenom,
        String email,
        boolean deuxfaActive,
        String roleCode,
        String roleNom,
        UUID siteId,
        String siteNom,
        String statut,
        OffsetDateTime dateAffectation
) {
    public static MembreEntrepriseDto depuis(UtilisateurEntreprise rattachement) {
        var utilisateur = rattachement.getUtilisateur();
        var role = rattachement.getRole();
        var site = rattachement.getSite();
        return new MembreEntrepriseDto(
                rattachement.getId(),
                utilisateur.getId(),
                utilisateur.getNom(),
                utilisateur.getPrenom(),
                utilisateur.getEmail(),
                utilisateur.isDeuxfaActive(),
                role.getCode(),
                role.getNom(),
                site != null ? site.getId() : null,
                site != null ? site.getNom() : null,
                rattachement.getStatut().name(),
                rattachement.getDateAffectation()
        );
    }
}
