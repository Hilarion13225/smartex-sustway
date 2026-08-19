package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Utilisateur;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class UtilisateurRepository implements PanacheRepositoryBase<Utilisateur, UUID> {

    public Optional<Utilisateur> parEmail(String email) {
        // La colonne 'email' est de type CITEXT côté base : la comparaison est
        // déjà insensible à la casse au niveau PostgreSQL, inutile de lower() ici.
        return find("email", email).firstResultOptional();
    }

    public boolean emailExiste(String email) {
        return count("email", email) > 0;
    }
}
