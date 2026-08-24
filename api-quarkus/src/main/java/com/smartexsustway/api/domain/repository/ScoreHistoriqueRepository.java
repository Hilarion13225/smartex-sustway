package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.ScoreHistorique;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * RG32 — historique du score global d'une mission dans le temps. Une seule
 * ligne par (audit, jour) : {@link #enregistrer} met à jour la ligne du
 * jour si elle existe déjà plutôt que d'en créer une nouvelle à chaque
 * évaluation validée dans la même journée.
 */
@ApplicationScoped
public class ScoreHistoriqueRepository implements PanacheRepositoryBase<ScoreHistorique, UUID> {

    public List<ScoreHistorique> parAudit(UUID auditId) {
        return list("audit.id = ?1 order by date asc", auditId);
    }

    @Transactional
    public void enregistrer(UUID auditId, BigDecimal scoreGlobal) {
        getEntityManager().createNativeQuery(
                        "INSERT INTO score_historique (audit_id, date, score_global) VALUES (?1, ?2, ?3) "
                                + "ON CONFLICT (audit_id, date) DO UPDATE SET score_global = EXCLUDED.score_global")
                .setParameter(1, auditId)
                .setParameter(2, LocalDate.now())
                .setParameter(3, scoreGlobal)
                .executeUpdate();
    }

    /**
     * RG32 + confidentialité : moyenne anonymisée du score le plus récent
     * de chaque entreprise d'un secteur donné (une seule valeur par
     * entreprise, même si elle a plusieurs missions). Ne renvoie jamais de
     * détail par entreprise — seuls le nombre d'entreprises et la moyenne
     * sortent de cette requête, à charge de l'appelant de masquer la
     * moyenne sous un seuil minimal (k-anonymat, voir ScoreHistoriqueDto).
     */
    public Object[] moyenneParSecteur(UUID secteurId) {
        return (Object[]) getEntityManager().createNativeQuery(
                        "SELECT count(*), avg(score_global) FROM ("
                                + "  SELECT DISTINCT ON (a.entreprise_id) sh.score_global "
                                + "  FROM score_historique sh "
                                + "  JOIN audit a ON a.id = sh.audit_id "
                                + "  JOIN entreprise e ON e.id = a.entreprise_id "
                                + "  WHERE e.secteur_id = ?1 "
                                + "  ORDER BY a.entreprise_id, sh.date DESC"
                                + ") derniers_scores")
                .setParameter(1, secteurId)
                .getSingleResult();
    }
}
