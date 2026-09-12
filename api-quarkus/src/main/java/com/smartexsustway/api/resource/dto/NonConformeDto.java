package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.NonConforme;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Vue d'une non-conformité (module 11, RG17). */
public record NonConformeDto(
        UUID id,
        UUID evaluationId,
        UUID auditCritereId,
        String critereCode,
        String critereLibelle,
        String titre,
        String description,
        String niveau,
        BigDecimal risqueAttendu,
        String statut,
        OffsetDateTime createdAt,
        int nombreActionsCorrectives,

        /**
         * Vrai lorsque la description servie a été amputée d'un raisonnement
         * IA que ce rôle n'a pas à lire.
         *
         * <p>Même rôle que {@code justificationsMasquees} sur
         * {@link EvaluationDto} : sans ce drapeau, « aucun constat
         * enregistré » et « constat filtré » se ressembleraient à l'écran,
         * et l'interface afficherait un vide là où l'information existe mais
         * n'est pas accessible à ce rôle.
         */
        boolean descriptionFiltree
) {
    /**
     * Version complète, réservée aux rôles d'administration de l'audit.
     */
    public static NonConformeDto depuis(NonConforme nc, int nombreActionsCorrectives) {
        return construire(nc, nombreActionsCorrectives, true);
    }

    /**
     * Version servie au collaborateur : le constat opérationnel, sans le
     * raisonnement interne de l'IA.
     *
     * <p>Les non-conformités créées depuis le correctif D1 ne contiennent
     * plus de justification : pour elles, cette fabrique rend exactement la
     * même chose que {@link #depuis}. Elle existe pour les
     * <strong>34 lignes historiques</strong> dont la description avait été
     * composée par l'ancien {@code NonConformiteService}, sous la forme
     * {@code justification [+ "\n\nPistes d'amélioration : " + pistes]}.
     *
     * <p>Le retrait est <strong>déterministe</strong> : on soustrait la
     * justification effectivement persistée sur l'évaluation liée, telle
     * quelle. Rien n'est résumé, paraphrasé ni reconstruit — ce qui reste
     * après soustraction est du texte d'origine, ou rien. Cette approche
     * évite une migration sur des données historiques dont aucune source
     * métier ne permettrait de reconstruire le constat : une seule
     * non-conformité sur trente-neuf porte des {@code evaluation_constat}.
     *
     * <p>Elle cicatrise d'elle-même : dès qu'une description ne contient
     * plus la justification, elle est servie intacte.
     */
    public static NonConformeDto sansRaisonnementIa(NonConforme nc, int nombreActionsCorrectives) {
        return construire(nc, nombreActionsCorrectives, false);
    }

    private static NonConformeDto construire(NonConforme nc, int nombreActionsCorrectives,
                                             boolean avecRaisonnementIa) {
        var evaluation = nc.getEvaluation();
        var auditCritere = evaluation.getAuditCritere();

        String description = nc.getDescription();
        String filtree = avecRaisonnementIa
                ? description
                : sansJustification(description, evaluation.getJustification());

        return new NonConformeDto(
                nc.getId(),
                evaluation.getId(),
                auditCritere.getId(),
                auditCritere.getCritere().getCode(),
                auditCritere.getCritere().getLibelle(),
                nc.getTitre(),
                filtree,
                nc.getNiveau().name(),
                nc.getRisqueAttendu(),
                nc.getStatut().name(),
                nc.getCreatedAt(),
                nombreActionsCorrectives,
                // Comparaison d'identité : `filtree` n'est le même objet que
                // `description` que si rien n'a été retiré.
                filtree != description
        );
    }

    /**
     * Retire du constat la justification IA qui s'y trouve, et rend
     * l'original si elle ne s'y trouve pas.
     *
     * <p>La garde sur {@code isBlank} n'est pas cosmétique : une
     * justification vide est contenue dans n'importe quelle chaîne, et
     * soustraire la chaîne vide viderait toutes les descriptions.
     */
    private static String sansJustification(String description, String justification) {
        if (description == null || justification == null || justification.isBlank()) {
            return description;
        }
        if (!description.contains(justification)) {
            return description;
        }
        String reste = description.replace(justification, "").strip();
        return reste.isEmpty() ? null : reste;
    }
}
