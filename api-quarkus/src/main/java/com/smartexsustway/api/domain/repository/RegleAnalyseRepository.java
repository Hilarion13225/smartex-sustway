package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.RegleAnalyse;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class RegleAnalyseRepository implements PanacheRepositoryBase<RegleAnalyse, UUID> {

    /**
     * Toutes les règles d'un critère, quelle que soit leur portée — celles
     * du critère lui-même comme celles de ses exigences et de leurs pièces
     * attendues. C'est ainsi que le contexte d'analyse est assemblé.
     */
    public List<RegleAnalyse> parCritere(UUID critereId) {
        return list("critere.id = ?1 order by ordre, code", critereId);
    }

    public List<RegleAnalyse> parVersion(UUID referentielVersionId) {
        return list("referentielVersion.id = ?1 order by critere.code, ordre", referentielVersionId);
    }

    public Optional<RegleAnalyse> parCritereEtCode(UUID critereId, String code) {
        return find("critere.id = ?1 and code = ?2", critereId, code).firstResultOptional();
    }

    /** Règles proposées par l'IA et non encore acceptées (V57). */
    public List<RegleAnalyse> aValider(UUID referentielVersionId) {
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
