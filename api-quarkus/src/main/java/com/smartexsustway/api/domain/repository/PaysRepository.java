package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Pays;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class PaysRepository implements PanacheRepositoryBase<Pays, UUID> {

    public Optional<Pays> parCodeIso2(String codeIso2) {
        return find("codeIsoAlpha2", codeIso2).firstResultOptional();
    }
}
