package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;

public record TelephoneRequest(
        @NotBlank(message = "Le numéro de téléphone est obligatoire pour la 2FA par SMS")
        String telephone
) {
}
