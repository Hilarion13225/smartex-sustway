package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.AuditLog;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class AuditLogRepository implements PanacheRepositoryBase<AuditLog, UUID> {

    /** Exigence §1.4 : traçabilité des accès par entreprise (isolation multi-tenant sur la consultation du journal). */
    public List<AuditLog> parEntreprise(UUID entrepriseId, int page, int taille) {
        return find("entrepriseId = ?1 order by createdAt desc", entrepriseId)
                .page(page, taille)
                .list();
    }
}
