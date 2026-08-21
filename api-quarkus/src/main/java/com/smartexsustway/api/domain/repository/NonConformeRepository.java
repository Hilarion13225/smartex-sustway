package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.NonConforme;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class NonConformeRepository implements PanacheRepositoryBase<NonConforme, UUID> {

    public List<NonConforme> parAudit(UUID auditId) {
        return list("evaluation.auditCritere.audit.id = ?1 order by createdAt desc", auditId);
    }

    /** Isolation multi-tenant (CDC §1.4) : ne renvoie la non-conformité que si elle appartient bien à cette mission. */
    public Optional<NonConforme> parIdEtAudit(UUID id, UUID auditId) {
        return find("id = ?1 and evaluation.auditCritere.audit.id = ?2", id, auditId).firstResultOptional();
    }
}
