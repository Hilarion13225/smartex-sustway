package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Domaine;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class DomaineRepository implements PanacheRepositoryBase<Domaine, UUID> {

    /**
     * Domaines d'une version donnée.
     *
     * Depuis V47 le contenu appartient à une version : interroger par
     * référentiel seul renverrait les domaines de toutes ses versions
     * confondues, doublonnés autant de fois qu'il en existe.
     */
    public List<Domaine> parVersion(UUID referentielVersionId) {
        return list("referentielVersion.id = ?1 order by ordre asc", referentielVersionId);
    }

    public Optional<Domaine> parVersionEtCode(UUID referentielVersionId, String code) {
        return find("referentielVersion.id = ?1 and code = ?2", referentielVersionId, code).firstResultOptional();
    }
}
