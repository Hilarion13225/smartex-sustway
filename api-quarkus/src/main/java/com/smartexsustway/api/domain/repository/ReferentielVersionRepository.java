package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.ReferentielVersion;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ReferentielVersionRepository implements PanacheRepositoryBase<ReferentielVersion, UUID> {

    /** Historique d'un référentiel, de la publication la plus récente à la plus ancienne. */
    public List<ReferentielVersion> parReferentiel(UUID referentielId) {
        return list("referentiel.id = ?1 order by publieeLe desc", referentielId);
    }

    public boolean numeroExiste(UUID referentielId, String numero) {
        return count("referentiel.id = ?1 and numero = ?2", referentielId, numero) > 0;
    }
}
