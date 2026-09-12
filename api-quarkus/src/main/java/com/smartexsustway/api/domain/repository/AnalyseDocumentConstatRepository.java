package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.AnalyseDocumentConstat;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

/**
 * Constats documentaires.
 *
 * <p>Plusieurs lignes peuvent porter sur la même preuve attendue pour une
 * même évaluation : c'est ainsi que deux documents contradictoires gardent
 * chacun leur constat, sans que l'un écrase l'autre.
 */
@ApplicationScoped
public class AnalyseDocumentConstatRepository
        implements PanacheRepositoryBase<AnalyseDocumentConstat, UUID> {

    public List<AnalyseDocumentConstat> parAnalyseDocument(UUID analyseDocumentId) {
        return list("analyseDocument.id = ?1 order by ordre asc, id asc", analyseDocumentId);
    }

    /** Tous les constats d'une évaluation, toutes pièces confondues. */
    public List<AnalyseDocumentConstat> parEvaluation(UUID evaluationId) {
        return list("analyseDocument.evaluation.id = ?1 order by analyseDocument.ordre asc, ordre asc",
                evaluationId);
    }

    /**
     * Les constats documentaires d'une évaluation, prêts à être restitués.
     *
     * <p>Le document analysé et l'attente visée sont chargés avec la ligne :
     * c'est le couple qui donne son sens au constat — « telle pièce dit ceci
     * de telle attente » — et le lire ligne par ligne multiplierait les
     * requêtes par le nombre de pièces.
     */
    public List<AnalyseDocumentConstat> detailParEvaluation(UUID evaluationId) {
        return find("select adc from AnalyseDocumentConstat adc "
                        + "join fetch adc.analyseDocument ad "
                        + "join fetch adc.preuveAttendue pa "
                        + "left join fetch pa.exigence "
                        + "where ad.evaluation.id = ?1 "
                        + "order by ad.ordre asc, adc.ordre asc, adc.id asc",
                evaluationId).list();
    }
}
