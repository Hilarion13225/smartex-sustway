package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.CodeVerificationEmail;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class CodeVerificationEmailRepository implements PanacheRepositoryBase<CodeVerificationEmail, UUID> {

    /** Dernier code émis pour ce compte, utilisable ou non — à l'appelant d'en juger. */
    public Optional<CodeVerificationEmail> dernierPourUtilisateur(UUID utilisateurId) {
        return find("utilisateur.id = ?1 order by createdAt desc", utilisateurId).firstResultOptional();
    }

    /**
     * Consomme les codes encore vivants d'un compte. Appelé avant d'en émettre
     * un nouveau : deux codes valides en parallèle doubleraient la surface
     * d'attaque et laisseraient un ancien code activer le compte après qu'un
     * renvoi a été demandé.
     */
    public void consommerCodesVivants(UUID utilisateurId) {
        update("consommeLe = ?1 where utilisateur.id = ?2 and consommeLe is null",
                java.time.OffsetDateTime.now(), utilisateurId);
    }
}
