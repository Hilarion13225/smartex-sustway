package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.StatutAudit;
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

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Correspond à la table {@code audit} — une mission d'audit RSE.
 * RG10/RG11 : une entreprise peut faire l'objet de plusieurs audits, sur
 * un référentiel et une période donnés. RG20 : ne peut être lancée que si
 * l'abonnement de l'entreprise est actif (vérifié par AuditResource, pas
 * par l'entité — l'entité ne fait pas de logique métier transverse).
 */
@Entity
@Table(name = "audit")
public class Audit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "entreprise_id", nullable = false)
    private Entreprise entreprise;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "referentiel_id", nullable = false)
    private Referentiel referentiel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "formule_abonnement_id")
    private FormuleAbonnement formuleAbonnement;

    @Column(name = "nom", nullable = false)
    private String nom;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "date_debut", nullable = false)
    private LocalDate dateDebut;

    @Column(name = "date_fin")
    private LocalDate dateFin;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut", nullable = false, columnDefinition = "statut_audit")
    private StatutAudit statut = StatutAudit.BROUILLON;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private Utilisateur createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected Audit() {
        // JPA
    }

    public Audit(Entreprise entreprise, Referentiel referentiel, String nom, LocalDate dateDebut) {
        this.entreprise = entreprise;
        this.referentiel = referentiel;
        this.nom = nom;
        this.dateDebut = dateDebut;
    }

    public UUID getId() {
        return id;
    }

    public Entreprise getEntreprise() {
        return entreprise;
    }

    public Referentiel getReferentiel() {
        return referentiel;
    }

    public FormuleAbonnement getFormuleAbonnement() {
        return formuleAbonnement;
    }

    public void setFormuleAbonnement(FormuleAbonnement formuleAbonnement) {
        this.formuleAbonnement = formuleAbonnement;
    }

    public String getNom() {
        return nom;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDate getDateDebut() {
        return dateDebut;
    }

    public LocalDate getDateFin() {
        return dateFin;
    }

    public void setDateFin(LocalDate dateFin) {
        this.dateFin = dateFin;
    }

    public StatutAudit getStatut() {
        return statut;
    }

    public void setStatut(StatutAudit statut) {
        this.statut = statut;
    }

    public Utilisateur getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Utilisateur createdBy) {
        this.createdBy = createdBy;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Audit other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
