package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Document;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class DocumentRepository implements PanacheRepositoryBase<Document, UUID> {

    public List<Document> parEntreprise(UUID entrepriseId) {
        return list("entreprise.id = ?1 order by createdAt desc", entrepriseId);
    }
}
