package com.smartexsustway.api.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.Objects;
import java.util.UUID;

/** Correspond à la table {@code pays}. RG01 : un pays est identifié de manière unique. */
@Entity
@Table(name = "pays")
public class Pays {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "nom", nullable = false, length = 150)
    private String nom;

    @Column(name = "code_iso_alpha2", nullable = false, unique = true, length = 2)
    private String codeIsoAlpha2;

    @Column(name = "code_iso_alpha3", nullable = false, unique = true, length = 3)
    private String codeIsoAlpha3;

    @Column(name = "code_numerique", nullable = false, unique = true, length = 3)
    private String codeNumerique;

    protected Pays() {
        // JPA
    }

    public Pays(String nom, String codeIsoAlpha2, String codeIsoAlpha3, String codeNumerique) {
        this.nom = nom;
        this.codeIsoAlpha2 = codeIsoAlpha2;
        this.codeIsoAlpha3 = codeIsoAlpha3;
        this.codeNumerique = codeNumerique;
    }

    public UUID getId() {
        return id;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getCodeIsoAlpha2() {
        return codeIsoAlpha2;
    }

    public String getCodeIsoAlpha3() {
        return codeIsoAlpha3;
    }

    public String getCodeNumerique() {
        return codeNumerique;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Pays other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
