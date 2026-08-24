package com.smartexsustway.api.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

/**
 * Correspond à la table {@code score_historique}. Instantané quotidien du
 * score global d'une mission (RG32) — au plus une ligne par mission et par
 * jour, voir ScoreHistoriqueRepository.enregistrer.
 */
@Entity
@Table(name = "score_historique")
public class ScoreHistorique {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "audit_id", nullable = false)
    private Audit audit;

    @Column(name = "date", nullable = false)
    private LocalDate date;

    @Column(name = "score_global", nullable = false, precision = 4, scale = 2)
    private BigDecimal scoreGlobal;

    protected ScoreHistorique() {
        // JPA
    }

    public ScoreHistorique(Audit audit, LocalDate date, BigDecimal scoreGlobal) {
        this.audit = audit;
        this.date = date;
        this.scoreGlobal = scoreGlobal;
    }

    public UUID getId() {
        return id;
    }

    public Audit getAudit() {
        return audit;
    }

    public LocalDate getDate() {
        return date;
    }

    public BigDecimal getScoreGlobal() {
        return scoreGlobal;
    }

    public void setScoreGlobal(BigDecimal scoreGlobal) {
        this.scoreGlobal = scoreGlobal;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ScoreHistorique other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
