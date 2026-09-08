package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Role;
import com.smartexsustway.api.domain.enums.StatutGenerique;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class RoleRepository implements PanacheRepositoryBase<Role, UUID> {

    public Optional<Role> parCode(String code) {
        return find("code", code).firstResultOptional();
    }

    /**
     * Rôles encore attribuables. Un rôle désactivé (V44) reste en base pour
     * l'historique mais la base elle-même refuse tout nouveau rattachement,
     * d'où l'intérêt de ne pas le proposer.
     */
    public List<Role> actifs() {
        return list("statut = ?1 order by code", StatutGenerique.ACTIF);
    }
}
