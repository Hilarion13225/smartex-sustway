package com.smartexsustway.api.domain.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Secteurs auxquels s'applique un critère à applicabilité SECTORIELLE
 * (RG34).
 *
 * Un critère de ce type n'entre dans le questionnaire d'une mission que si
 * le secteur de l'organisation auditée y est rattaché : poser la gestion des
 * rejets industriels à une société de services n'a pas d'objet, et la
 * pondération ne suffit pas — on veut ne pas poser la question du tout.
 *
 * Requêtes natives plutôt qu'entité JPA, pour les mêmes raisons que
 * CriticiteSecteurRepository : clé primaire composite et usages limités à ce
 * lookup et à un CRUD d'administration. La colonne `criticite_id` de la table
 * n'est pas utilisée ici — la surcharge de criticité passe par
 * critere_criticite_secteur.
 */
@ApplicationScoped
public class CritereSecteurRepository {

    @Inject
    EntityManager em;

    /** Identifiants des critères applicables à ce secteur, parmi ceux passés en argument. */
    @SuppressWarnings("unchecked")
    public List<UUID> critereIdsApplicablesAuSecteur(UUID secteurId) {
        List<Object> resultats = em.createNativeQuery(
                        "SELECT critere_id::text FROM critere_secteur "
                                + "WHERE secteur_id = ?1 AND applicable = true")
                .setParameter(1, secteurId)
                .getResultList();
        return resultats.stream().map(id -> UUID.fromString((String) id)).toList();
    }

    /** Secteurs rattachés à un critère : une ligne [secteurId, applicable]. */
    @SuppressWarnings("unchecked")
    public List<Object[]> listerPourCritere(UUID critereId) {
        return em.createNativeQuery(
                        "SELECT secteur_id::text, applicable FROM critere_secteur WHERE critere_id = ?1")
                .setParameter(1, critereId)
                .getResultList();
    }

    /** Rattache le critère au secteur, ou met à jour son applicabilité. */
    @Transactional
    public void definir(UUID critereId, UUID secteurId, boolean applicable) {
        em.createNativeQuery(
                        "INSERT INTO critere_secteur (critere_id, secteur_id, applicable) "
                                + "VALUES (?1, ?2, ?3) "
                                + "ON CONFLICT (critere_id, secteur_id) DO UPDATE SET applicable = EXCLUDED.applicable")
                .setParameter(1, critereId)
                .setParameter(2, secteurId)
                .setParameter(3, applicable)
                .executeUpdate();
    }

    /** Détache le critère du secteur : il cesse d'être posé aux organisations de ce secteur. */
    @Transactional
    public void supprimer(UUID critereId, UUID secteurId) {
        em.createNativeQuery("DELETE FROM critere_secteur WHERE critere_id = ?1 AND secteur_id = ?2")
                .setParameter(1, critereId)
                .setParameter(2, secteurId)
                .executeUpdate();
    }
}
