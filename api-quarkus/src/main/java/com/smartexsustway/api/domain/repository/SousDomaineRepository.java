package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.SousDomaine;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class SousDomaineRepository implements PanacheRepositoryBase<SousDomaine, UUID> {

    public List<SousDomaine> parDomaine(UUID domaineId) {
        return list("domaine.id = ?1 order by ordre", domaineId);
    }

    public Optional<SousDomaine> parDomaineEtCode(UUID domaineId, String code) {
        return find("domaine.id = ?1 and code = ?2", domaineId, code).firstResultOptional();
    }
}
