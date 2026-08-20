package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.AuditCritere;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class AuditCritereRepository implements PanacheRepositoryBase<AuditCritere, UUID> {

    public List<AuditCritere> parAudit(UUID auditId) {
        return list("audit.id = ?1 order by critere.code", auditId);
    }
}
