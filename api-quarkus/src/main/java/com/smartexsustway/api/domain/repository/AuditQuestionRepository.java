package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.AuditQuestion;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class AuditQuestionRepository implements PanacheRepositoryBase<AuditQuestion, UUID> {

    public List<AuditQuestion> parAuditCritere(UUID auditCritereId) {
        return list("auditCritere.id = ?1", auditCritereId);
    }
}
