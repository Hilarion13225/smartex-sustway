package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

/**
 * Rattachement d'un collaborateur déjà inscrit à l'entreprise (RG05).
 * L'utilisateur est désigné par son e-mail : la création de compte reste du
 * ressort de l'inscription, l'entreprise n'accorde ici qu'un accès.
 * {@code siteId} est optionnel — sans site, l'accès porte sur l'entreprise
 * entière.
 */
public record MembreCreateRequest(
        @NotBlank(message = "L'e-mail du collaborateur est obligatoire")
        @Email(message = "E-mail invalide")
        String email,

        @NotBlank(message = "Le rôle est obligatoire")
        String roleCode,

        UUID siteId
) {
}
