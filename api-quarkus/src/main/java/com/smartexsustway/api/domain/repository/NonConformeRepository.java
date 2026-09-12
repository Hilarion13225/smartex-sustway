package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.NonConforme;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Accès aux non-conformités.
 *
 * <p><strong>Le chemin par défaut ne rend que les non-conformités
 * courantes.</strong> C'est délibéré : la base porte 39 lignes pour 22
 * écarts réels, les 17 excédentaires étant des doublons de ré-analyse
 * conservés comme historique. Une lecture qui les inclurait présenterait 39
 * non-conformités métier là où il n'y en a que 22.
 *
 * <p>L'historique reste atteignable, mais par une méthode qui le dit —
 * jamais par inadvertance.
 */
@ApplicationScoped
public class NonConformeRepository implements PanacheRepositoryBase<NonConforme, UUID> {

    /**
     * Les non-conformités actuelles d'une mission : une par critère au plus.
     *
     * <p>Le filtre porte sur {@code auditCritere.audit} et non plus sur
     * {@code evaluation.auditCritere.audit} : l'identité de l'écart est
     * désormais le critère, et le chemin le plus court est aussi le plus
     * solide — il ne dépend pas de l'évaluation qui a produit l'état.
     */
    public List<NonConforme> parAudit(UUID auditId) {
        return list("auditCritere.audit.id = ?1 and courante = true order by createdAt desc", auditId);
    }

    /**
     * Toutes les non-conformités d'une mission, historique compris.
     *
     * <p>Réservée aux vues d'historique explicites. Ne jamais l'employer
     * pour un décompte métier, une liste par défaut ou un rapport.
     */
    public List<NonConforme> parAuditAvecHistorique(UUID auditId) {
        return list("auditCritere.audit.id = ?1 order by createdAt desc", auditId);
    }

    /**
     * La non-conformité courante d'un critère, s'il en a une.
     *
     * <p>C'est le point d'entrée de la ré-analyse : trouver l'écart existant
     * pour l'actualiser plutôt que d'en créer un second.
     */
    public Optional<NonConforme> couranteParAuditCritere(UUID auditCritereId) {
        return find("auditCritere.id = ?1 and courante = true", auditCritereId).firstResultOptional();
    }

    /** Isolation multi-tenant (CDC §1.4) : ne renvoie la non-conformité que si elle appartient bien à cette mission. */
    public Optional<NonConforme> parIdEtAudit(UUID id, UUID auditId) {
        return find("id = ?1 and auditCritere.audit.id = ?2", id, auditId).firstResultOptional();
    }
}
