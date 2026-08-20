package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.TypeApplicabilite;
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

/**
 * Correspond à la table {@code critere}.
 * RG09 : peut posséder plusieurs questions. RG34/RG39 : applicabilité
 * générale/sectorielle/bailleur, qui détermine sa présence dans le
 * questionnaire composé dynamiquement (voir QuestionnaireService).
 */
@Entity
@Table(name = "critere")
public class Critere {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "domaine_id", nullable = false)
    private Domaine domaine;

    @Column(name = "code", nullable = false, length = 30)
    private String code;

    @Column(name = "libelle", nullable = false, length = 500)
    private String libelle;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "applicabilite", nullable = false, columnDefinition = "type_applicabilite")
    private TypeApplicabilite applicabilite = TypeApplicabilite.GENERALE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "criticite_id")
    private Criticite criticite;

    @Column(name = "actif", nullable = false)
    private boolean actif = true;

    protected Critere() {
        // JPA
    }

    public UUID getId() {
        return id;
    }

    public Domaine getDomaine() {
        return domaine;
    }

    public String getCode() {
        return code;
    }

    public String getLibelle() {
        return libelle;
    }

    public String getDescription() {
        return description;
    }

    public TypeApplicabilite getApplicabilite() {
        return applicabilite;
    }

    public Criticite getCriticite() {
        return criticite;
    }

    public boolean isActif() {
        return actif;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Critere other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
