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

    /**
     * Le critere a-t-il ete instruit — par le pipeline ou par une personne ?
     *
     * Un constat d'absence (source SYSTEME) ne compte pas : il dit seulement
     * que rien n'avait ete fourni au moment ou la passe est passee. C'est ce
     * qui rend le constat reversible — le critere reste selectionne par les
     * passes suivantes, et une analyse veritable le remplacera le jour ou
     * l'organisation le renseignera. Une garde posee sur toutes les sources
     * confondues le figerait pour toujours.
     */
    public boolean instruit(UUID auditCritereId) {
        return count("auditCritere.id = ?1 and source in ?2",
                auditCritereId,
                List.of(SourceEvaluation.IA, SourceEvaluation.EXPERT)) > 0;
    }

    /** Dernier constat d'absence pose sur le critere, s'il en porte un. */
    public Optional<Evaluation> dernierConstatAbsence(UUID auditCritereId) {
        return find("auditCritere.id = ?1 and source = ?2 order by dateEvaluation desc",
                auditCritereId, SourceEvaluation.SYSTEME).firstResultOptional();
    }
}
