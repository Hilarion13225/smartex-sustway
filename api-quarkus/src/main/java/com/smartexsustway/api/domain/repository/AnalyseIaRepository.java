package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.AnalyseIa;
import com.smartexsustway.api.domain.enums.StatutPipeline;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Passes d'analyse d'une mission.
 *
 * <p>La table existait depuis longtemps sans entité ni dépôt : c'est ici
 * qu'elle entre réellement en service.
 */
@ApplicationScoped
public class AnalyseIaRepository implements PanacheRepositoryBase<AnalyseIa, UUID> {

    public List<AnalyseIa> parAudit(UUID auditId) {
        return list("audit.id = ?1 order by dateDebut desc", auditId);
    }

    public List<AnalyseIa> parAuditCritere(UUID auditCritereId) {
        return list("auditCritere.id = ?1 order by dateDebut desc", auditCritereId);
    }

    /**
     * Passe déjà en cours sur ce critère, s'il y en a une.
     *
     * <p>Aucune contrainte d'unicité ne peut empêcher deux analyses
     * simultanées : elles seraient toutes deux légitimes au regard du
     * schéma. Seul un contrôle applicatif s'y oppose, et c'est cette
     * requête qui le rend possible.
     */
    public Optional<AnalyseIa> enCoursSurCritere(UUID auditCritereId) {
        return find("auditCritere.id = ?1 and statut = ?2", auditCritereId, StatutPipeline.EN_COURS)
                .firstResultOptional();
    }

    /** Isolation multi-tenant : la passe n'est rendue que si elle appartient à cette mission. */
    public Optional<AnalyseIa> parIdEtAudit(UUID id, UUID auditId) {
        return find("id = ?1 and audit.id = ?2", id, auditId).firstResultOptional();
    }
}
