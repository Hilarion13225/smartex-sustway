package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Entreprise;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class EntrepriseRepository implements PanacheRepositoryBase<Entreprise, UUID> {

    public Optional<Entreprise> parIdentifiantLegal(String identifiantLegal) {
        return find("identifiantLegal", identifiantLegal).firstResultOptional();
    }

    public boolean identifiantLegalExiste(String identifiantLegal) {
        return count("identifiantLegal", identifiantLegal) > 0;
    }

    /** Variante pour la modification : l'entreprise en cours d'édition ne se contredit pas elle-même (RG02). */
    public boolean identifiantLegalExistePourUneAutre(String identifiantLegal, UUID entrepriseId) {
        return count("identifiantLegal = ?1 and id <> ?2", identifiantLegal, entrepriseId) > 0;
    }
}
