package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;

public record ConnexionRequest(
        @NotBlank String email,
        @NotBlank String motDePasse
) {
}
