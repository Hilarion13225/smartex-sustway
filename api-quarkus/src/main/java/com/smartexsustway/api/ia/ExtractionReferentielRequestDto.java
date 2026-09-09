package com.smartexsustway.api.ia;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

/**
 * Miroir du contrat exposé par POST /api/v1/referentiels/imports/extraction
 * (services-ia-python, Pydantic — champs en snake_case). Mapping explicite
 * via @JsonProperty : Jackson sérialise les records Java en camelCase par
 * défaut, ce qui ne correspondrait pas silencieusement au contrat FastAPI.
 */
public record ExtractionReferentielRequestDto(
        @JsonProperty("import_id") UUID importId,
        @JsonProperty("nom_fichier") String nomFichier,
        @JsonProperty("type_mime") String typeMime,
        @JsonProperty("contenu_base64") String contenuBase64
) {
}
