package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReinitialiserMotDePasseRequest(
        @NotBlank(message = "Le token est obligatoire")
        String token,

        @NotBlank(message = "Le mot de passe est obligatoire")
        @Size(min = 10, message = "Le mot de passe doit contenir au moins 10 caractères")
        String motDePasse
) {
}
