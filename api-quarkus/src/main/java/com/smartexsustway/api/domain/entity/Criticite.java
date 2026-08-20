package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.NiveauCriticite;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.Objects;
import java.util.UUID;

/** Correspond à la table {@code criticite}. Poids utilisé dans le calcul du risque attendu (RG26). */
@Entity
@Table(name = "criticite")
public class Criticite {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "code", nullable = false, unique = true, columnDefinition = "niveau_criticite")
    private NiveauCriticite code;

    @Column(name = "libelle", nullable = false, length = 100)
    private String libelle;

    @Column(name = "poids", nullable = false, precision = 4, scale = 2)
    private BigDecimal poids;

    protected Criticite() {
        // JPA
    }

    public UUID getId() {
        return id;
    }

    public NiveauCriticite getCode() {
        return code;
    }

    public String getLibelle() {
        return libelle;
    }

    public BigDecimal getPoids() {
        return poids;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Criticite other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
