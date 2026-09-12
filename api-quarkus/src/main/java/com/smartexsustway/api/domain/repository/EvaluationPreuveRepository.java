package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.EvaluationPreuve;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

/** Détail de conformité, preuve attendue par preuve attendue. */
@ApplicationScoped
public class EvaluationPreuveRepository implements PanacheRepositoryBase<EvaluationPreuve, UUID> {

    public List<EvaluationPreuve> parEvaluation(UUID evaluationId) {
        return list("evaluation.id = ?1 order by ordre asc, id asc", evaluationId);
    }

    /**
     * Le détail d'une évaluation, avec sa cible et l'exigence qui la porte.
     *
     * <p>Les deux jointures ne sont pas un confort : {@code preuveAttendue}
     * et son {@code exigence} sont en chargement paresseux, et les lire dans
     * la boucle de construction du DTO déclencherait deux requêtes par
     * ligne. Sur un critère portant une dizaine d'attentes, une lecture
     * d'écran deviendrait vingt-et-une requêtes.
     */
    public List<EvaluationPreuve> detailParEvaluation(UUID evaluationId) {
        return find("select ep from EvaluationPreuve ep "
                        + "join fetch ep.preuveAttendue pa "
                        + "left join fetch pa.exigence "
                        + "where ep.evaluation.id = ?1 "
                        + "order by ep.ordre asc, ep.id asc",
                evaluationId).list();
    }

    /**
     * Attentes portant une contradiction entre pièces.
     *
     * <p>C'est la question que le champ `conflit` existe pour servir : sa
     * présence se cherche, son contenu se lit.
     */
    public List<EvaluationPreuve> enConflitParEvaluation(UUID evaluationId) {
        return list("evaluation.id = ?1 and conflit is not null order by ordre asc", evaluationId);
    }
}
