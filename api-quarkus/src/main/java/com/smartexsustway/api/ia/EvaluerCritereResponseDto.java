package com.smartexsustway.api.ia;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.UUID;

/** Miroir de EvaluerCritereResponse (Pydantic, services-ia-python) — champs en snake_case. */
public record EvaluerCritereResponseDto(
        @JsonProperty("audit_critere_id") UUID auditCritereId,
        @JsonProperty("probabilite_conformite") double probabiliteConformite,
        @JsonProperty("confiance_ia") double confianceIa,
        @JsonProperty("couverture_preuve") boolean couverturePreuve,
        @JsonProperty("justification") String justification,
        @JsonProperty("documents_analyses") List<DocumentAnalyseDto> documentsAnalyses,
        // Non-null uniquement si analyseRisque était vrai dans la requête
        // (Risk Agent, formule Avancées — voir EvaluationResource).
        @JsonProperty("signal_risque") Boolean signalRisque,
        @JsonProperty("categorie_risque") String categorieRisque,
        @JsonProperty("justification_risque") String justificationRisque,
        // Non-null uniquement si genererRecommandation était vrai dans la
        // requête (Recommendation Agent, formule Avancées).
        @JsonProperty("recommandation_necessaire") Boolean recommandationNecessaire,
        @JsonProperty("pistes_amelioration") String pistesAmelioration
) {
    public record DocumentAnalyseDto(
            @JsonProperty("nom") String nom,
            @JsonProperty("resume") String resume
    ) {
    }
}
