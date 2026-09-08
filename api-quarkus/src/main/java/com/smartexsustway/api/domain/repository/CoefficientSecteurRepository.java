package com.smartexsustway.api.domain.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Coefficient de pondération variable selon le secteur d'activité.
 *
 * Accès en requêtes natives plutôt qu'en entité JPA, pour les mêmes raisons
 * que CriticiteSecteurRepository : la table a une clé primaire composite
 * (critere_id + secteur_id), et ses seuls usages sont ce lookup de
 * résolution et le CRUD d'administration.
 */
@ApplicationScoped
public class CoefficientSecteurRepository {

    @Inject
    EntityManager em;

    /** Coefficient en surcharge pour ce couple critère/secteur, s'il en existe un. */
    @SuppressWarnings("unchecked")
    public Optional<BigDecimal> coefficientPourSecteur(UUID critereId, UUID secteurId) {
        List<Object> resultats = em.createNativeQuery(
                        "SELECT coefficient FROM critere_coefficient_secteur "
                                + "WHERE critere_id = ?1 AND secteur_id = ?2")
                .setParameter(1, critereId)
                .setParameter(2, secteurId)
                .getResultList();
        return resultats.isEmpty() ? Optional.empty() : Optional.of((BigDecimal) resultats.get(0));
    }

    /** Surcharges définies pour un critère : une ligne [secteurId, coefficient] par secteur. */
    @SuppressWarnings("unchecked")
    public List<Object[]> listerPourCritere(UUID critereId) {
        return em.createNativeQuery(
                        "SELECT secteur_id::text, coefficient FROM critere_coefficient_secteur "
                                + "WHERE critere_id = ?1")
                .setParameter(1, critereId)
                .getResultList();
    }

    /** Pose ou remplace la surcharge pour ce couple critère/secteur. */
    @Transactional
    public void definir(UUID critereId, UUID secteurId, BigDecimal coefficient) {
        em.createNativeQuery(
                        "INSERT INTO critere_coefficient_secteur (critere_id, secteur_id, coefficient) "
                                + "VALUES (?1, ?2, ?3) "
                                + "ON CONFLICT (critere_id, secteur_id) DO UPDATE SET coefficient = EXCLUDED.coefficient")
                .setParameter(1, critereId)
                .setParameter(2, secteurId)
                .setParameter(3, coefficient)
                .executeUpdate();
    }

    /** Retire la surcharge : le critère retombe sur le coefficient de la grille. */
    @Transactional
    public void supprimer(UUID critereId, UUID secteurId) {
        em.createNativeQuery(
                        "DELETE FROM critere_coefficient_secteur WHERE critere_id = ?1 AND secteur_id = ?2")
                .setParameter(1, critereId)
                .setParameter(2, secteurId)
                .executeUpdate();
    }
}
