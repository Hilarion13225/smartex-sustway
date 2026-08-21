package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.ActionCorrective;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class ActionCorrectiveRepository implements PanacheRepositoryBase<ActionCorrective, UUID> {

    public List<ActionCorrective> parNonConforme(UUID nonConformeId) {
        return list("nonConforme.id = ?1 order by createdAt asc", nonConformeId);
    }

    public Optional<ActionCorrective> parIdEtNonConforme(UUID id, UUID nonConformeId) {
        return find("id = ?1 and nonConforme.id = ?2", id, nonConformeId).firstResultOptional();
    }
}
