package com.smartexsustway.api.domain.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Campagne d'audit portant sur plusieurs organisations, sur un même
 * référentiel et une même période.
 *
 * Le projet ne remplace pas les missions : il en crée une par organisation
 * et garde le lien, de sorte que chaque organisation conserve sa mission,
 * ses preuves et son score, et que la comparaison porte sur des évaluations
 * réellement indépendantes.
 */
@Entity
@Table(name = "projet")
public class Projet {

    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "nom", nullable = false, length = 200)
    private String nom;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "referentiel_id", nullable = false)
    private Referentiel referentiel;

    @Column(name = "date_debut", nullable = false)
    private LocalDate dateDebut;

    @Column(name = "date_fin")
    private LocalDate dateFin;

    @Column(name = "statut", nullable = false, length = 20)
    private String statut = "EN_COURS";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cree_par_id")
    private Utilisateur creePar;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected Projet() {
        // JPA
    }

    public Projet(String nom, Referentiel referentiel, LocalDate dateDebut) {
        this.nom = nom;
        this.referentiel = referentiel;
        this.dateDebut = dateDebut;
    }

    public UUID getId() { return id; }
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Referentiel getReferentiel() { return referentiel; }
    public LocalDate getDateDebut() { return dateDebut; }
    public LocalDate getDateFin() { return dateFin; }
    public void setDateFin(LocalDate dateFin) { this.dateFin = dateFin; }
    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }
    public Utilisateur getCreePar() { return creePar; }
    public void setCreePar(Utilisateur creePar) { this.creePar = creePar; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
