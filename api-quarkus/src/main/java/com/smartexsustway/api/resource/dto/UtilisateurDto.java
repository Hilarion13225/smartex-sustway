package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Utilisateur;

import java.util.UUID;

/** Représentation publique d'un utilisateur — ne porte jamais motDePasseHash ni deuxfaSecret. */
public record UtilisateurDto(
        UUID id,
        String nom,
        String prenom,
        String email,
        String telephone,
        boolean emailVerifie,
        boolean deuxfaActive,
        String deuxfaMethode,
        String statut
) {
    public static UtilisateurDto depuis(Utilisateur u) {
        return new UtilisateurDto(
                u.getId(), u.getNom(), u.getPrenom(), u.getEmail(), u.getTelephone(),
                u.isEmailVerifie(), u.isDeuxfaActive(),
                u.getDeuxfaMethode() != null ? u.getDeuxfaMethode().name() : null,
                u.getStatut().name()
        );
    }
}
