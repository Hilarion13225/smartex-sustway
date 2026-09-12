package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.conformite.RestitutionRisqueService;
import com.smartexsustway.api.domain.entity.AnalyseDocumentConstat;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.entity.EvaluationConstat;
import com.smartexsustway.api.domain.entity.EvaluationPreuve;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Le raisonnement du pipeline V2, rendu lisible.
 *
 * <p>Ces trois structures sont persistées depuis la phase 5.7-C et
 * n'étaient exposées par aucune API : une évaluation rendait un chiffre et
 * un texte, alors que la base portait l'avis attente par attente, les
 * constats pièce par pièce et les signaux rattachés. **Rien n'est ajouté
 * ici** — tout existait déjà.
 *
 * <p>Des enregistrements plats, construits par recopie. Aucune entité JPA
 * n'est exposée : les renvoyer directement entraînerait la sérialisation
 * de relations paresseuses, donc des requêtes imprévues et des cycles.
 *
 * <p>Chaque élément porte l'identifiant de sa cible <em>et</em> son libellé
 * métier. L'identifiant sert le rattachement, le libellé sert la lecture :
 * un auditeur ne reconnaît pas une attente à son UUID.
 */
public record DetailEvaluationV2Dto(
        UUID evaluationId,
        /**
         * Le risque déterministe RG26 — arithmétique, reproductible, et
         * qui montre son calcul.
         */
        RisqueMetierDto risqueMetier,
        /**
         * Le signal du Risk Agent. <strong>Champ distinct, jamais fondu
         * dans le précédent.</strong> Les deux répondent à des questions
         * différentes et n'ont pas la même autorité : l'un est une
         * multiplication, l'autre le jugement d'un modèle de langage.
         */
        SignalIaDto signalIa,
        List<PreuveEvalueeDto> preuves,
        List<ConstatDto> constats,
        List<ConstatDocumentaireDto> constatsDocumentaires) {

    /**
     * Le risque déterministe, avec de quoi le vérifier.
     *
     * <p>{@code explication} porte le calcul en toutes lettres. Un risque
     * déterministe qui ne montre pas d'où il vient se lit comme un avis —
     * et c'est justement ce qui doit le distinguer du signal de l'IA.
     *
     * <p>{@code fige} dit si une valeur a été arrêtée sur la
     * non-conformité au moment de la validation. Avant validation elle
     * n'existe pas, et l'écart entre les deux instants n'est pas une
     * incohérence : c'est le passage du provisoire à l'opposable.
     */
    public record RisqueMetierDto(
            String source,
            BigDecimal probabiliteConformite,
            BigDecimal criticitePoids,
            String criticiteCode,
            BigDecimal risqueAttendu,
            String niveau,
            String explication,
            boolean fige,
            BigDecimal risqueFigeNonConformite,
            String niveauFigeNonConformite) {

        static RisqueMetierDto depuis(RestitutionRisqueService.RisqueMetier source) {
            return new RisqueMetierDto(
                    source.source(), source.probabiliteConformite(), source.criticitePoids(),
                    source.criticiteCode(), source.risqueAttendu(), source.niveau(),
                    source.explication(), source.fige(), source.risqueFigeNonConformite(),
                    source.niveauFigeNonConformite());
        }
    }

    /**
     * Le signal du Risk Agent, et l'avertissement qui va avec.
     *
     * <p>L'avertissement voyage <strong>dans la donnée</strong>, pas
     * seulement à l'écran : un champ qui circule sans lui finit recopié
     * dans un rapport où il passe pour un constat.
     *
     * <p>{@code confiance} est nulle sur les évaluations produites par le
     * chemin V1, dont le contrat ne la prévoyait pas. Elle n'est jamais
     * remplacée par zéro — « inconnue » et « nulle » sont deux
     * affirmations différentes.
     *
     * <p>{@code categorie} est une classification de l'IA. Elle n'est
     * jamais convertie en niveau RG26 : les deux vocabulaires ne décrivent
     * pas la même chose, et les faire correspondre donnerait à une opinion
     * l'autorité d'un calcul.
     */
    public record SignalIaDto(
            String source,
            Boolean present,
            String categorie,
            String justification,
            BigDecimal confiance,
            String avertissement) {

        static final String SOURCE = "RISK_AGENT";
        static final String AVERTISSEMENT =
                "Signal généré par l'IA — aide à l'analyse, sans valeur réglementaire.";

        static SignalIaDto depuis(Evaluation evaluation) {
            if (evaluation.getSignalRisque() == null) {
                // Le Risk Agent n'a pas tourné sur cette évaluation :
                // « absent » n'est pas « aucun risque ».
                return null;
            }
            return new SignalIaDto(
                    SOURCE,
                    evaluation.getSignalRisque(),
                    evaluation.getCategorieRisque(),
                    evaluation.getJustificationRisque(),
                    evaluation.getConfianceRisque(),
                    AVERTISSEMENT);
        }
    }

    /**
     * L'avis de synthèse sur une preuve attendue.
     *
     * <p>{@code couverture} porte quatre valeurs, et la distinction compte :
     * {@code NON_VERIFIABLE} dit qu'on n'a pas pu regarder,
     * {@code INSUFFISANTE} qu'on a regardé. Les confondre ferait porter à
     * l'organisation le coût d'un défaut de lecture — c'est pourquoi
     * {@code elementsNonVerifiables} reste une liste séparée de
     * {@code elementsManquants}.
     */
    public record PreuveEvalueeDto(
            UUID id,
            UUID preuveAttendueId,
            String preuveAttendueLibelle,
            String exigenceCode,
            String couverture,
            String conflit,
            String justification,
            List<String> elementsObserves,
            List<String> elementsManquants,
            List<String> elementsNonVerifiables,
            List<String> piecesUtilisees,
            int ordre) {

        static PreuveEvalueeDto depuis(EvaluationPreuve source) {
            var attente = source.getPreuveAttendue();
            return new PreuveEvalueeDto(
                    source.getId(),
                    attente.getId(),
                    attente.getLibelle(),
                    attente.getExigence() == null ? null : attente.getExigence().getCode(),
                    source.getCouverture().name(),
                    source.getConflit(),
                    source.getJustification(),
                    source.getElementsObserves(),
                    source.getElementsManquants(),
                    source.getElementsNonVerifiables(),
                    source.getPiecesUtilisees(),
                    source.getOrdre());
        }
    }

    /**
     * Une remarque rattachée à un élément du référentiel.
     *
     * <p>{@code nature} sépare le signal du Risk Agent de l'élément
     * manquant relevé par l'agent de conformité. <strong>Un signal de
     * risque IA n'est pas le risque déterministe RG26</strong> et ne doit
     * jamais être présenté comme une vérité réglementaire : il n'entre dans
     * aucun calcul de score ni de priorité.
     */
    public record ConstatDto(
            UUID id,
            String nature,
            String niveauRattachement,
            UUID cibleId,
            String cibleLibelle,
            String categorie,
            String justification,
            List<String> piecesConcernees,
            int ordre) {

        static ConstatDto depuis(EvaluationConstat source) {
            return new ConstatDto(
                    source.getId(),
                    source.getNature().name(),
                    source.getNiveauRattachement().name(),
                    cibleId(source),
                    cibleLibelle(source),
                    source.getCategorie(),
                    source.getJustification(),
                    source.getPiecesConcernees(),
                    source.getOrdre());
        }

        /**
         * Exactement une cible est renseignée — la contrainte
         * {@code evaluation_constat_cible_coherente} le garantit en base.
         */
        private static UUID cibleId(EvaluationConstat source) {
            if (source.getExigence() != null) return source.getExigence().getId();
            if (source.getPreuveAttendue() != null) return source.getPreuveAttendue().getId();
            if (source.getRegleAnalyse() != null) return source.getRegleAnalyse().getId();
            return null;
        }

        private static String cibleLibelle(EvaluationConstat source) {
            if (source.getExigence() != null) return source.getExigence().getCode();
            if (source.getPreuveAttendue() != null) return source.getPreuveAttendue().getLibelle();
            if (source.getRegleAnalyse() != null) return source.getRegleAnalyse().getCode();
            return null;
        }
    }

    /**
     * Ce qu'une pièce dit d'une attente.
     *
     * <p>Plusieurs lignes peuvent porter sur la même attente : c'est ainsi
     * que deux documents qui se contredisent gardent chacun son constat,
     * sans que l'un n'écrase l'autre.
     *
     * <p><strong>Aucun contenu de document n'est exposé</strong> — ni les
     * octets, ni le texte intégral. Seul le nom de la pièce et le constat
     * structuré qu'en a tiré le Document Agent, ce pour quoi ces lignes ont
     * été écrites.
     */
    public record ConstatDocumentaireDto(
            UUID id,
            UUID analyseDocumentId,
            String documentNom,
            String pieceReference,
            UUID preuveAttendueId,
            String preuveAttendueLibelle,
            String presence,
            List<String> elementsReleves,
            List<String> elementsManquants,
            int ordre) {

        static ConstatDocumentaireDto depuis(AnalyseDocumentConstat source) {
            var analyse = source.getAnalyseDocument();
            var attente = source.getPreuveAttendue();
            return new ConstatDocumentaireDto(
                    source.getId(),
                    analyse.getId(),
                    analyse.getNom(),
                    analyse.getPieceReference(),
                    attente.getId(),
                    attente.getLibelle(),
                    source.getPresence().name(),
                    source.getElementsReleves(),
                    source.getElementsManquants(),
                    source.getOrdre());
        }
    }

    public static DetailEvaluationV2Dto depuis(Evaluation evaluation,
                                               RestitutionRisqueService.RisqueMetier risque,
                                               List<EvaluationPreuve> preuves,
                                               List<EvaluationConstat> constats,
                                               List<AnalyseDocumentConstat> constatsDocumentaires) {
        return new DetailEvaluationV2Dto(
                evaluation.getId(),
                RisqueMetierDto.depuis(risque),
                SignalIaDto.depuis(evaluation),
                preuves.stream().map(PreuveEvalueeDto::depuis).toList(),
                constats.stream().map(ConstatDto::depuis).toList(),
                constatsDocumentaires.stream().map(ConstatDocumentaireDto::depuis).toList());
    }
}
