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
        /** Documents effectivement lus par l'IA, avec le résumé qu'elle en a tiré. */
        List<DocumentAnalyseDto> documentsAnalyses,
        String source,
        String statut,
        OffsetDateTime dateEvaluation,
        Boolean signalRisque,
        String categorieRisque,
        String justificationRisque,
        Boolean recommandationNecessaire,
        String pistesAmelioration
) {
    /** Un document lu par l'IA. */
    public record DocumentAnalyseDto(String nom, String resume) {
    }

    public static EvaluationDto depuis(Evaluation e) {
        return depuis(e, List.of());
    }

    public static EvaluationDto depuis(Evaluation e, List<EvaluationDocumentAnalyse> documentsLus) {
        List<DocumentAnalyseDto> documents = documentsLus.stream()
                .map(d -> new DocumentAnalyseDto(d.getNom(), d.getResume()))
                .toList();
        return new EvaluationDto(
                e.getId(), e.getAuditCritere().getId(), e.getProbabiliteConforme(), e.getNote(),
                e.getConfianceIa(), e.getJustification(), e.getCouverturePreuve(), documents, e.getSource().name(),
                e.getStatut().name(),
                e.getDateEvaluation(),
                e.getSignalRisque(), e.getCategorieRisque(), e.getJustificationRisque(),
                e.getRecommandationNecessaire(), e.getPistesAmelioration()
        );
    }
}
