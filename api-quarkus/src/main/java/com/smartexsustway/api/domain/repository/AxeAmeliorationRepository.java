package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.AxeAmelioration;
import com.smartexsustway.api.domain.enums.StatutAxe;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Axes d'amélioration d'une mission.
 *
 * <p>Toutes les lectures partent d'{@code audit.id} : c'est la clé de
 * tenant, portée en propre par la table précisément pour que le contrôle
 * d'accès tienne en une jointure.
 */
@ApplicationScoped
public class AxeAmeliorationRepository implements PanacheRepositoryBase<AxeAmelioration, UUID> {

    public List<AxeAmelioration> parAudit(UUID auditId) {
        // Les cibles et le critère sont lus par le DTO à la sérialisation :
        // sans ce chargement, chaque axe de la liste déclenche jusqu'à quatre
        // requêtes de plus.
        return list("""
                select distinct a from AxeAmelioration a
                left join fetch a.auditCritere ac
                left join fetch ac.critere
                left join fetch a.exigence
                left join fetch a.preuveAttendue
                left join fetch a.regleAnalyse
                where a.audit.id = ?1
                order by a.creeLe desc, a.id desc
                """, auditId);
    }

    public List<AxeAmelioration> parAuditEtStatut(UUID auditId, StatutAxe statut) {
        return list("audit.id = ?1 and statut = ?2 order by creeLe desc, id desc", auditId, statut);
    }

    /**
     * Axes retenus, seuls rattachables à une action de plan.
     *
     * <p>Un axe proposé ou rejeté n'a pas à être planifié : le premier
     * n'a pas encore été accepté, le second a été écarté.
     */
    public List<AxeAmelioration> validesParAudit(UUID auditId) {
        return parAuditEtStatut(auditId, StatutAxe.VALIDE);
    }

    public List<AxeAmelioration> parEvaluation(UUID evaluationId) {
        return list("evaluation.id = ?1 order by creeLe asc, id asc", evaluationId);
    }

    /**
     * Axes portés par un critère de mission.
     *
     * <p>Sert deux usages qui doivent voir exactement le même ensemble : la
     * restitution à l'écran, et la recherche de doublon avant création. Les
     * faire diverger permettrait de créer un axe que la liste montrerait déjà.
     *
     * <p>L'ordre est chronologique croissant : sur un critère, la première
     * proposition est celle qui a été formulée en premier, et c'est elle que
     * la déduplication conserve.
     */
    public List<AxeAmelioration> parAuditCritere(UUID auditCritereId) {
        return list("auditCritere.id = ?1 order by creeLe asc, id asc", auditCritereId);
    }

    /**
     * Même liste, jointures de restitution incluses.
     *
     * <p>Le DTO lit le code de l'exigence, le libellé de la preuve attendue
     * et le code de la règle : sans ce {@code join fetch}, chaque axe déclenche
     * jusqu'à trois requêtes supplémentaires à la sérialisation.
     */
    public List<AxeAmelioration> parAuditCritereAvecCibles(UUID auditCritereId) {
        return list("""
                select distinct a from AxeAmelioration a
                left join fetch a.auditCritere ac
                left join fetch ac.critere
                left join fetch a.exigence
                left join fetch a.preuveAttendue
                left join fetch a.regleAnalyse
                where a.auditCritere.id = ?1
                order by a.creeLe asc, a.id asc
                """, auditCritereId);
    }

    /** Isolation multi-tenant : l'axe n'est rendu que s'il appartient à cette mission. */
    public Optional<AxeAmelioration> parIdEtAudit(UUID id, UUID auditId) {
        return find("id = ?1 and audit.id = ?2", id, auditId).firstResultOptional();
    }
}
