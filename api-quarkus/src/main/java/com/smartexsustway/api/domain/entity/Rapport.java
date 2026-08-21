package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.FormatRapport;
import com.smartexsustway.api.domain.enums.TypeRapport;
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

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Correspond à la table {@code rapport} (module 12). Le contenu généré est
 * stocké sur S3/MinIO comme les documents de preuve (voir StorageService) —
 * {@code cheminStockage} est la clé objet, jamais le contenu directement en
 * base.
 */
@Entity
@Table(name = "rapport")
public class Rapport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "audit_id", nullable = false)
    private Audit audit;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "type", nullable = false, columnDefinition = "type_rapport")
    private TypeRapport type;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "format", nullable = false, columnDefinition = "format_rapport")
    private FormatRapport format;

    @Column(name = "chemin_stockage", nullable = false, columnDefinition = "text")
    private String cheminStockage;

    @Column(name = "version", nullable = false, length = 20)
    private String version = "1.0";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "genere_par")
    private Utilisateur generePar;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected Rapport() {
        // JPA
    }

    public Rapport(Audit audit, TypeRapport type, FormatRapport format, String cheminStockage) {
        this.audit = audit;
        this.type = type;
        this.format = format;
        this.cheminStockage = cheminStockage;
    }

    public UUID getId() {
        return id;
    }

    public Audit getAudit() {
        return audit;
    }

    public TypeRapport getType() {
        return type;
    }

    public FormatRapport getFormat() {
        return format;
    }

    public String getCheminStockage() {
        return cheminStockage;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public Utilisateur getGenerePar() {
        return generePar;
    }

    public void setGenerePar(Utilisateur generePar) {
        this.generePar = generePar;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Rapport other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
