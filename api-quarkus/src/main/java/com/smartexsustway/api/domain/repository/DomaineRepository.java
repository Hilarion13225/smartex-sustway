package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Domaine;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class DomaineRepository implements PanacheRepositoryBase<Domaine, UUID> {

    public List<Domaine> parReferentiel(UUID referentielId) {
        return list("referentiel.id = ?1 order by ordre asc", referentielId);
    }

    public Optional<Domaine> parReferentielEtCode(UUID referentielId, String code) {
        return find("referentiel.id = ?1 and code = ?2", referentielId, code).firstResultOptional();
    }
}
