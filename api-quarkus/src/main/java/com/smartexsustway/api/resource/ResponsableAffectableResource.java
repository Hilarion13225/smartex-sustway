package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.resource.dto.ResponsableAffectableDto;
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
 * À qui confier un plan ou une action, dans cette entreprise.
 *
 * <p>Cette ressource existe pour une raison précise. L'affectation exige que
 * le responsable soit rattaché à l'entreprise de la mission — l'API refuse
 * tout autre utilisateur (403). Mais la seule route qui listait les membres,
 * {@code MembreEntrepriseResource}, est fermée au
 * {@code RESPONSABLE_ENTREPRISE} par décision produit : la gestion des accès
 * lui a été retirée. Celui qui doit affecter ne pouvait donc pas savoir à qui.
 *
 * <p>Le choix retenu n'est pas de rouvrir la gestion des accès — elle reste
 * fermée, {@code ROLES_GESTION_MEMBRES} est inchangé — mais d'exposer
 * <strong>uniquement ce que désigner quelqu'un demande</strong> : un
 * identifiant et un nom.
 *
 * <p>Ce que cette route ne permet pas, et ne doit jamais permettre : créer,
 * modifier, révoquer ou activer un compte, lire un rôle ou une permission,
 * atteindre une autre entreprise. Elle est en lecture seule, bornée à
 * l'entreprise du chemin, et rend un DTO qui ne porte rien d'autre.
 *
 * <p><strong>Elle n'est pas une autorisation.</strong> Le frontend n'est
 * jamais source d'autorité : figurer dans cette liste ne dispense pas
 * {@code PlanActionService.responsableDeLEntreprise} de revérifier le
 * rattachement au moment de l'écriture.
 */
@Path("/api/v1/entreprises/{entrepriseId}/responsables-affectables")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class ResponsableAffectableResource {

    /**
     * Même permission que l'affectation elle-même : qui ne peut pas affecter
     * n'a pas besoin de savoir à qui. Le collaborateur est donc refusé ici
     * comme il l'est sur la réaffectation, et ne gagne aucun droit.
     */
    private static final String PERMISSION_MODIFIER = "audit:modifier";

    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject AutorisationService autorisationService;
    @Inject TenantContext tenantContext;

    @GET
    public Response lister(@PathParam("entrepriseId") UUID entrepriseId) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        // Contrôle de rôle seul, sans la formule : la formule borne ce qu'on
        // peut écrire, et lire les noms de sa propre équipe n'est pas une
        // capacité vendue. L'affectation, elle, reste soumise à la formule
        // comme avant — cette liste ne donne aucun pouvoir d'écriture.
        autorisationService.exigerPermission(utilisateurId, entrepriseId, PERMISSION_MODIFIER);

        // Seuls les rattachements actifs : c'est exactement l'ensemble que
        // l'affectation acceptera. Proposer un accès révoqué produirait un
        // refus incompréhensible au moment de valider.
        var responsables = utilisateurEntrepriseRepository.actifsParEntreprise(entrepriseId).stream()
                .map(ResponsableAffectableDto::depuis)
                .distinct()
                .toList();
        return Response.ok(responsables).build();
    }
}
