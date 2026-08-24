package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.ScoreHistorique;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Un point de l'évolution du score global d'une mission dans le temps (RG32). */
public record ScoreHistoriqueDto(LocalDate date, BigDecimal scoreGlobal) {
    public static ScoreHistoriqueDto depuis(ScoreHistorique s) {
        return new ScoreHistoriqueDto(s.getDate(), s.getScoreGlobal());
    }
}
