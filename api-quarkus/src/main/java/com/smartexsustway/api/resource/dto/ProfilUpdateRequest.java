package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;

/** Modification du profil par le titulaire du compte lui-même (Profil & sécurité) — jamais l'email ni le mot de passe. */
public record ProfilUpdateRequest(
        @NotBlank(message = "Le nom est obligatoire")
        String nom,

        @NotBlank(message = "Le prénom est obligatoire")
        String prenom,

        String telephone
) {
}
