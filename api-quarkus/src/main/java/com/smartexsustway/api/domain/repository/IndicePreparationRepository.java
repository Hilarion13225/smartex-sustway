package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.IndicePreparation;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class IndicePreparationRepository implements PanacheRepositoryBase<IndicePreparation, UUID> {

    public List<IndicePreparation> parAudit(UUID auditId) {
        return list("audit.id = ?1 order by dateCalcul desc", auditId);
    }

    public Optional<IndicePreparation> parAuditEtBailleur(UUID auditId, UUID bailleurId) {
        return find("audit.id = ?1 and bailleur.id = ?2", auditId, bailleurId).firstResultOptional();
    }
}
