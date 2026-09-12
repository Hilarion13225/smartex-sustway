package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.PlanAction;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Plans d'action d'une mission. */
@ApplicationScoped
public class PlanActionRepository implements PanacheRepositoryBase<PlanAction, UUID> {

    public List<PlanAction> parAudit(UUID auditId) {
        return list("audit.id = ?1 order by creeLe desc, id desc", auditId);
    }

    /** Isolation multi-tenant : le plan n'est rendu que s'il appartient à cette mission. */
    public Optional<PlanAction> parIdEtAudit(UUID id, UUID auditId) {
        return find("id = ?1 and audit.id = ?2", id, auditId).firstResultOptional();
    }
}
