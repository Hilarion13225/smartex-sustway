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
}
