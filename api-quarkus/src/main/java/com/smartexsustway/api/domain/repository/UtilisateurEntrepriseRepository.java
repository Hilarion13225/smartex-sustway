package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
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
        return list("utilisateur.id = ?1 order by dateAffectation asc", utilisateurId);
    }

    /** Tous les rattachements actifs d'une entreprise (pour l'écran de gestion des accès). */
    public List<UtilisateurEntreprise> parEntreprise(UUID entrepriseId) {
        return list("entreprise.id", entrepriseId);
    }

    public boolean utilisateurRattacheAEntreprise(UUID utilisateurId, UUID entrepriseId) {
        return count("utilisateur.id = ?1 and entreprise.id = ?2", utilisateurId, entrepriseId) > 0;
    }
}
