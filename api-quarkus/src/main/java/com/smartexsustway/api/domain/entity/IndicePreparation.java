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
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Correspond à la table {@code indice_preparation}.
 * RG41/RG42/RG43 : indice de préparation bailleur (financements verts),
 * réservé à la formule Avancées. Même méthode de calcul que le score
 * pondéré (RG32, voir IndicePreparationService), restreinte aux critères
 * tagués applicables à ce bailleur (RG39, critere_bailleur) — un readiness
 * élevé n'est en aucun cas une garantie d'éligibilité auprès du bailleur.
 */
@Entity
@Table(name = "indice_preparation")
public class IndicePreparation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "audit_id", nullable = false)
    private Audit audit;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bailleur_id", nullable = false)
    private Bailleur bailleur;

    @Column(name = "score", nullable = false, precision = 6, scale = 2)
    private BigDecimal score;

    @Column(name = "date_calcul", nullable = false)
    private OffsetDateTime dateCalcul;

    protected IndicePreparation() {
        // JPA
    }

    public IndicePreparation(Audit audit, Bailleur bailleur, BigDecimal score, OffsetDateTime dateCalcul) {
        this.audit = audit;
        this.bailleur = bailleur;
        this.score = score;
        this.dateCalcul = dateCalcul;
    }

    public UUID getId() {
        return id;
    }

    public Audit getAudit() {
        return audit;
    }

    public Bailleur getBailleur() {
        return bailleur;
    }

    public BigDecimal getScore() {
        return score;
    }

    public void setScore(BigDecimal score) {
        this.score = score;
    }

    public OffsetDateTime getDateCalcul() {
        return dateCalcul;
    }

    public void setDateCalcul(OffsetDateTime dateCalcul) {
        this.dateCalcul = dateCalcul;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof IndicePreparation other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
