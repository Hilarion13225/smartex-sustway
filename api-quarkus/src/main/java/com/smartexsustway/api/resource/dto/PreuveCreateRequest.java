package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

/** RG15 : un document peut servir de preuve à plusieurs critères de la mission. */
public record PreuveCreateRequest(
        @NotNull(message = "L'identifiant du document est obligatoire")
        UUID documentId,

        String description,

        /** PIECE | JUSTIFICATIF | AUTRE — PIECE si absent. */
        String type,

        @NotEmpty(message = "Au moins un critère doit être associé à cette preuve")
        List<UUID> auditCritereIds
) {
}
