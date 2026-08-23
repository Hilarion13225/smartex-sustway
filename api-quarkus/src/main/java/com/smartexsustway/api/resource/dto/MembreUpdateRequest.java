package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

/** Modification du rôle ou du périmètre d'un accès existant (RG05). */
public record MembreUpdateRequest(
        @NotBlank(message = "Le rôle est obligatoire")
        String roleCode,

        UUID siteId
) {
}
