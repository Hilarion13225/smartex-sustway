package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.ReferentielVersion;
import com.smartexsustway.api.domain.enums.StatutVersionReferentiel;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class ReferentielVersionRepository implements PanacheRepositoryBase<ReferentielVersion, UUID> {

    /**
     * Historique d'un référentiel, du plus récent au plus ancien.
     *
     * Tri sur la date de création et non de publication : un brouillon n'a
     * pas encore de date de publication et se retrouverait en fin de liste,
     * alors qu'il est justement ce sur quoi on travaille.
     */
    public List<ReferentielVersion> parReferentiel(UUID referentielId) {
        return list("referentiel.id = ?1 order by creeeLe desc", referentielId);
    }

    /** Version courante : celle que reçoit toute nouvelle mission. */
    public Optional<ReferentielVersion> publiee(UUID referentielId) {
        return find("referentiel.id = ?1 and statut = ?2",
                referentielId, StatutVersionReferentiel.PUBLIEE).firstResultOptional();
    }

    /** Version en cours d'édition, s'il y en a une. Il ne peut y en avoir qu'une (index partiel, V46). */
    public Optional<ReferentielVersion> brouillon(UUID referentielId) {
        return find("referentiel.id = ?1 and statut = ?2",
                referentielId, StatutVersionReferentiel.BROUILLON).firstResultOptional();
    }

    public Optional<ReferentielVersion> parNumero(UUID referentielId, String numero) {
        return find("referentiel.id = ?1 and numero = ?2", referentielId, numero).firstResultOptional();
    }

    public boolean numeroExiste(UUID referentielId, String numero) {
        return count("referentiel.id = ?1 and numero = ?2", referentielId, numero) > 0;
    }
}
