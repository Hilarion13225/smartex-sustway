package com.smartexsustway.api.scoring;

import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.repository.ScoreHistoriqueRepository;
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
 */
@ApplicationScoped
public class ScoreHistoriqueService {

    @Inject AuditScoreService auditScoreService;
    @Inject ScoreHistoriqueRepository scoreHistoriqueRepository;

    public void enregistrer(Audit audit) {
        var score = auditScoreService.calculer(audit);
        scoreHistoriqueRepository.enregistrer(audit.getId(), score.scoreGlobal());
    }
}
