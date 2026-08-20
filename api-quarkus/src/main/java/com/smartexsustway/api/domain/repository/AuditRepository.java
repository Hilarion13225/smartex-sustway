package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Audit;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class AuditRepository implements PanacheRepositoryBase<Audit, UUID> {

    public List<Audit> parEntreprise(UUID entrepriseId) {
        return list("entreprise.id = ?1 order by createdAt desc", entrepriseId);
    }
}
