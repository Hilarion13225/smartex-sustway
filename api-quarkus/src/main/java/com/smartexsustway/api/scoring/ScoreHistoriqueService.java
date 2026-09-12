package com.smartexsustway.api.scoring;

import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.repository.ScoreHistoriqueRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/**
 * Snapshot du score global d'une mission (RG32) après un événement qui le
 * fait varier — évaluation validée par EvaluationResource. Volontairement
 * séparé de {@link AuditScoreService#calculer}, qui reste un calcul pur sans
 * effet de bord : ce dernier est appelé à chaque lecture (tableau de bord,
 * rapports, détail de mission), et snapshotter à chaque lecture ferait exploser
 * score_historique sans rapport avec un changement réel de données.
 *
 * Ce service ne décide plus du cycle de vie de la mission. Il l'a fait un
 * temps, faute d'un autre endroit où loger la transition — et c'est par là
 * qu'une analyse pouvait porter une mission à TERMINE sans que personne ne
 * détienne `audit:cloturer`. Le démarrage relève désormais de
 * {@link com.smartexsustway.api.mission.CycleVieMissionService}, et la
 * clôture de ClotureMissionService, seule à écrire l'état terminal.
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
