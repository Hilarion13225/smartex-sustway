package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Preuve;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class PreuveRepository implements PanacheRepositoryBase<Preuve, UUID> {

    public List<Preuve> parAudit(UUID auditId) {
        return list("audit.id = ?1 order by createdAt desc", auditId);
    }

    /** Preuves associées à un critère précis de la mission (RG15). */
    public List<Preuve> parAuditCritere(UUID auditCritereId) {
        return list("select distinct p from Preuve p join p.auditCriteres ac where ac.id = ?1 order by p.createdAt desc",
                auditCritereId);
    }
}
