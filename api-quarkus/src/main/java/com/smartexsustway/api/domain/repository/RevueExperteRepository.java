package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.RevueExperte;
import com.smartexsustway.api.domain.enums.StatutRevueExperte;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class RevueExperteRepository implements PanacheRepositoryBase<RevueExperte, UUID> {

    /**
     * File de revue active (EN_ATTENTE + EN_COURS) pour une entreprise
     * donnée, triée par ordre d'arrivée (la plus ancienne d'abord).
     * Navigation : revue_experte -> evaluation -> audit_critere -> audit
     * -> entreprise (RG22/RG38 : la revue est toujours rattachée à un
     * audit d'une entreprise précise, jamais transverse).
     */
    public List<RevueExperte> fileAttentePourEntreprise(UUID entrepriseId) {
        return list(
                "evaluation.auditCritere.audit.entreprise.id = ?1 and statut in (?2, ?3) "
                        + "order by dateAttribution asc",
                entrepriseId, StatutRevueExperte.EN_ATTENTE, StatutRevueExperte.EN_COURS
        );
    }

    /** Isolation multi-tenant (CDC §1.4) : ne renvoie la revue que si elle appartient bien à cette entreprise. */
    public Optional<RevueExperte> parIdEtEntreprise(UUID id, UUID entrepriseId) {
        return find("id = ?1 and evaluation.auditCritere.audit.entreprise.id = ?2", id, entrepriseId)
                .firstResultOptional();
    }
}
