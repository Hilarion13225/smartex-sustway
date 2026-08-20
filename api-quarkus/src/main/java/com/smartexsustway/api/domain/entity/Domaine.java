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

import java.util.Objects;
import java.util.UUID;

/** Correspond à la table {@code domaine}. RG08 : se décompose en plusieurs critères. */
@Entity
@Table(name = "domaine")
public class Domaine {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "referentiel_id", nullable = false)
    private Referentiel referentiel;

    @Column(name = "code", nullable = false, length = 30)
    private String code;

    @Column(name = "nom", nullable = false, length = 200)
    private String nom;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "ordre", nullable = false)
    private int ordre;

    protected Domaine() {
        // JPA
    }

    public UUID getId() {
        return id;
    }

    public Referentiel getReferentiel() {
        return referentiel;
    }

    public String getCode() {
        return code;
    }

    public String getNom() {
        return nom;
    }

    public String getDescription() {
        return description;
    }

    public int getOrdre() {
        return ordre;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Domaine other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
