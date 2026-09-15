package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.CritereBailleurJustification;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Justifications des correspondances critère ↔ bailleur (V74).
 *
 * <p>« Vivante » désigne une justification ni rejetée ni périmée : brouillon
 * ou validée. C'est exactement le filtre de l'index {@code cbj_vivante_uidx},
 * qui n'en admet qu'une par couple. Les faire diverger laisserait le service
 * proposer une création que la base refuserait ensuite.
 */
@ApplicationScoped
public class CritereBailleurJustificationRepository implements PanacheRepositoryBase<CritereBailleurJustification, UUID> {

    /** La justification en cours pour ce couple, s'il y en a une. */
    public Optional<CritereBailleurJustification> vivante(UUID critereId, UUID bailleurId) {
        return find("critereId = ?1 and bailleurId = ?2 and perimeeLe is null and rejeteePar is null",
                critereId, bailleurId).firstResultOptional();
    }

    /** Toutes les justifications du couple, la plus récente d'abord : rejetées et périmées comprises. */
    public List<CritereBailleurJustification> historique(UUID critereId, UUID bailleurId) {
        return list("critereId = ?1 and bailleurId = ?2 order by creeLe desc, id desc", critereId, bailleurId);
    }

    /**
     * Une justification désignée par son id, à condition qu'elle appartienne
     * au couple de l'URL : sans ce filtre, un id valide passé sous un autre
     * critère agirait sur une justification que l'URL ne nomme pas.
     */
    public Optional<CritereBailleurJustification> duCouple(UUID id, UUID critereId, UUID bailleurId) {
        return find("id = ?1 and critereId = ?2 and bailleurId = ?3", id, critereId, bailleurId)
                .firstResultOptional();
    }

    /** Vrai si le couple a déjà porté au moins une justification, quel qu'en soit l'état. */
    public boolean aUnHistorique(UUID critereId, UUID bailleurId) {
        return count("critereId = ?1 and bailleurId = ?2", critereId, bailleurId) > 0;
    }

    /**
     * V74-B — critères dont la justification, pour ce bailleur, fait entrer
     * le mapping dans le périmètre de l'indice de préparation : validée, ni
     * périmée ni rejetée, et de correspondance EXACTE ou PARTIELLE.
     *
     * <p>AUCUNE est une validation qui constate que le critère ne correspond
     * pas au bailleur : la compter retournerait le sens de la preuve.
     * NON_DETERMINEE ne peut pas être validée (contrainte V74) ; le filtre
     * l'écarte quand même, pour qu'aucune donnée incohérente ne soit lue comme
     * une correspondance. PARTIELLE compte entièrement : la correspondance
     * décide de l'appartenance au périmètre, jamais du poids dans le score.
     *
     * <p>Une seule requête par bailleur, servie par l'index
     * {@code cbj_comptee_idx}, pour que le calcul ne fasse pas un aller-retour
     * par critère. L'unicité de la justification vivante garantit au plus une
     * ligne par couple : l'ensemble ne peut pas compter un critère deux fois.
     */
    public Set<UUID> critereIdsComptes(UUID bailleurId) {
        @SuppressWarnings("unchecked")
        List<Object> resultats = getEntityManager()
                .createNativeQuery("SELECT critere_id::text FROM critere_bailleur_justification "
                        + "WHERE bailleur_id = ?1 AND validee_par IS NOT NULL AND perimee_le IS NULL "
                        + "AND rejetee_par IS NULL AND correspondance IN ('EXACTE', 'PARTIELLE')")
                .setParameter(1, bailleurId)
                .getResultList();
        return resultats.stream().map(o -> UUID.fromString((String) o)).collect(Collectors.toUnmodifiableSet());
    }

    /**
     * Le mapping existe-t-il ? {@code critere_bailleur} n'a pas d'entité
     * (voir CritereBailleurRepository) : lecture native, sans rien y écrire.
     */
    public boolean mappingExiste(UUID critereId, UUID bailleurId) {
        Number nombre = (Number) getEntityManager()
                .createNativeQuery("SELECT count(*) FROM critere_bailleur WHERE critere_id = ?1 AND bailleur_id = ?2")
                .setParameter(1, critereId)
                .setParameter(2, bailleurId)
                .getSingleResult();
        return nombre.longValue() > 0;
    }
}
