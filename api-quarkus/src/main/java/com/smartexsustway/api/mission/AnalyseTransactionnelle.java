package com.smartexsustway.api.mission;

import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.EvaluationRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Unités transactionnelles de la passe d'analyse.
 *
 * La passe s'exécute sur un fil d'arrière-plan, longtemps après que la requête
 * HTTP qui l'a lancée s'est terminée. Elle ne peut donc emprunter ni la
 * session ni la connexion de cette requête : la première lecture faite hors
 * transaction échouait par intermittence sur « statement fermé », selon que le
 * fil démarrait avant ou après la fin de la requête.
 *
 * Chaque accès à la base passe donc par une méthode de ce bean, qui ouvre sa
 * propre transaction. Bean séparé et non méthode privée d'AnalyseMissionService :
 * un appel qu'un objet se fait à lui-même ne traverse pas le proxy CDI, et
 * l'annotation y resterait sans effet.
 *
 * Découper ainsi sert aussi la passe elle-même : une mission de quatre-vingt-douze
 * critères tenue dans une seule transaction garderait la base verrouillée
 * plusieurs minutes, et un échec au dernier critère annulerait les
 * quatre-vingt-onze analyses précédentes.
 */
@ApplicationScoped
public class AnalyseTransactionnelle {

    @Inject AuditRepository auditRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject EvaluationRepository evaluationRepository;
    @Inject AnalyseCritereService analyseCritereService;

    /** Issue d'un critère : analysé, rien à analyser, ou échec du pipeline. */
    public enum Issue { ANALYSE, RIEN, ECHEC }

    /**
     * Critères que la passe traitera.
     *
     * Ceux que la mission porte réellement, moins ceux qui portent déjà une
     * évaluation : une analyse par critère, définitive. Le filtre est ici en
     * plus de la garde du service, non pour la doubler mais pour que la passe
     * ne parcoure pas ce qu'elle ne traitera pas — sans lui, le compteur
     * annonçait quatre-vingt-douze critères pour n'en analyser que quelques-uns.
     */
    @Transactional
    public List<UUID> idsDesCriteresAAnalyser(UUID auditId) {
        return auditCritereRepository.parAudit(auditId).stream()
                .filter(AuditCritere::isActif)
                .filter(AuditCritere::isApplicable)
                .filter(c -> evaluationRepository.laPlusRecenteParAuditCritere(c.getId()).isEmpty())
                .map(AuditCritere::getId)
                .toList();
    }

    @Transactional
    public Issue analyserUnCritere(UUID auditId, UUID auditCritereId) {
        Audit audit = auditRepository.findById(auditId);
        AuditCritere auditCritere = auditCritereRepository.findById(auditCritereId);
        if (audit == null || auditCritere == null) {
            return Issue.ECHEC;
        }
        var resultat = analyseCritereService.analyser(audit, auditCritere);
        if (resultat instanceof AnalyseCritereService.Resultat.Analyse) {
            return Issue.ANALYSE;
        }
        if (resultat instanceof AnalyseCritereService.Resultat.RienAAnalyser
                || resultat instanceof AnalyseCritereService.Resultat.DejaAnalyse) {
            // « Déjà analysé » se range avec « rien à analyser » : dans les deux
            // cas la passe n'avait pas à travailler. Le ranger dans les échecs
            // ferait croire à une panne là où la règle a simplement joué — le
            // cas survient si le critère est évalué entre le filtre et ici.
            return Issue.RIEN;
        }
        return Issue.ECHEC;
    }
}
