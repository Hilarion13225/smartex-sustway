package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.enums.SourceEvaluation;
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

    /**
     * Dernière analyse IA du critère — la seule qui fasse la note.
     *
     * Les évaluations de source EXPERT restent en base au titre de RG14, mais
     * ne participent plus au score : une déclaration de l'organisation ne vaut
     * qu'une fois confrontée aux preuves par le pipeline.
     */
    public Optional<Evaluation> laPlusRecenteIaParAuditCritere(UUID auditCritereId) {
        return find("auditCritere.id = ?1 and source = ?2 order by dateEvaluation desc",
                auditCritereId, SourceEvaluation.IA).firstResultOptional();
    }
}
