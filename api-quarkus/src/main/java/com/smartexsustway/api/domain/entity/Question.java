package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.TypeQuestion;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Objects;
import java.util.UUID;

/** Correspond à la table {@code question}. RG09 : plusieurs questions/indicateurs détaillés par critère. */
@Entity
@Table(name = "question")
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "critere_id", nullable = false)
    private Critere critere;

    @Column(name = "code", nullable = false, length = 30)
    private String code;

    @Column(name = "libelle", nullable = false, columnDefinition = "text")
    private String libelle;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "type", nullable = false, columnDefinition = "type_question")
    private TypeQuestion type = TypeQuestion.FERMEE;

    @Column(name = "ordre", nullable = false)
    private int ordre;

    @Column(name = "obligatoire", nullable = false)
    private boolean obligatoire = true;

    protected Question() {
        // JPA
    }

    public UUID getId() {
        return id;
    }

    public Critere getCritere() {
        return critere;
    }

    public String getCode() {
        return code;
    }

    public String getLibelle() {
        return libelle;
    }

    public TypeQuestion getType() {
        return type;
    }

    public int getOrdre() {
        return ordre;
    }

    public boolean isObligatoire() {
        return obligatoire;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Question other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
