package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Création du compte de l'invité, à l'acceptation d'une invitation (RG05). */
public record AccepterInvitationRequest(
        @NotBlank(message = "Le nom est obligatoire")
        String nom,

        @NotBlank(message = "Le prénom est obligatoire")
        String prenom,

        @NotBlank(message = "Le mot de passe est obligatoire")
        @Size(min = 10, message = "Le mot de passe doit contenir au moins 10 caractères")
        String motDePasse
) {
}
