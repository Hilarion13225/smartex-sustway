package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
import com.smartexsustway.api.domain.repository.AuditLogRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.dto.AuditLogDto;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * RG19 / §1.4 — consultation du journal d'audit d'une entreprise.
 *
 * Imbriquée sous /entreprises/{entrepriseId} comme les autres ressources
 * métier : le journal est une donnée d'entreprise, donc soumise à la même
 * isolation multi-tenant. Lecture seule par construction — une entrée de
 * journal ne se modifie ni ne se supprime.
 */
@Path("/api/v1/entreprises/{entrepriseId}/journal")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class AuditLogResource {

    private static final int TAILLE_MAX = 200;

    private static final String ROLE_RESPONSABLE_ENTREPRISE = "RESPONSABLE_ENTREPRISE";

    @Inject AuditLogRepository auditLogRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject AutorisationService autorisationService;
    @Inject TenantContext tenantContext;

    @GET
    public Response lister(@PathParam("entrepriseId") UUID entrepriseId,
                            @QueryParam("page") @DefaultValue("0") int page,
                            @QueryParam("taille") @DefaultValue("50") int taille) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        // Outil de redevabilité pour qui gère la relation avec l'entreprise
        // (staff pilote + responsable client), pas un outil de travail pour
        // un rôle scopé à une tâche précise (EXPERT_REVIEWER, VISITEUR...).
        autorisationService.exigerRoleSurEntreprise(utilisateurId, entrepriseId, AutorisationService.ROLES_ADMINISTRATION_ENTREPRISE);

        int tailleEffective = Math.min(Math.max(taille, 1), TAILLE_MAX);

        // RESPONSABLE_ENTREPRISE ne voit que ses propres activités, jamais
        // celles des autres collaborateurs ni du staff Smartex sur son
        // entreprise — décision produit. Le staff (SUPER_ADMIN/ADMIN_AUDIT,
        // qui passent la vérification ci-dessus) garde le journal complet,
        // c'est leur outil de redevabilité sur la relation client.
        boolean estResponsableEntreprise = utilisateurEntrepriseRepository
                .actifsParUtilisateurEtEntreprise(utilisateurId, entrepriseId).stream()
                .map(UtilisateurEntreprise::getRole)
                .anyMatch(role -> ROLE_RESPONSABLE_ENTREPRISE.equals(role.getCode()));

        var entrees = estResponsableEntreprise
                ? auditLogRepository.parEntrepriseEtUtilisateur(entrepriseId, utilisateurId, Math.max(page, 0), tailleEffective)
                : auditLogRepository.parEntreprise(entrepriseId, Math.max(page, 0), tailleEffective);

        // Résolution groupée des auteurs : une entrée sur deux partage le
        // même utilisateur, autant éviter un findById par ligne.
        Map<UUID, Utilisateur> auteurs = new HashMap<>();
        entrees.stream()
                .map(e -> e.getUtilisateurId())
                .filter(id -> id != null)
                .distinct()
                .forEach(id -> auteurs.put(id, utilisateurRepository.findById(id)));

        var dtos = entrees.stream().map(e -> AuditLogDto.depuis(e, auteurs.get(e.getUtilisateurId()))).toList();
        return Response.ok(dtos).build();
    }
}
