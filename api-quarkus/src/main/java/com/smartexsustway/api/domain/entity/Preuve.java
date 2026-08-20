package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.TypePreuve;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Correspond à la table {@code preuve}.
 * RG15 : "une évaluation peut être associée à plusieurs preuves ; un
 * document peut servir à plusieurs critères" — d'où la relation
 * many-to-many vers AuditCritere (table de jonction {@code preuve_critere},
 * sans colonne propre : simple association, pas besoin d'entité dédiée).
 */
@Entity
@Table(name = "preuve")
public class Preuve {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "audit_id", nullable = false)
    private Audit audit;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "type", nullable = false, columnDefinition = "type_preuve")
    private TypePreuve type = TypePreuve.PIECE;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "preuve_critere",
            joinColumns = @JoinColumn(name = "preuve_id"),
            inverseJoinColumns = @JoinColumn(name = "audit_critere_id")
    )
    private Set<AuditCritere> auditCriteres = new HashSet<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected Preuve() {
        // JPA
    }

    public Preuve(Document document, Audit audit) {
        this.document = document;
        this.audit = audit;
    }

    public UUID getId() {
        return id;
    }

    public Document getDocument() {
        return document;
    }

    public Audit getAudit() {
        return audit;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public TypePreuve getType() {
        return type;
    }

    public void setType(TypePreuve type) {
        this.type = type;
    }

    public Set<AuditCritere> getAuditCriteres() {
        return auditCriteres;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Preuve other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
