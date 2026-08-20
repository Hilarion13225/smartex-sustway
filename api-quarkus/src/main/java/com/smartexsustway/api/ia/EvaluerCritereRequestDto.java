package com.smartexsustway.api.ia;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.UUID;

/**
 * Miroir du contrat exposé par POST /api/v1/evaluations/critere
 * (services-ia-python, Pydantic — champs en snake_case). Mapping explicite
 * via @JsonProperty : Jackson sérialise les records Java en camelCase par
 * défaut, ce qui ne correspondrait pas silencieusement au contrat FastAPI
 * sans cette annotation sur chaque champ.
 */
public record EvaluerCritereRequestDto(
        @JsonProperty("audit_critere_id") UUID auditCritereId,
        @JsonProperty("critere_code") String critereCode,
        @JsonProperty("critere_libelle") String critereLibelle,
        @JsonProperty("critere_description") String critereDescription,
        @JsonProperty("documents") List<DocumentPourEvaluationDto> documents
) {
    public record DocumentPourEvaluationDto(
            @JsonProperty("nom") String nom,
            @JsonProperty("type_mime") String typeMime,
            @JsonProperty("contenu_base64") String contenuBase64
    ) {
    }
}
