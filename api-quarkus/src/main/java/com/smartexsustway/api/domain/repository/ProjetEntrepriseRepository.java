package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.ProjetEntreprise;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ProjetEntrepriseRepository implements PanacheRepositoryBase<ProjetEntreprise, UUID> {

    public List<ProjetEntreprise> parProjet(UUID projetId) {
        return list("projet.id = ?1", projetId);
    }

    public long compterParProjet(UUID projetId) {
        return count("projet.id = ?1", projetId);
    }
}
