package com.smartexsustway.api.tenant;

import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.Optional;
import java.util.UUID;

/**
 * Isolation multi-tenant (exigence sécurité CDC §1.4 : "filtrage strict par
 * organisation sur chaque requête ; aucune entreprise ne doit accéder aux
 * données d'une autre"). Extrait l'entreprise courante et l'utilisateur
 * courant depuis les claims du JWT — à injecter dans toute ressource ou
 * service qui accède à des données rattachées à une entreprise, plutôt que
 * de faire confiance à un paramètre d'URL/de body fourni par le client.
 */
@RequestScoped
public class TenantContext {

    @Inject
    JsonWebToken jwt;

    public UUID utilisateurCourantId() {
        return UUID.fromString(jwt.getSubject());
    }

    public Optional<UUID> entrepriseCouranteId() {
        String claim = jwt.getClaim("entreprise_id");
        return claim == null ? Optional.empty() : Optional.of(UUID.fromString(claim));
    }

    /** À utiliser quand l'entreprise courante est obligatoire pour l'opération demandée. */
    public UUID exigerEntrepriseCourante() {
        return entrepriseCouranteId()
                .orElseThrow(() -> new jakarta.ws.rs.BadRequestException(
                        "Aucune entreprise courante associée à ce token — reconnexion nécessaire"));
    }
}
