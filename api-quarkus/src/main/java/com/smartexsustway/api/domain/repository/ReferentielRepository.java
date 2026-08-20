package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Referentiel;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class ReferentielRepository implements PanacheRepositoryBase<Referentiel, UUID> {

    public Optional<Referentiel> parCode(String code) {
        return find("code", code).firstResultOptional();
    }
}
