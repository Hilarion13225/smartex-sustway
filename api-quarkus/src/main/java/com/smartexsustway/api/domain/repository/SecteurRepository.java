package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Secteur;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class SecteurRepository implements PanacheRepositoryBase<Secteur, UUID> {

    public Optional<Secteur> parCode(String code) {
        return find("code", code).firstResultOptional();
    }
}
