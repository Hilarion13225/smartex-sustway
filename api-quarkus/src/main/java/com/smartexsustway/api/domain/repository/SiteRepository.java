package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Site;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class SiteRepository implements PanacheRepositoryBase<Site, UUID> {

    /** Isolation multi-tenant : toujours filtrer par entreprise (exigence sécurité CDC §1.4). */
    public List<Site> parEntreprise(UUID entrepriseId) {
        return list("entreprise.id", entrepriseId);
    }
}
