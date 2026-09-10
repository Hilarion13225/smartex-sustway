package com.smartexsustway.api.audit;

import com.smartexsustway.api.domain.entity.AuditLog;
import com.smartexsustway.api.domain.repository.AuditLogRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.UUID;

/**
 * Point d'écriture UNIQUE du journal d'audit (RG19). Exigence §1.4 :
 * la traçabilité couvre aussi les accès en LECTURE aux documents
 * financiers/RH, pas seulement les modifications — donc à appeler aussi
 * bien sur les actions de lecture sensibles que sur les écritures.
 *
 * REJOINT la transaction appelante (REQUIRED, comportement par défaut de
 * {@code @Transactional}) plutôt que d'en ouvrir une séparée.
 *
 * Historique : la première version utilisait REQUIRES_NEW dans l'idée
 * qu'un audit_log ne devait jamais être perdu à cause d'un rollback de
 * la transaction métier. En pratique, ça cassait les cas les plus
 * fréquents : journaliser la création d'un utilisateur ou d'une
 * entreprise juste après l'avoir persisté dans LA MÊME transaction, pas
 * encore validée en base — REQUIRES_NEW démarre une transaction séparée
 * qui ne voit pas encore cette ligne non commitée, d'où une violation de
 * clé étrangère systématique sur utilisateur_id/entreprise_id.
 * REQUIRED est le bon défaut : le log partage l'atomicité de l'action
 * qu'il décrit (il n'existe que si l'action a réellement eu lieu), et
 * référence sans risque des entités créées dans le même use case.
 */
@ApplicationScoped
public class AuditLogService {

    @Inject
    AuditLogRepository auditLogRepository;

    @Transactional
    public void journaliser(UUID utilisateurId, UUID entrepriseId, String action, String entite, UUID entiteId) {
        AuditLog entree = new AuditLog(utilisateurId, entrepriseId, action, entite, entiteId);
        auditLogRepository.persist(entree);
    }

    /**
     * Journalise en attachant un contexte JSON à l'entrée.
     *
     * Certaines opérations ne se retrouvent pas à partir de la seule paire
     * (entité, identifiant) : valider une exigence importée, par exemple, doit
     * pouvoir se relire en sachant de quelle version du référentiel elle
     * relevait. Écrire une seconde entrée pour porter ce contexte le
     * dissocierait de l'acte lui-même ; la colonne `details` existe pour cela.
     *
     * Le JSON est sérialisé par l'appelant et stocké tel quel — c'est la
     * convention de la colonne depuis son introduction.
     */
    @Transactional
    public void journaliserAvecDetails(UUID utilisateurId, UUID entrepriseId, String action,
                                       String entite, UUID entiteId, String detailsJson) {
        AuditLog entree = new AuditLog(utilisateurId, entrepriseId, action, entite, entiteId);
        entree.setDetails(detailsJson);
        auditLogRepository.persist(entree);
    }

    @Transactional
    public void journaliser(UUID utilisateurId, UUID entrepriseId, String action, String entite,
                             UUID entiteId, String ipAddress, String userAgent) {
        AuditLog entree = new AuditLog(utilisateurId, entrepriseId, action, entite, entiteId);
        entree.setIpAddress(ipAddress);
        entree.setUserAgent(userAgent);
        auditLogRepository.persist(entree);
    }
}
