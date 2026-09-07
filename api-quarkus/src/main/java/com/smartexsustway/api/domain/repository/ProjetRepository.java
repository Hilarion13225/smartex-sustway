package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Projet;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ProjetRepository implements PanacheRepositoryBase<Projet, UUID> {

    public List<Projet> tous() {
        return list("order by createdAt desc");
    }
}
