package com.smartexsustway.api.scoring;

import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Domaine;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.enums.StatutEvaluation;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.EvaluationRepository;
import com.smartexsustway.api.domain.rules.ScoringEngine;
import com.smartexsustway.api.resource.dto.AuditScoreDto;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * RG32 — agrégation du score global et par domaine d'une mission,
 * partagée entre le tableau de bord (AuditResource) et la génération de
 * rapports (RapportGenerationService) : un seul et même calcul, jamais
 * dupliqué entre les deux usages.
 */
@ApplicationScoped
public class AuditScoreService {

    @Inject AuditCritereRepository auditCritereRepository;
    @Inject EvaluationRepository evaluationRepository;

    public AuditScoreDto calculer(Audit audit) {
        List<AuditCritere> criteresMission = auditCritereRepository.parAudit(audit.getId()).stream()
                .filter(AuditCritere::isActif)
                .filter(AuditCritere::isApplicable)
                .toList();

        Map<Domaine, Integer> totalParDomaine = new LinkedHashMap<>();
        Map<Domaine, List<ScoringEngine.CritereEvalue>> evaluesParDomaine = new LinkedHashMap<>();
        List<ScoringEngine.CritereEvalue> tousEvalues = new ArrayList<>();
        int[] repartitionNiveaux = new int[5];
        int nombreEnRevue = 0;

        for (AuditCritere auditCritere : criteresMission) {
            Domaine domaine = auditCritere.getCritere().getDomaine();
            totalParDomaine.merge(domaine, 1, Integer::sum);

            Evaluation derniere = evaluationRepository.laPlusRecenteParAuditCritere(auditCritere.getId()).orElse(null);
            if (derniere == null) {
                continue;
            }
            if (derniere.getStatut() == StatutEvaluation.EN_REVUE) {
                nombreEnRevue++;
            } else if (derniere.getStatut() == StatutEvaluation.VALIDEE) {
                var critereEvalue = new ScoringEngine.CritereEvalue(
                        derniere.getProbabiliteConforme(), auditCritere.getCoefficientPonderation());
                tousEvalues.add(critereEvalue);
                evaluesParDomaine.computeIfAbsent(domaine, d -> new ArrayList<>()).add(critereEvalue);
                repartitionNiveaux[derniere.getNote() - 1]++;
            }
        }

        BigDecimal scoreGlobal = ScoringEngine.scorePondere(tousEvalues);

        List<AuditScoreDto.DomaineScoreDto> domaines = totalParDomaine.keySet().stream()
                .sorted(Comparator.comparingInt(Domaine::getOrdre))
                .map(domaine -> {
                    List<ScoringEngine.CritereEvalue> evaluesDomaine = evaluesParDomaine.getOrDefault(domaine, List.of());
                    return new AuditScoreDto.DomaineScoreDto(
                            domaine.getCode(),
                            domaine.getNom(),
                            ScoringEngine.scorePondere(evaluesDomaine),
                            totalParDomaine.get(domaine),
                            evaluesDomaine.size());
                })
                .toList();

        int nombreEvalues = tousEvalues.size();
        return new AuditScoreDto(
                audit.getId(),
                scoreGlobal,
                criteresMission.size(),
                nombreEvalues,
                nombreEnRevue,
                criteresMission.size() - nombreEvalues - nombreEnRevue,
                domaines,
                Arrays.stream(repartitionNiveaux).boxed().toList());
    }
}
