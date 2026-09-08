package com.smartexsustway.api.mission;

import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.enums.StatutAudit;
import com.smartexsustway.api.domain.repository.AuditRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * Clôture d'une mission : le geste qui fige son résultat.
 *
 * Ce service ne déclenche aucune analyse et ne connaît pas le pipeline IA. Il
 * constate seulement que le travail attendu est fait, puis passe la mission en
 * TERMINE. Lancer l'analyse est une décision séparée
 * (AnalyseMissionService), gouvernée par une permission séparée
 * (analyse:executer) : enchaîner les deux ferait qu'une personne habilitée à
 * clôturer provoquerait des appels au modèle sans détenir la permission qui
 * les gouverne.
 *
 * La condition métier se lit dans le modèle existant, sans nouveau statut :
 * un critère DECLARE est renseigné mais pas encore analysé, donc en suspens ;
 * un critère A_EVALUER n'attend rien, personne n'a rien fourni dessus et il
 * restera hors du score. Clôturer avec des DECLARE gèlerait un score qui
 * ignore une partie du travail de l'organisation.
 */
@ApplicationScoped
public class ClotureMissionService {

    @Inject AuditRepository auditRepository;
    @Inject AnalyseMissionService analyseMissionService;

    /**
     * Ce qui empêche encore de clôturer, vide si la mission est clôturable.
     *
     * Renvoyer le motif plutôt qu'un booléen : l'utilisateur doit savoir quoi
     * faire ensuite — attendre, lancer l'analyse, ou rien.
     */
    public Optional<String> obstacleACloture(UUID auditId) {
        Audit audit = auditRepository.findById(auditId);
        if (audit == null) {
            return Optional.of("Mission introuvable");
        }
        if (audit.getStatut() == StatutAudit.TERMINE) {
            return Optional.of("Cette mission est déjà clôturée");
        }
        if (analyseMissionService.enCours(auditId)) {
            return Optional.of("Une analyse est en cours sur cette mission : attendez qu'elle se termine avant de clôturer");
        }
        int enAttente = analyseMissionService.criteresEnAttenteDAnalyse(auditId).size();
        if (enAttente > 0) {
            return Optional.of(enAttente + " critère(s) renseigné(s) n'ont pas encore été analysés : lancez l'analyse avant de clôturer");
        }
        return Optional.empty();
    }

    /** Fige la mission. Les conditions sont supposées vérifiées par obstacleACloture. */
    @Transactional
    public void cloturer(UUID auditId) {
        Audit audit = auditRepository.findById(auditId);
        if (audit != null) {
            audit.setStatut(StatutAudit.TERMINE);
        }
    }
}
