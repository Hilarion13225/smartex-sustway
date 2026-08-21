package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Rapport;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class RapportRepository implements PanacheRepositoryBase<Rapport, UUID> {

    public List<Rapport> parAudit(UUID auditId) {
        return list("audit.id = ?1 order by createdAt desc", auditId);
    }

    public Optional<Rapport> parIdEtAudit(UUID id, UUID auditId) {
        return find("id = ?1 and audit.id = ?2", id, auditId).firstResultOptional();
    }
}
