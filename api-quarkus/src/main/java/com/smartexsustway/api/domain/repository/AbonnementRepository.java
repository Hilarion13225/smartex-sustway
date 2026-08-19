package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Abonnement;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class AbonnementRepository implements PanacheRepositoryBase<Abonnement, UUID> {

    /**
     * L'abonnement le plus récent d'une entreprise. En pratique une seule
     * entreprise n'a qu'un abonnement à la fois dans ce squelette (pas de
     * changement de formule implémenté), mais on requête par date de
     * création décroissante pour rester robuste si l'historique s'étoffe.
     */
    public Optional<Abonnement> leplusRecentParEntreprise(UUID entrepriseId) {
        return find("entreprise.id = ?1 order by createdAt desc", entrepriseId).firstResultOptional();
    }
}
