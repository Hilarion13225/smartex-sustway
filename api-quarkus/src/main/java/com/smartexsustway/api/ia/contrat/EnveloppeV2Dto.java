package com.smartexsustway.api.ia.contrat;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Ce que le service d'agents rend : {@code {resultat, execution}}.
 *
 * <p>Les deux blocs ne se mélangent pas, et c'est la raison d'être de
 * l'enveloppe. Le premier dit ce que l'IA a conclu — il alimente
 * l'évaluation et son détail. Le second dit ce qui s'est passé pour
 * l'obtenir — il alimente {@code analyse_ia} et {@code execution_agent},
 * qui sont purgeables sans que le résultat métier en souffre.
 *
 * <p>{@code @JsonIgnoreProperties(ignoreUnknown = true)} partout : le
 * service Python peut enrichir sa réponse sans casser l'API. L'inverse —
 * refuser un champ inconnu — obligerait à déployer les deux services
 * ensemble.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record EnveloppeV2Dto(ResultatDto resultat, ExecutionDto execution) {

    // === Bloc métier ====================================================

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ResultatDto(
            String contrat_version,
            String audit_critere_id,
            List<AnalyseDocumentDto> analyses_documents,
            EvidenceDto evidence,
            RisqueDto risque,
            RecommandationDto recommandation) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AnalyseDocumentDto(
            String piece_reference,
            String nom,
            String resume,
            List<ConstatDto> constats,
            Double confiance_lecture) {
    }

    /** Ce qu'une pièce dit d'une attente. Quatre présences, jamais deux. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ConstatDto(
            String reference,
            String presence,
            List<String> elements_releves,
            List<String> elements_manquants) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record EvidenceDto(
            Boolean couverture_preuve,
            String justification_couverture,
            Double probabilite_conformite,
            Double confiance,
            String justification_conformite,
            List<RattachementDto> elements_manquants,
            List<EvaluationPreuveDto> evaluations) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record EvaluationPreuveDto(
            String reference,
            String couverture,
            List<String> pieces_utilisees,
            List<String> elements_observes,
            List<String> elements_manquants,
            List<String> elements_non_verifiables,
            String conflit,
            String justification) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RattachementDto(String niveau, String reference) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RisqueDto(
            Boolean signal_risque,
            String categorie,
            String justification,
            Double confiance,
            List<SignalDto> signaux) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SignalDto(
            String categorie,
            RattachementDto rattachement,
            List<String> pieces_concernees,
            String justification) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RecommandationDto(
            Boolean recommandation_necessaire,
            String pistes_amelioration,
            List<ActionDto> actions) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ActionDto(String action, RattachementDto rattachement) {
    }

    // === Bloc technique =================================================

    /**
     * Métadonnées d'exécution. Aucun champ ne peut porter de donnée client :
     * que des identifiants, des mesures et des catégories.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ExecutionDto(
            String contrat_execution_version,
            String provider,
            String requested_model,
            String statut,
            List<String> agents_executes,
            OffsetDateTime started_at,
            OffsetDateTime finished_at,
            Integer duration_ms,
            List<AppelDto> appels,
            List<ErreurDto> erreurs) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AppelDto(
            String agent,
            String piece_reference,
            String statut,
            String provider,
            String requested_model,
            String served_model,
            String response_id,
            OffsetDateTime started_at,
            OffsetDateTime finished_at,
            Integer duration_ms,
            UsageDto usage,
            ErreurDto error) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record UsageDto(
            Integer prompt_token_count,
            Integer candidates_token_count,
            Integer total_token_count) {
    }

    /** {@code message} arrive déjà assaini par le service Python. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ErreurDto(String type, String message) {
    }
}
