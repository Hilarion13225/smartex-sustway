package com.smartexsustway.api.indice;

import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Bailleur;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.entity.IndicePreparation;
import com.smartexsustway.api.domain.enums.StatutEvaluation;
import com.smartexsustway.api.domain.enums.StatutIndice;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.CritereBailleurRepository;
import com.smartexsustway.api.domain.repository.EvaluationRepository;
import com.smartexsustway.api.domain.repository.IndicePreparationRepository;
import com.smartexsustway.api.domain.rules.ScoringEngine;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * RG41/RG42/RG43 — indice de préparation d'une mission aux exigences d'un
 * bailleur (financements verts, formule Avancées uniquement). Même méthode
 * de calcul que le score pondéré global (RG32, voir AuditScoreService),
 * mais restreinte aux seuls critères tagués applicables à ce bailleur
 * (RG39/RG40, critere_bailleur) plutôt qu'à l'ensemble de la mission —
 * deux périmètres différents, un seul et même moteur de calcul
 * (ScoringEngine), pour ne jamais faire dériver les deux lectures d'un
 * audit. RG42 : un indice élevé mesure un alignement, pas une garantie
 * d'éligibilité — ce disclaimer relève de l'affichage (frontend), pas du
 * calcul lui-même.
 */
@ApplicationScoped
public class IndicePreparationService {

    @Inject AuditCritereRepository auditCritereRepository;
    @Inject EvaluationRepository evaluationRepository;
    @Inject CritereBailleurRepository critereBailleurRepository;
    @Inject IndicePreparationRepository indicePreparationRepository;

    public IndicePreparation calculerEtEnregistrer(Audit audit, Bailleur bailleur) {
        Set<UUID> critereIdsApplicables = Set.copyOf(critereBailleurRepository.critereIdsApplicables(bailleur.getId()));

        List<ScoringEngine.CritereEvalue> evalues = new ArrayList<>();
        if (!critereIdsApplicables.isEmpty()) {
            for (AuditCritere auditCritere : auditCritereRepository.parAudit(audit.getId())) {
                if (!auditCritere.isActif() || !auditCritere.isApplicable()) {
                    continue;
                }
                if (!critereIdsApplicables.contains(auditCritere.getCritere().getId())) {
                    continue;
                }
                Evaluation derniere = evaluationRepository.laPlusRecenteParAuditCritere(auditCritere.getId()).orElse(null);
                if (derniere == null || derniere.getStatut() != StatutEvaluation.VALIDEE) {
                    continue;
                }
                evalues.add(new ScoringEngine.CritereEvalue(derniere.getProbabiliteConforme(), auditCritere.getCoefficientPonderation()));
            }
        }

        // Le moteur rend 0 pour un ensemble vide — c'est correct pour une
        // moyenne pondérée, et faux comme réponse à « où en est cette
        // organisation vis-à-vis de ce bailleur ? ». La distinction se fait
        // donc ici, chez l'appelant, et non dans ScoringEngine : aucune des
        // deux lectures d'un audit ne doit voir son moteur diverger.
        StatutIndice statut;
        BigDecimal score;
        if (critereIdsApplicables.isEmpty()) {
            // Personne n'a encore dit ce qui compte pour ce bailleur. Ce n'est
            // pas un constat sur l'organisation auditée.
            statut = StatutIndice.NON_CALCULABLE;
            score = null;
        } else if (evalues.isEmpty()) {
            // Le périmètre existe, mais rien n'y est encore opposable : soit la
            // mission n'a pas assez avancé, soit aucun critère tagué n'appartient
            // à son référentiel. Les deux compteurs enregistrés permettent de
            // trancher entre les deux à la lecture.
            statut = StatutIndice.SANS_EVALUATION;
            score = null;
        } else {
            statut = StatutIndice.CALCULE;
            score = ScoringEngine.scorePondere(evalues).setScale(2, java.math.RoundingMode.HALF_UP);
        }

        IndicePreparation indice = indicePreparationRepository.parAuditEtBailleur(audit.getId(), bailleur.getId())
                .orElseGet(() -> new IndicePreparation(audit, bailleur, OffsetDateTime.now()));
        indice.enregistrerResultat(statut, score, critereIdsApplicables.size(), evalues.size(), OffsetDateTime.now());
        if (indice.getId() == null) {
            indicePreparationRepository.persist(indice);
        }
        return indice;
    }
}
