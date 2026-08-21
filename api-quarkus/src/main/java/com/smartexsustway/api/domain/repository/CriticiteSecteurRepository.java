package com.smartexsustway.api.domain.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * RG37 — criticité variable selon le secteur d'activité de l'entreprise
 * (décision actée, CDC §13). Accès à {@code critere_criticite_secteur} en
 * requêtes natives plutôt qu'en entité JPA à part entière : la table n'a
 * pas de clé de substitution (clé primaire composite critere_id +
 * secteur_id, voir V1__init_schema.sql), et ses seuls usages sont ce
 * lookup de résolution et un CRUD d'override minimal (voir
 * CriticiteSecteurResource) — une entité complète avec @IdClass aurait
 * ajouté de la complexité sans bénéfice réel ici.
 */
@ApplicationScoped
public class CriticiteSecteurRepository {

    @Inject
    EntityManager em;

    /** Renvoie l'id de criticité en surcharge pour ce couple critère/secteur, si une override existe. */
    @SuppressWarnings("unchecked")
    public Optional<UUID> criticiteIdPourSecteur(UUID critereId, UUID secteurId) {
        List<Object> resultats = em.createNativeQuery(
                        "SELECT criticite_id::text FROM critere_criticite_secteur WHERE critere_id = ?1 AND secteur_id = ?2")
                .setParameter(1, critereId)
                .setParameter(2, secteurId)
                .getResultList();
        return resultats.isEmpty() ? Optional.empty() : Optional.of(UUID.fromString((String) resultats.get(0)));
    }

    /** Toutes les overrides définies pour un critère donné : une ligne [secteurId, criticiteId] (chaînes) par secteur. */
    @SuppressWarnings("unchecked")
    public List<Object[]> listerPourCritere(UUID critereId) {
        return em.createNativeQuery(
                        "SELECT secteur_id::text, criticite_id::text FROM critere_criticite_secteur WHERE critere_id = ?1")
                .setParameter(1, critereId)
                .getResultList();
    }

    /** Pose ou remplace l'override de criticité pour ce couple critère/secteur (back-office, SUPER_ADMIN). */
    @Transactional
    public void definir(UUID critereId, UUID secteurId, UUID criticiteId) {
        em.createNativeQuery(
                        "INSERT INTO critere_criticite_secteur (critere_id, secteur_id, criticite_id) "
                                + "VALUES (?1, ?2, ?3) "
                                + "ON CONFLICT (critere_id, secteur_id) DO UPDATE SET criticite_id = EXCLUDED.criticite_id")
                .setParameter(1, critereId)
                .setParameter(2, secteurId)
                .setParameter(3, criticiteId)
                .executeUpdate();
    }

    /** Retire l'override : le critère retombe sur sa criticité générale pour ce secteur. */
    @Transactional
    public void supprimer(UUID critereId, UUID secteurId) {
        em.createNativeQuery("DELETE FROM critere_criticite_secteur WHERE critere_id = ?1 AND secteur_id = ?2")
                .setParameter(1, critereId)
                .setParameter(2, secteurId)
                .executeUpdate();
    }
}
