package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.NiveauNonConformite;
import com.smartexsustway.api.domain.enums.StatutNonConformite;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Correspond à la table {@code non_conforme}.
 * RG17 : une évaluation peut générer zéro, une ou plusieurs non-conformités.
 * {@code niveau} et {@code risqueAttendu} sont dérivés de ScoringEngine
 * (RG26 : risqueAttendu = (1 - probabilité de conformité) x poids de
 * criticité ; niveau = prioriteNonConformite(risqueAttendu)) — voir
 * NonConformiteService, seul point de création de cette entité.
 */
@Entity
@Table(name = "non_conforme")
public class NonConforme {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "evaluation_id", nullable = false)
    private Evaluation evaluation;

    @Column(name = "titre", nullable = false, length = 255)
    private String titre;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "niveau", nullable = false, columnDefinition = "niveau_non_conformite")
    private NiveauNonConformite niveau;

    @Column(name = "risque_attendu", precision = 6, scale = 4)
    private BigDecimal risqueAttendu;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut", nullable = false, columnDefinition = "statut_non_conformite")
    private StatutNonConformite statut = StatutNonConformite.OUVERTE;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected NonConforme() {
        // JPA
    }

    public NonConforme(Evaluation evaluation, String titre, String description,
                        NiveauNonConformite niveau, BigDecimal risqueAttendu) {
        this.evaluation = evaluation;
        this.titre = titre;
        this.description = description;
        this.niveau = niveau;
        this.risqueAttendu = risqueAttendu;
    }

    public UUID getId() {
        return id;
    }

    public Evaluation getEvaluation() {
        return evaluation;
    }

    public String getTitre() {
        return titre;
    }

    public String getDescription() {
        return description;
    }

    public NiveauNonConformite getNiveau() {
        return niveau;
    }

    public BigDecimal getRisqueAttendu() {
        return risqueAttendu;
    }

    public StatutNonConformite getStatut() {
        return statut;
    }

    public void setStatut(StatutNonConformite statut) {
        this.statut = statut;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof NonConforme other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
