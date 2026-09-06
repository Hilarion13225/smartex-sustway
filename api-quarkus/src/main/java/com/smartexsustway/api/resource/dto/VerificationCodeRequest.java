package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Activation d'un compte par code à usage unique (RG36). */
public record VerificationCodeRequest(
        @NotBlank(message = "L'email est obligatoire")
        @Email(message = "Format d'email invalide")
        String email,

        @NotBlank(message = "Le code est obligatoire")
        @Pattern(regexp = "\\d{6}", message = "Le code comporte six chiffres")
        String code
) {
}
