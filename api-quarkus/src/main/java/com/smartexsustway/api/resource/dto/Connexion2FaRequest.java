package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;

public record Connexion2FaRequest(
        @NotBlank String tokenPreAuth,
        @NotBlank String code
) {
}
