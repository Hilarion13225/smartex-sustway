package com.smartexsustway.api.security;

import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.ForbiddenException;

import java.util.List;
import java.util.Map;
import java.util.Optional;
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
     * Rôles autorisés à administrer la fiche d'une entreprise cliente et à
     * consulter son journal d'audit (RG05). Le personnel interne Smartex
     * intervient au nom de Smartex ; EMPLOYE et VISITEUR restent en
     * consultation/dépôt. Ne couvre PAS la gestion des comptes/accès
     * collaborateurs — voir ROLES_GESTION_MEMBRES, volontairement plus
     * restrictif.
     */
    public static final Set<String> ROLES_ADMINISTRATION_ENTREPRISE =
            Set.of("SUPER_ADMIN", "ADMIN_AUDIT", "RESPONSABLE_ENTREPRISE");

    /**
     * Rôles autorisés à lister, ajouter, modifier ou révoquer (désactiver)
     * les comptes/accès d'une entreprise cliente (MembreEntrepriseResource).
     * Décision produit : même le responsable de l'entreprise (RESPONSABLE_
     * ENTREPRISE) ne gère plus lui-même son équipe en libre-service — seul
     * SUPER_ADMIN en a la main, plus restrictif que ROLES_ADMINISTRATION_
     * ENTREPRISE qui couvre par ailleurs la fiche entreprise et le journal
     * d'audit (restés inchangés).
     */
    public static final Set<String> ROLES_GESTION_MEMBRES = Set.of("SUPER_ADMIN");

    /**
     * Personnel interne Smartex : audite/administre au nom de Smartex, donc
     * jamais bridé par la formule souscrite par le client (miroir exact de
     * ROLES_INTERNES_SMARTEX côté frontend, auth/permissions.js). Public
     * car réutilisé ailleurs (ex. AuditResource) pour valider qu'un
     * utilisateur affecté comme auditeur d'une mission (RG06) porte bien un
     * rôle interne, pas un rôle client.
     */
    public static final Set<String> ROLES_INTERNES_SMARTEX = Set.of("SUPER_ADMIN", "ADMIN_AUDIT");

    /**
     * Permissions retirées selon la formule souscrite — rôles côté client
     * uniquement (RG21/RG24/RG25/RG41). Miroir exact de RESTRICTIONS_PAR_PLAN
     * côté frontend (auth/permissions.js) : les deux modèles doivent rester
     * synchronisés, l'un pour l'affichage, l'autre pour l'autorisation réelle.
     */
    private static final Map<String, Set<String>> RESTRICTIONS_PAR_PLAN = Map.of(
            "FREE", Set.of("entreprise:creer", "entreprise:modifier", "audit:creer", "audit:modifier",
                    "preuve:deposer", "rapport:detaille", "bailleur:consulter"),
            "STANDARD", Set.of("rapport:detaille", "bailleur:consulter"),
            "AVANCEES", Set.of()
    );

    /**
     * Rôles à accès global (lecture ET écriture sur TOUTES les entreprises
     * de la plateforme, sans rattachement explicite requis) : SUPER_ADMIN
     * pour l'administration de la plateforme, et ADMIN_AUDIT parce qu'en
     * pratique un seul compte ADMIN_AUDIT gère toutes les missions d'audit
     * de tous les clients à ce stade du produit — exiger un rattachement
     * entreprise par entreprise n'aurait aucun sens opérationnel.
     */
    private static final Set<String> ROLES_ACCES_GLOBAL = Set.of("SUPER_ADMIN", "ADMIN_AUDIT");

    @Inject
    UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;

    private Optional<UtilisateurEntreprise> rattachementActif(UUID utilisateurId, UUID entrepriseId) {
        return utilisateurEntrepriseRepository.parUtilisateur(utilisateurId).stream()
                .filter(r -> r.getEntreprise().getId().equals(entrepriseId))
                .findFirst();
    }

    /**
     * Vrai si l'utilisateur porte un rôle à accès global (voir
     * ROLES_ACCES_GLOBAL) sur au moins une entreprise (peu importe
     * laquelle). Toutes les méthodes de ce service court-circuitent leur
     * vérification habituelle sur ce cas.
     */
    public boolean estAccesGlobalActif(UUID utilisateurId) {
        return utilisateurEntrepriseRepository.parUtilisateur(utilisateurId).stream()
                .anyMatch(r -> ROLES_ACCES_GLOBAL.contains(r.getRole().getCode()));
    }

    /**
     * Vrai si l'utilisateur est rattaché à l'entreprise avec un rôle qui
     * porte la permission demandée, pour au moins un de ses rattachements
     * actifs (entreprise entière ou site précis). Ne tient pas compte de la
     * formule — voir {@link #exigerPermission(UUID, UUID, String, String)}
     * pour la vérification complète rôle + formule.
     */
    public boolean possedePermission(UUID utilisateurId, UUID entrepriseId, String codePermission) {
        if (estAccesGlobalActif(utilisateurId)) {
            return true;
        }
        return rattachementActif(utilisateurId, entrepriseId)
                .map(r -> r.getRole().possede(codePermission))
                .orElse(false);
    }

    /** Lève un 403 si la permission n'est pas accordée par le rôle. À appeler en tête de toute opération sensible. */
    public void exigerPermission(UUID utilisateurId, UUID entrepriseId, String codePermission) {
        if (!possedePermission(utilisateurId, entrepriseId, codePermission)) {
            throw new ForbiddenException(
                    "Permission refusée : '%s' requise sur l'entreprise %s".formatted(codePermission, entrepriseId));
        }
    }

    /**
     * Vérification complète : la permission doit être accordée par le rôle
     * ET, pour un rôle côté client, ne pas être retirée par la formule
     * souscrite (le personnel interne Smartex n'est jamais concerné par
     * cette seconde vérification — voir ROLES_INTERNES_SMARTEX).
     * `formuleCode` peut être null (ex. formule non encore déterminée) :
     * traité alors comme le plan le plus restrictif.
     */
    public void exigerPermission(UUID utilisateurId, UUID entrepriseId, String formuleCode, String codePermission) {
        if (estAccesGlobalActif(utilisateurId)) {
            return;
        }
        UtilisateurEntreprise rattachement = rattachementActif(utilisateurId, entrepriseId)
                .filter(r -> r.getRole().possede(codePermission))
                .orElseThrow(() -> new ForbiddenException(
                        "Permission refusée : '%s' requise sur l'entreprise %s".formatted(codePermission, entrepriseId)));

        String roleCode = rattachement.getRole().getCode();
        if (!ROLES_INTERNES_SMARTEX.contains(roleCode)
                && RESTRICTIONS_PAR_PLAN.getOrDefault(formuleCode, RESTRICTIONS_PAR_PLAN.get("FREE")).contains(codePermission)) {
            throw new ForbiddenException(
                    "Permission '%s' non disponible avec la formule %s".formatted(codePermission, formuleCode));
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
        if (estAccesGlobalActif(utilisateurId)) {
            return;
        }
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
     * données d'une entreprise. Les rôles à accès global y échappent (voir
     * {@link #estAccesGlobalActif(UUID)}).
     */
    public void exigerAccesEntreprise(UUID utilisateurId, UUID entrepriseId) {
        if (estAccesGlobalActif(utilisateurId)) {
            return;
        }
        if (!utilisateurEntrepriseRepository.utilisateurRattacheAEntreprise(utilisateurId, entrepriseId)) {
            throw new ForbiddenException(
                    "Aucun rattachement actif de l'utilisateur %s à l'entreprise %s".formatted(utilisateurId, entrepriseId));
        }
    }
}
