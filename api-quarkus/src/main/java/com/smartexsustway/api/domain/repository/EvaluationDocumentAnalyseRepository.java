package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.EvaluationDocumentAnalyse;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class EvaluationDocumentAnalyseRepository
        implements PanacheRepositoryBase<EvaluationDocumentAnalyse, UUID> {

    /** Documents lus lors d'une évaluation, dans l'ordre où l'IA les a traités. */
    public List<EvaluationDocumentAnalyse> parEvaluation(UUID evaluationId) {
        return list("evaluation.id = ?1 order by ordre", evaluationId);
    }
}
