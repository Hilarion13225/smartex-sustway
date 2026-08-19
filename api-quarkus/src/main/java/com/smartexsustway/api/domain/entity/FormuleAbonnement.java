package com.smartexsustway.api.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.Objects;
import java.util.UUID;

/** Correspond à la table {@code formule_abonnement}. CDC section 5 — Free / Standard / Avancées. */
@Entity
@Table(name = "formule_abonnement")
public class FormuleAbonnement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "code", nullable = false, unique = true, length = 20)
    private String code;

    @Column(name = "nom", nullable = false, length = 100)
    private String nom;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "prix_mensuel", precision = 10, scale = 2)
    private BigDecimal prixMensuel;

    @Column(name = "prix_annuel", precision = 10, scale = 2)
    private BigDecimal prixAnnuel;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    protected FormuleAbonnement() {
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

    public String getDescription() {
        return description;
    }

    public BigDecimal getPrixMensuel() {
        return prixMensuel;
    }

    public BigDecimal getPrixAnnuel() {
        return prixAnnuel;
    }

    public boolean isActive() {
        return active;
    }

    /** RG25 : la formule Free est un mode de démonstration, sans création d'entités métier possible. */
    public boolean estFree() {
        return "FREE".equals(code);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof FormuleAbonnement other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
