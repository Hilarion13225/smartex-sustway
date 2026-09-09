package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.PreuveAttendue;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class PreuveAttendueRepository implements PanacheRepositoryBase<PreuveAttendue, UUID> {

    public List<PreuveAttendue> parExigence(UUID exigenceId) {
        return list("exigence.id = ?1 order by ordre, libelle", exigenceId);
    }

    /** Preuves attendues de tout un critère, dans l'ordre de ses exigences. */
    public List<PreuveAttendue> parCritere(UUID critereId) {
        return list("exigence.critere.id = ?1 order by exigence.ordre, ordre", critereId);
    }

    public List<PreuveAttendue> parVersion(UUID referentielVersionId) {
        return list("referentielVersion.id = ?1 order by exigence.ordre, ordre", referentielVersionId);
    }
}
