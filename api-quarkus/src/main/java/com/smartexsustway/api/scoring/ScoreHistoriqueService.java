package com.smartexsustway.api.scoring;

import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.enums.StatutAudit;
import com.smartexsustway.api.domain.repository.ScoreHistoriqueRepository;
import com.smartexsustway.api.resource.dto.AuditScoreDto;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/**
 * Snapshot du score global d'une mission (RG32) après un événement qui le
 * fait varier — évaluation validée directement (EvaluationResource) ou via
 * une revue experte (RevueExperteResource). Volontairement séparé de
 * {@link AuditScoreService#calculer}, qui reste un calcul pur sans effet de
 * bord : ce dernier est appelé à chaque lecture (tableau de bord, rapports,
 * détail de mission), et snapshotter à chaque lecture ferait exploser
 * score_historique sans rapport avec un changement réel de données.
 *
 * Même hook, même raison, pour la transition de statut de la mission
 * (RG10/RG11) : jusqu'ici StatutAudit.setStatut n'était jamais appelé nulle
 * part, une mission restait BROUILLON pour toujours quel que soit son
 * avancement réel. `audit` est une entité gérée (chargée dans la même
 * transaction que EvaluationResource.evaluer/RevueExperteResource.traiter,
 * tous deux @Transactional) : la mutation est persistée par dirty-checking,
 * pas besoin d'un persist() explicite ici.
 */
@ApplicationScoped
public class ScoreHistoriqueService {

    @Inject AuditScoreService auditScoreService;
    @Inject ScoreHistoriqueRepository scoreHistoriqueRepository;

    public void enregistrer(Audit audit) {
        var score = auditScoreService.calculer(audit);
        scoreHistoriqueRepository.enregistrer(audit.getId(), score.scoreGlobal());
        mettreAJourStatutSiNecessaire(audit, score);
    }

    /**
     * BROUILLON -> EN_COURS dès la première évaluation validée ; EN_COURS
     * (ou BROUILLON, si tout est évalué d'un coup) -> TERMINE dès que tous
     * les critères actifs/applicables de la mission ont une évaluation
     * validée. TERMINE et ANNULE sont des états terminaux, jamais rouverts
     * automatiquement ici.
     */
    private void mettreAJourStatutSiNecessaire(Audit audit, AuditScoreDto score) {
        if (audit.getStatut() == StatutAudit.TERMINE || audit.getStatut() == StatutAudit.ANNULE) {
            return;
        }
        boolean toutEvalue = score.nombreCriteresTotal() > 0 && score.nombreCriteresEvalues() == score.nombreCriteresTotal();
        if (toutEvalue) {
            audit.setStatut(StatutAudit.TERMINE);
        } else if (audit.getStatut() == StatutAudit.BROUILLON && score.nombreCriteresEvalues() > 0) {
            audit.setStatut(StatutAudit.EN_COURS);
        }
    }
}
