package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Exigence;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class ExigenceRepository implements PanacheRepositoryBase<Exigence, UUID> {

    public List<Exigence> parCritere(UUID critereId) {
        return list("critere.id = ?1 order by ordre, code", critereId);
    }

    /** Toutes les exigences d'une version, pour la copie d'un brouillon. */
    public List<Exigence> parVersion(UUID referentielVersionId) {
        return list("referentielVersion.id = ?1 order by critere.code, ordre", referentielVersionId);
    }

    public Optional<Exigence> parCritereEtCode(UUID critereId, String code) {
        return find("critere.id = ?1 and code = ?2", critereId, code).firstResultOptional();
    }
}
