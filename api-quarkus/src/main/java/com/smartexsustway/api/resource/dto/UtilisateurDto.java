package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Utilisateur;

import java.util.UUID;

/** Représentation publique d'un utilisateur — ne porte jamais motDePasseHash. */
public record UtilisateurDto(
        UUID id,
        String nom,
        String prenom,
        String email,
        boolean emailVerifie,
        boolean deuxfaActive,
        String statut
) {
    public static UtilisateurDto depuis(Utilisateur u) {
        return new UtilisateurDto(
                u.getId(), u.getNom(), u.getPrenom(), u.getEmail(),
                u.isEmailVerifie(), u.isDeuxfaActive(), u.getStatut().name()
        );
    }
}
