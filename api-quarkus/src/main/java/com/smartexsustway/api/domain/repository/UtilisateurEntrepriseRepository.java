package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
import com.smartexsustway.api.domain.enums.StatutGenerique;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class UtilisateurEntrepriseRepository implements PanacheRepositoryBase<UtilisateurEntreprise, UUID> {

    /**
     * Toutes les entreprises auxquelles un utilisateur est rattaché (RBAC).
     * Triées par date d'affectation croissante : le rattachement le plus
     * ancien (donc le plus probable d'être l'entreprise "principale" de
     * l'utilisateur) arrive en premier. Utilisé notamment par AuthResource
     * pour choisir l'entreprise/le rôle embarqués dans le JWT tant qu'aucun
     * sélecteur d'entreprise courante n'existe côté UI (TODO phase C).
     * Sans ce tri, l'ordre de retour n'est pas garanti par JPA — le choix
     * du "premier" rattachement serait arbitraire d'un appel à l'autre.
     */
    public List<UtilisateurEntreprise> parUtilisateur(UUID utilisateurId) {
        return list("utilisateur.id = ?1 and statut = ?2 order by dateAffectation asc",
                utilisateurId, StatutGenerique.ACTIF);
    }

    /**
     * Tous les rattachements d'une entreprise, actifs ou révoqués, pour
     * l'écran de gestion des accès : un accès retiré reste visible avec son
     * statut plutôt que de disparaître sans trace (traçabilité CDC §1.4).
     */
    public List<UtilisateurEntreprise> parEntreprise(UUID entrepriseId) {
        return list("entreprise.id", entrepriseId);
    }

    /** Rattachement actif d'un utilisateur donné sur une entreprise, avec ou sans site. */
    public List<UtilisateurEntreprise> actifsParUtilisateurEtEntreprise(UUID utilisateurId, UUID entrepriseId) {
        return list("utilisateur.id = ?1 and entreprise.id = ?2 and statut = ?3",
                utilisateurId, entrepriseId, StatutGenerique.ACTIF);
    }

    /**
     * Accès révoqué portant exactement le même périmètre (même site, ou
     * entreprise entière) : il est réactivé plutôt que dupliqué, les index
     * d'unicité partielle de la table interdisant la seconde ligne.
     */
    public Optional<UtilisateurEntreprise> revoqueParUtilisateurEtPerimetre(
            UUID utilisateurId, UUID entrepriseId, UUID siteId) {
        String filtreSite = siteId == null ? "site is null" : "site.id = ?4";
        var requete = "utilisateur.id = ?1 and entreprise.id = ?2 and statut <> ?3 and " + filtreSite;
        return siteId == null
                ? find(requete, utilisateurId, entrepriseId, StatutGenerique.ACTIF).firstResultOptional()
                : find(requete, utilisateurId, entrepriseId, StatutGenerique.ACTIF, siteId).firstResultOptional();
    }

    public boolean utilisateurRattacheAEntreprise(UUID utilisateurId, UUID entrepriseId) {
        return count("utilisateur.id = ?1 and entreprise.id = ?2 and statut = ?3",
                utilisateurId, entrepriseId, StatutGenerique.ACTIF) > 0;
    }
}
