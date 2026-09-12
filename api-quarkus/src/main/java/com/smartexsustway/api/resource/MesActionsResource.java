package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.repository.ActionPlanRepository;
import com.smartexsustway.api.resource.dto.MonActionDto;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.UUID;

/**
 * Le travail qui m'est confié, dans cette entreprise.
 *
 * <p>Cette route existe pour une raison de fond, pas de confort. Le
 * collaborateur lit le plan entier — masquer les actions des autres rendrait
 * la progression illisible (D28) — mais son propre travail était noyé : pour
 * le retrouver, il devait ouvrir chaque plan de chaque mission. La
 * contrepartie de cette lecture large est une vue qui répond à « qu'est-ce
 * que j'ai à faire ».
 *
 * <p><strong>Le filtre est posé en base, sur l'identité du jeton.</strong>
 * Aucun paramètre ne désigne l'utilisateur : il n'y a rien à falsifier. Et
 * rien n'est chargé puis trié à l'affichage — ce qui n'est pas rendu ici n'a
 * jamais quitté le serveur, ce qui n'est pas la même chose que de le cacher.
 *
 * <p>Elle n'accorde aucun droit nouveau : consulter ce dont on est
 * responsable est déjà permis depuis le plan. Les actions se modifient par
 * les routes existantes, qui appliquent leurs propres contrôles — le
 * collaborateur y reste borné à ses actions et s'arrête à {@code TERMINEE}.
 */
@Path("/api/v1/entreprises/{entrepriseId}/mes-actions")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class MesActionsResource {

    @Inject ActionPlanRepository actionRepository;
    @Inject AutorisationService autorisationService;
    @Inject TenantContext tenantContext;

    @GET
    public Response lister(@PathParam("entrepriseId") UUID entrepriseId) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        // Isolation multi-tenant : le rattachement est exigé avant toute
        // lecture, et la requête borne ensuite à cette même entreprise.
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);

        var actions = actionRepository
                .parResponsableDansEntreprise(utilisateurId, entrepriseId).stream()
                .map(MonActionDto::depuis)
                .toList();
        return Response.ok(actions).build();
    }
}
