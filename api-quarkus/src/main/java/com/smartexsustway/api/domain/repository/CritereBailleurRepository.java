package com.smartexsustway.api.domain.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * RG39 — applicabilité d'un critère à un bailleur (financements verts).
 * Requêtes natives plutôt qu'entité JPA à part entière : {@code
 * critere_bailleur} a une clé primaire composite (critere_id + bailleur_id,
 * voir V1__init_schema.sql) et ses seuls usages sont ce CRUD de tag
 * back-office et la sélection des critères d'un bailleur pour le calcul de
 * l'indice de préparation (voir IndicePreparationService) — même choix que
 * CriticiteSecteurRepository.
 */
@ApplicationScoped
public class CritereBailleurRepository {

    @Inject
    EntityManager em;

    /** Tous les tags définis pour un critère donné : une ligne [bailleurId, applicable] par bailleur. */
    @SuppressWarnings("unchecked")
    public List<Object[]> listerPourCritere(UUID critereId) {
        return em.createNativeQuery(
                        "SELECT bailleur_id::text, applicable FROM critere_bailleur WHERE critere_id = ?1")
                .setParameter(1, critereId)
                .getResultList();
    }

    /** Les ids des critères marqués applicables (RG39) pour ce bailleur — base de calcul de l'indice de préparation. */
    @SuppressWarnings("unchecked")
    public List<UUID> critereIdsApplicables(UUID bailleurId) {
        List<Object> resultats = em.createNativeQuery(
                        "SELECT critere_id::text FROM critere_bailleur WHERE bailleur_id = ?1 AND applicable = true")
                .setParameter(1, bailleurId)
                .getResultList();
        return resultats.stream().map(o -> UUID.fromString((String) o)).toList();
    }

    /** Pose ou remplace le tag d'applicabilité pour ce couple critère/bailleur (back-office, SUPER_ADMIN). */
    @Transactional
    public void definir(UUID critereId, UUID bailleurId, boolean applicable) {
        em.createNativeQuery(
                        "INSERT INTO critere_bailleur (critere_id, bailleur_id, applicable) "
                                + "VALUES (?1, ?2, ?3) "
                                + "ON CONFLICT (critere_id, bailleur_id) DO UPDATE SET applicable = EXCLUDED.applicable")
                .setParameter(1, critereId)
                .setParameter(2, bailleurId)
                .setParameter(3, applicable)
                .executeUpdate();
    }

    /** Retire le tag : le critère ne compte plus du tout pour ce bailleur (distinct d'un simple applicable=false). */
    @Transactional
    public void supprimer(UUID critereId, UUID bailleurId) {
        em.createNativeQuery("DELETE FROM critere_bailleur WHERE critere_id = ?1 AND bailleur_id = ?2")
                .setParameter(1, critereId)
                .setParameter(2, bailleurId)
                .executeUpdate();
    }
}
