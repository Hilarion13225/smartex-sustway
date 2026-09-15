package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.EvaluationConstat;
import com.smartexsustway.api.domain.enums.NatureConstat;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

/** Remarques rattachées : signaux de risque et éléments manquants. */
@ApplicationScoped
public class EvaluationConstatRepository implements PanacheRepositoryBase<EvaluationConstat, UUID> {

    public List<EvaluationConstat> parEvaluation(UUID evaluationId) {
        return list("evaluation.id = ?1 order by nature asc, ordre asc", evaluationId);
    }

    /**
     * Les remarques d'une évaluation, avec leur cible déjà chargée.
     *
     * <p>Trois jointures gauches parce qu'un constat n'en renseigne qu'une :
     * la contrainte {@code evaluation_constat_cible_coherente} garantit
     * qu'exactement une des trois est non nulle. Les charger toutes en une
     * fois coûte trois jointures sur une seule requête, au lieu d'une
     * requête par ligne au moment de lire la cible.
     */
    public List<EvaluationConstat> detailParEvaluation(UUID evaluationId) {
        return find("select ec from EvaluationConstat ec "
                        + "left join fetch ec.exigence "
                        + "left join fetch ec.preuveAttendue "
                        + "left join fetch ec.regleAnalyse "
                        + "where ec.evaluation.id = ?1 "
                        + "order by ec.nature asc, ec.ordre asc, ec.id asc",
                evaluationId).list();
    }

    public List<EvaluationConstat> parEvaluationEtNature(UUID evaluationId, NatureConstat nature) {
        return list("evaluation.id = ?1 and nature = ?2 order by ordre asc", evaluationId, nature);
    }
}
