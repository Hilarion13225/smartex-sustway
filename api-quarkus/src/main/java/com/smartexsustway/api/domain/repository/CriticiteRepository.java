package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Criticite;
import com.smartexsustway.api.domain.enums.NiveauCriticite;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class CriticiteRepository implements PanacheRepositoryBase<Criticite, UUID> {

    public Optional<Criticite> parCode(NiveauCriticite code) {
        return find("code", code).firstResultOptional();
    }
}
