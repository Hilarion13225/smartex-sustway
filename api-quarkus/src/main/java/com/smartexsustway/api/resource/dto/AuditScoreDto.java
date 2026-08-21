package com.smartexsustway.api.resource.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * RG32 — agrégation des scores d'une mission : score global et score par
 * domaine, tous deux calculés via ScoringEngine.scorePondere sur les seuls
 * critères actifs/applicables de la mission (RG35) ayant une évaluation
 * définitive (statut VALIDEE — une évaluation encore en revue experte
 * n'est pas encore la décision finale, RG16, et ne participe donc pas au
 * score tant qu'elle n'est pas traitée).
 */
public record AuditScoreDto(
        UUID auditId,
        BigDecimal scoreGlobal,
        int nombreCriteresTotal,
        int nombreCriteresEvalues,
        int nombreCriteresEnRevue,
        int nombreCriteresNonEvalues,
        List<DomaineScoreDto> domaines,
        /** RG27 — répartition des critères évalués par niveau d'engagement, index 0 = niveau 1 … index 4 = niveau 5. */
        List<Integer> repartitionNiveaux
) {
    public record DomaineScoreDto(
            String domaineCode,
            String domaineNom,
            BigDecimal score,
            int nombreCriteresTotal,
            int nombreCriteresEvalues
    ) {
    }
}
