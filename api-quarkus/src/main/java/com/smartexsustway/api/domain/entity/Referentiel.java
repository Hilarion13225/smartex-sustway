package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.StatutGenerique;
import com.smartexsustway.api.domain.enums.TypeReferentiel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/** Correspond à la table {@code referentiel}. RG07 : se décompose en plusieurs domaines. */
@Entity
@Table(name = "referentiel")
public class Referentiel {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "code", nullable = false, unique = true, length = 30)
    private String code;

    @Column(name = "nom", nullable = false, length = 200)
    private String nom;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "type", nullable = false, columnDefinition = "type_referentiel")
    private TypeReferentiel type;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "version", nullable = false, length = 20)
    private String version = "1.0";

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut", nullable = false, columnDefinition = "statut_generique")
    private StatutGenerique statut = StatutGenerique.ACTIF;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected Referentiel() {
        // JPA
    }

    public UUID getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getNom() {
        return nom;
    }

    public TypeReferentiel getType() {
        return type;
    }

    public String getDescription() {
        return description;
    }

    public String getVersion() {
        return version;
    }

    public StatutGenerique getStatut() {
        return statut;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Referentiel other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
