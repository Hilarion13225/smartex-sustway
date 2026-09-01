package com.smartexsustway.api.domain.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * RG06 — équipe affectée à une mission d'audit, un rôle de mission par
 * personne (AUDITEUR_PRINCIPAL/SECONDAIRE/OBSERVATEUR).
 * Requêtes natives : {@code audit_auditeur} a une clé primaire composite
 * (audit_id + utilisateur_id), même choix que AuditSiteRepository /
 * CritereBailleurRepository.
 */
@ApplicationScoped
public class AuditAuditeurRepository {

    @Inject
    EntityManager em;

    /** Une ligne [utilisateur_id::text, role_mission::text] par membre affecté. */
    @SuppressWarnings("unchecked")
    public List<Object[]> listerPourAudit(UUID auditId) {
        return em.createNativeQuery("SELECT utilisateur_id::text, role_mission::text FROM audit_auditeur WHERE audit_id = ?1")
                .setParameter(1, auditId)
                .getResultList();
    }

    /** Pose ou remplace le rôle de mission de cette personne sur cet audit (RG06 : peut déjà être affectée à d'autres missions). */
    @Transactional
    public void affecter(UUID auditId, UUID utilisateurId, String roleMission) {
        em.createNativeQuery(
                        "INSERT INTO audit_auditeur (audit_id, utilisateur_id, role_mission) "
                                + "VALUES (?1, ?2, CAST(?3 AS role_mission_auditeur)) "
                                + "ON CONFLICT (audit_id, utilisateur_id) DO UPDATE SET role_mission = EXCLUDED.role_mission")
                .setParameter(1, auditId)
                .setParameter(2, utilisateurId)
                .setParameter(3, roleMission)
                .executeUpdate();
    }

    @Transactional
    public void retirer(UUID auditId, UUID utilisateurId) {
        em.createNativeQuery("DELETE FROM audit_auditeur WHERE audit_id = ?1 AND utilisateur_id = ?2")
                .setParameter(1, auditId)
                .setParameter(2, utilisateurId)
                .executeUpdate();
    }
}
