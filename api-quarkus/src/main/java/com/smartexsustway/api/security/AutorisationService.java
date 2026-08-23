package com.smartexsustway.api.security;

import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.ForbiddenException;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Point d'entrée UNIQUE pour toute décision d'autorisation métier
 * (au-delà du simple {@code @RolesAllowed} déclaratif porté par les
 * ressources REST). Exigence CDC §4 : "système centralisé de permissions
 * (policies) plutôt que par des vérifications dispersées dans le code".
 *
 * Toute vérification de permission fine (ex. "cet utilisateur peut-il
 * déposer une preuve sur cette entreprise ?") doit passer par ce service,
 * jamais par un if/else ad hoc dans une ressource ou un autre service.
 */
@ApplicationScoped
public class AutorisationService {

    /**
     * Rôles autorisés à administrer une entreprise cliente : sa fiche, ses
     * sites et les accès de ses collaborateurs (RG05). Le personnel interne
     * Smartex intervient au nom de Smartex ; EMPLOYE et VISITEUR restent en
     * consultation/dépôt.
     */
    public static final Set<String> ROLES_ADMINISTRATION_ENTREPRISE =
            Set.of("SUPER_ADMIN", "ADMIN_AUDIT", "RESPONSABLE_ENTREPRISE");

    @Inject
    UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;

    /**
     * Vrai si l'utilisateur est rattaché à l'entreprise avec un rôle qui
     * porte la permission demandée, pour au moins un de ses rattachements
     * actifs (entreprise entière ou site précis).
     */
    public boolean possedePermission(UUID utilisateurId, UUID entrepriseId, String codePermission) {
        List<UtilisateurEntreprise> rattachements = utilisateurEntrepriseRepository.parUtilisateur(utilisateurId);
        return rattachements.stream()
                .filter(r -> r.getEntreprise().getId().equals(entrepriseId))
                .anyMatch(r -> r.getRole().possede(codePermission));
    }

    /** Lève un 403 si la permission n'est pas accordée. À appeler en tête de toute opération sensible. */
    public void exigerPermission(UUID utilisateurId, UUID entrepriseId, String codePermission) {
        if (!possedePermission(utilisateurId, entrepriseId, codePermission)) {
            throw new ForbiddenException(
                    "Permission refusée : '%s' requise sur l'entreprise %s".formatted(codePermission, entrepriseId));
        }
    }

    /**
     * Vérifie le rôle porté sur l'entreprise, pas seulement le rattachement.
     * Le modèle de permissions fines (role_permission) n'est pas alimenté
     * pour les rôles clients : les opérations d'administration d'entreprise
     * s'appuient donc sur le code de rôle, mais toujours via ce service —
     * jamais par un test ad hoc dans une ressource.
     */
    public void exigerRoleSurEntreprise(UUID utilisateurId, UUID entrepriseId, Set<String> codesRoles) {
        boolean autorise = utilisateurEntrepriseRepository.parUtilisateur(utilisateurId).stream()
                .filter(r -> r.getEntreprise().getId().equals(entrepriseId))
                .anyMatch(r -> codesRoles.contains(r.getRole().getCode()));
        if (!autorise) {
            throw new ForbiddenException(
                    "Rôle insuffisant sur l'entreprise %s : %s requis".formatted(entrepriseId, codesRoles));
        }
    }

    /**
     * Isolation multi-tenant (exigence sécurité CDC §1.4) : vérifie que
     * l'utilisateur est bien rattaché à l'entreprise, indépendamment de la
     * permission. Sert de garde-fou systématique avant tout accès aux
     * données d'une entreprise.
     */
    public void exigerAccesEntreprise(UUID utilisateurId, UUID entrepriseId) {
        if (!utilisateurEntrepriseRepository.utilisateurRattacheAEntreprise(utilisateurId, entrepriseId)) {
            throw new ForbiddenException(
                    "Aucun rattachement actif de l'utilisateur %s à l'entreprise %s".formatted(utilisateurId, entrepriseId));
        }
    }
}
