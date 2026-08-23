package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Changement de mot de passe par un utilisateur déjà connecté — exige l'ancien pour confirmer sa présence. */
public record ChangerMotDePasseRequest(
        @NotBlank(message = "Le mot de passe actuel est obligatoire")
        String ancienMotDePasse,

        @NotBlank(message = "Le nouveau mot de passe est obligatoire")
        @Size(min = 10, message = "Le mot de passe doit contenir au moins 10 caractères")
        String nouveauMotDePasse
) {
}
