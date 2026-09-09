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
        /** Ce que le critère exige de l'organisation (V50). Vide si rien n'a été rédigé. */
        @JsonProperty("exigences") List<ExigenceDto> exigences,
        /** Ce que l'audit attend en démonstration (V51), rattaché à une exigence par son code. */
        @JsonProperty("preuves_attendues") List<PreuveAttendueDto> preuvesAttendues,
        /** Comment confronter le fourni à l'exigé (V52), rendu en prompt par le service. */
        @JsonProperty("regles_analyse") List<RegleAnalyseDto> reglesAnalyse,
        @JsonProperty("documents") List<DocumentPourEvaluationDto> documents,
        @JsonProperty("scenario") String scenario,
        @JsonProperty("reponses") List<ReponseDeclareeDto> reponses,
        @JsonProperty("analyse_risque") boolean analyseRisque,
        @JsonProperty("generer_recommandation") boolean genererRecommandation
) {
    /** Une exigence du critère, désignée par son code dans les règles et les preuves attendues. */
    public record ExigenceDto(
            @JsonProperty("code") String code,
            @JsonProperty("intitule") String intitule,
            @JsonProperty("enonce") String enonce
    ) {
    }

    /**
     * Ce que l'audit attend pour démontrer une exigence — à ne pas confondre
     * avec les documents ci-dessous, qui sont ce que l'organisation a
     * réellement déposé.
     */
    public record PreuveAttendueDto(
            @JsonProperty("exigence_code") String exigenceCode,
            @JsonProperty("type") String type,
            @JsonProperty("libelle") String libelle,
            @JsonProperty("description") String description,
            @JsonProperty("obligatoire") boolean obligatoire
    ) {
    }

    /**
     * Une règle d'analyse et sa portée. `exigence_code` et
     * `preuve_attendue_libelle` sont nuls quand la règle porte sur le
     * critère entier.
     */
    public record RegleAnalyseDto(
            @JsonProperty("code") String code,
            @JsonProperty("type") String type,
            @JsonProperty("libelle") String libelle,
            @JsonProperty("severite") String severite,
            @JsonProperty("exigence_code") String exigenceCode,
            @JsonProperty("preuve_attendue_libelle") String preuveAttendueLibelle,
            @JsonProperty("definition") java.util.Map<String, Object> definition
    ) {
    }

    public record DocumentPourEvaluationDto(
            @JsonProperty("nom") String nom,
            @JsonProperty("type_mime") String typeMime,
            @JsonProperty("contenu_base64") String contenuBase64
    ) {
    }

    /** RG09 — réponse déclarative de l'entreprise à une question du critère. */
    public record ReponseDeclareeDto(
            @JsonProperty("question") String question,
            @JsonProperty("valeur") String valeur,
            @JsonProperty("commentaire") String commentaire
    ) {
    }
}
