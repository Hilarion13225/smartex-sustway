package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Paiement;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class PaiementRepository implements PanacheRepositoryBase<Paiement, UUID> {

    public List<Paiement> parAbonnement(UUID abonnementId) {
        return list("abonnement.id = ?1 order by datePaiement desc nulls first", abonnementId);
    }
}
