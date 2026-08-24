package com.smartexsustway.api.domain.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * RG12 — sites couverts par une mission d'audit. Requêtes natives plutôt
 * qu'entité JPA à part entière : {@code audit_site} a une clé primaire
 * composite (audit_id + site_id, voir V1__init_schema.sql) et son seul
 * usage est ce CRUD de périmètre — même choix que CritereBailleurRepository
 * / CriticiteSecteurRepository.
 */
@ApplicationScoped
public class AuditSiteRepository {

    @Inject
    EntityManager em;

    @SuppressWarnings("unchecked")
    public List<UUID> siteIdsPourAudit(UUID auditId) {
        List<Object> resultats = em.createNativeQuery("SELECT site_id::text FROM audit_site WHERE audit_id = ?1")
                .setParameter(1, auditId)
                .getResultList();
        return resultats.stream().map(o -> UUID.fromString((String) o)).toList();
    }

    /** Remplace l'intégralité du périmètre de sites de la mission (sémantique PUT, pas d'ajout incrémental). */
    @Transactional
    public void definir(UUID auditId, List<UUID> siteIds) {
        em.createNativeQuery("DELETE FROM audit_site WHERE audit_id = ?1").setParameter(1, auditId).executeUpdate();
        for (UUID siteId : siteIds) {
            em.createNativeQuery("INSERT INTO audit_site (audit_id, site_id) VALUES (?1, ?2)")
                    .setParameter(1, auditId)
                    .setParameter(2, siteId)
                    .executeUpdate();
        }
    }
}
