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
    /**
     * Ce document a-t-il déjà été soumis aux agents ?
     *
     * C'est la question qui décide si une preuve reste retirable. Une pièce
     * qui a servi à produire un résultat appartient à la trace de ce
     * résultat : la retirer le rendrait invérifiable. La contrainte
     * {@code ON DELETE RESTRICT} posée en V61 dit la même chose au niveau du
     * schéma ; ce contrôle permet de répondre par un message plutôt que par
     * une violation de contrainte.
     */
    public boolean documentDejaAnalyse(UUID documentId) {
        return count("document.id = ?1", documentId) > 0;
    }

    public List<EvaluationDocumentAnalyse> parEvaluation(UUID evaluationId) {
        return list("evaluation.id = ?1 order by ordre", evaluationId);
    }
}
