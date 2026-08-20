package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Evaluation;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class EvaluationRepository implements PanacheRepositoryBase<Evaluation, UUID> {

    public List<Evaluation> parAuditCritere(UUID auditCritereId) {
        return list("auditCritere.id = ?1 order by dateEvaluation desc", auditCritereId);
    }

    public Optional<Evaluation> laPlusRecenteParAuditCritere(UUID auditCritereId) {
        return find("auditCritere.id = ?1 order by dateEvaluation desc", auditCritereId).firstResultOptional();
    }
}
