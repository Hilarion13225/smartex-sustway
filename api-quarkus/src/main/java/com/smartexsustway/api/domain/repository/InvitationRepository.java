package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.Invitation;
import com.smartexsustway.api.domain.enums.StatutInvitation;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class InvitationRepository implements PanacheRepositoryBase<Invitation, UUID> {

    public Optional<Invitation> parToken(String token) {
        return find("token", token).firstResultOptional();
    }

    /** Invitations en attente d'une entreprise, pour l'écran de gestion des accès. */
    public List<Invitation> enAttenteParEntreprise(UUID entrepriseId) {
        return list("entreprise.id = ?1 and statut = ?2 order by createdAt desc", entrepriseId, StatutInvitation.EN_ATTENTE);
    }

    public boolean invitationEnAttenteExiste(UUID entrepriseId, String email) {
        return count("entreprise.id = ?1 and email = ?2 and statut = ?3", entrepriseId, email, StatutInvitation.EN_ATTENTE) > 0;
    }
}
