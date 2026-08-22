package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.AuditQuestion;
import com.smartexsustway.api.domain.entity.ReponseQuestion;
import com.smartexsustway.api.domain.enums.ValeurReponse;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * RG09 — une question du questionnaire figé dans la mission, accompagnée de
 * la réponse déclarative de l'entreprise cliente lorsqu'elle existe.
 */
public record QuestionMissionDto(
        UUID auditQuestionId,
        String code,
        String libelle,
        String type,
        int ordre,
        boolean obligatoire,
        String statut,
        ValeurReponse valeur,
        String commentaire,
        OffsetDateTime dateReponse
) {

    public static QuestionMissionDto depuis(AuditQuestion auditQuestion, ReponseQuestion reponse) {
        var question = auditQuestion.getQuestion();
        return new QuestionMissionDto(
                auditQuestion.getId(),
                question.getCode(),
                question.getLibelle(),
                question.getType().name(),
                question.getOrdre(),
                question.isObligatoire(),
                auditQuestion.getStatut(),
                reponse != null ? reponse.getValeur() : null,
                reponse != null ? reponse.getCommentaire() : null,
                reponse != null ? reponse.getUpdatedAt() : null
        );
    }
}
