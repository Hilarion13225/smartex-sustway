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

    /**
     * Exigences proposées par l'IA et non encore acceptées.
     *
     * S'appuie sur l'index partiel {@code idx_exigence_a_valider} (V57), posé
     * exactement sur ce prédicat.
     */
    public List<Exigence> aValider(UUID referentielVersionId) {
        return list("referentielVersion.id = ?1 and origine = ?2 and valideePar is null "
                        + "order by critere.code, ordre",
                referentielVersionId, com.smartexsustway.api.domain.enums.OrigineContenu.IMPORT_IA);
    }

    /**
     * Nombre d'éléments que l'import a déposés dans cette version, validés
     * compris.
     *
     * Compte sur `origine_initiale`, et non sur `origine` : c'est la seule
     * colonne qui ne bouge pas quand une personne reprend la proposition à son
     * compte. Compter sur `origine` ferait diminuer le total à chaque
     * validation, et l'avancement afficherait toujours zéro sur zéro.
     */
    public long compterImportes(UUID referentielVersionId) {
        return count("referentielVersion.id = ?1 and origineInitiale = ?2",
                referentielVersionId, com.smartexsustway.api.domain.enums.OrigineContenu.IMPORT_IA);
    }
}
