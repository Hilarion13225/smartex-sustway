package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.ReponseQuestion;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class ReponseQuestionRepository implements PanacheRepositoryBase<ReponseQuestion, UUID> {

    public List<ReponseQuestion> parAuditCritere(UUID auditCritereId) {
        return list("auditQuestion.auditCritere.id = ?1", auditCritereId);
    }

    public Optional<ReponseQuestion> parAuditQuestion(UUID auditQuestionId) {
        return find("auditQuestion.id = ?1", auditQuestionId).firstResultOptional();
    }
}
