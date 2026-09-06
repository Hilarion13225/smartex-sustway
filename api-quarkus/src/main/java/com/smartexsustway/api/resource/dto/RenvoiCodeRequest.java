package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Demande d'un nouveau code d'activation (RG36). */
public record RenvoiCodeRequest(
        @NotBlank(message = "L'email est obligatoire")
        @Email(message = "Format d'email invalide")
        String email
) {
}
