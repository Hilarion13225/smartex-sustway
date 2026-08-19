package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.FormuleAbonnement;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class FormuleAbonnementRepository implements PanacheRepositoryBase<FormuleAbonnement, UUID> {

    public Optional<FormuleAbonnement> parCode(String code) {
        return find("code", code).firstResultOptional();
    }
}
