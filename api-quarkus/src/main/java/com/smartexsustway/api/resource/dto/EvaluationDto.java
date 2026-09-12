package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Evaluation;
import java.util.List;
import com.smartexsustway.api.domain.entity.EvaluationDocumentAnalyse;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record EvaluationDto(
        UUID id,
        UUID auditCritereId,
        BigDecimal probabiliteConforme,
        short niveauEngagement,
        BigDecimal confianceIa,
        String justification,
        /** Jugement de l'IA sur la suffisance des preuves ; null pour une saisie humaine. */
        Boolean couverturePreuve,
        /** Niveau déclaré au moment de l'analyse ; null pour une saisie humaine. */
        Short niveauDeclare,
        /** Documents effectivement lus par l'IA, avec le résumé qu'elle en a tiré. */
        List<DocumentAnalyseDto> documentsAnalyses,
        String source,
        String statut,
        OffsetDateTime dateEvaluation,
        Boolean signalRisque,
        String categorieRisque,
        String justificationRisque,
        Boolean recommandationNecessaire,
        String pistesAmelioration,

        // === Champs persistés que ce DTO taisait ==========================
        //
        // Tous existaient déjà en base ; aucune colonne n'est créée. Leur
        // absence rendait plusieurs informations invisibles à l'écran alors
        // qu'elles étaient enregistrées — notamment le fait qu'une
        // évaluation validée l'ait été par quelqu'un.

        /** Version du contrat IA. Nul = évaluation antérieure au contrat V2. */
        String contratVersion,

        /** Confiance du Risk Agent, distincte de {@code confianceIa}. */
        BigDecimal confianceRisque,

        /** Pourquoi les preuves sont jugées suffisantes ou non. */
        String justificationCouverture,

        /**
         * Qui a fait passer l'évaluation à {@code VALIDEE}, et quand.
         * Nuls sur les évaluations historiques, que le code validait
         * lui-même au titre de RG16 — cette nullité est elle-même une
         * information.
         */
        UUID valideePar,
        OffsetDateTime valideeLe,

        /** Numéro de la version du référentiel sous laquelle l'évaluation a été rendue. */
        String versionReferentiel,

        /**
         * Vrai lorsque les justifications internes de l'IA ont été retirées
         * de cette réponse faute de rôle suffisant.
         *
         * <p>Ce drapeau existe pour que {@code justification} nul ne soit
         * pas ambigu : sans lui, « aucune justification enregistrée » et
         * « justification masquée » se ressembleraient à l'écran, et
         * l'interface afficherait un vide là où elle devrait dire que
         * l'information existe mais n'est pas accessible à ce rôle.
         */
        boolean justificationsMasquees
) {
    /** Un document lu par l'IA. */
    public record DocumentAnalyseDto(String nom, String resume) {
    }

    public static EvaluationDto depuis(Evaluation e) {
        return depuis(e, List.of());
    }

    /**
     * Version complète, réservée aux rôles d'administration de l'audit.
     */
    public static EvaluationDto depuis(Evaluation e, List<EvaluationDocumentAnalyse> documentsLus) {
        return construire(e, documentsLus, true);
    }

    /**
     * Version servie au collaborateur : le résultat opérationnel, sans les
     * justifications internes de l'IA.
     *
     * <p>Ce qui reste visible : la probabilité, le niveau d'engagement, la
     * couverture, le statut, le signal de risque et sa catégorie, les
     * pistes d'amélioration — ce qu'il faut faire — et les documents lus
     * avec leur résumé. Autrement dit, de quoi savoir où en est un critère
     * et ce qu'il reste à fournir.
     *
     * <p>Ce qui est retiré : les trois justifications produites par l'IA.
     * Elles expliquent <em>pourquoi</em> un jugement a été rendu — elles
     * nomment ce qui manque, citent ce qui a été observé — et relèvent de
     * la relecture, donc de l'administration de l'audit.
     *
     * <p>Le retrait se fait ici, côté serveur. Le masquer seulement à
     * l'écran laisserait la donnée dans la réponse HTTP, ce qui n'est pas
     * une restriction mais son apparence.
     */
    public static EvaluationDto sansJustificationsInternes(
            Evaluation e, List<EvaluationDocumentAnalyse> documentsLus) {
        return construire(e, documentsLus, false);
    }

    private static EvaluationDto construire(Evaluation e, List<EvaluationDocumentAnalyse> documentsLus,
                                            boolean avecJustifications) {
        List<DocumentAnalyseDto> documents = documentsLus.stream()
                .map(d -> new DocumentAnalyseDto(d.getNom(), d.getResume()))
                .toList();
        return new EvaluationDto(
                e.getId(), e.getAuditCritere().getId(), e.getProbabiliteConforme(), e.getNote(),
                e.getConfianceIa(),
                avecJustifications ? e.getJustification() : null,
                e.getCouverturePreuve(), e.getNiveauDeclare(), documents, e.getSource().name(),
                e.getStatut().name(),
                e.getDateEvaluation(),
                // Le signal et sa catégorie sont des résultats : ils
                // restent visibles. Seule la justification qui les
                // accompagne est une explication interne.
                e.getSignalRisque(), e.getCategorieRisque(),
                avecJustifications ? e.getJustificationRisque() : null,
                // Les pistes d'amélioration disent ce qu'il faut faire, et
                // non pourquoi un jugement a été rendu : elles relèvent de
                // l'opérationnel et restent visibles.
                e.getRecommandationNecessaire(), e.getPistesAmelioration(),
                e.getContratVersion(),
                e.getConfianceRisque(),
                avecJustifications ? e.getJustificationCouverture() : null,
                e.getValideePar() == null ? null : e.getValideePar().getId(),
                e.getValideeLe(),
                // Le numéro plutôt que l'identifiant : c'est ce qu'un
                // auditeur reconnaît. La relation est chargée
                // paresseusement, mais elle l'est ici dans la session qui
                // construit le DTO.
                e.getReferentielVersion() == null ? null : e.getReferentielVersion().getNumero(),
                !avecJustifications
        );
    }
}
