package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;

import java.util.UUID;

/**
 * Une personne à qui un plan ou une action peut être confié.
 *
 * <p>Volontairement pauvre : de quoi remplir un sélecteur, et rien de plus.
 * Ni rôle, ni permission, ni statut, ni courriel, ni date de rattachement —
 * désigner un responsable ne demande pas de connaître son compte. Le DTO
 * complet des membres ({@code MembreEntrepriseDto}) porte ces informations et
 * reste réservé à l'administration des accès.
 *
 * <p>{@code utilisateurId} est l'identifiant attendu par les routes
 * d'affectation ; il n'a pas vocation à être affiché, le nom étant là pour
 * cela.
 */
public record ResponsableAffectableDto(
        UUID utilisateurId,
        String nom,
        String prenom,
        /** « Prénom Nom », composé ici pour que l'interface n'ait pas à le refaire. */
        String nomComplet
) {
    public static ResponsableAffectableDto depuis(UtilisateurEntreprise rattachement) {
        var utilisateur = rattachement.getUtilisateur();
        return new ResponsableAffectableDto(
                utilisateur.getId(),
                utilisateur.getNom(),
                utilisateur.getPrenom(),
                utilisateur.getPrenom() + " " + utilisateur.getNom());
    }
}
