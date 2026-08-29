package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.StatutAbonnement;
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
 * Correspond à la table {@code abonnement}.
 * RG24 : une entreprise ne peut être créée sans formule d'abonnement valide
 * — en pratique, Entreprise et Abonnement sont créés ensemble, dans la même
 * transaction (voir EntrepriseResource.creer), puisque abonnement.entreprise_id
 * est une FK obligatoire (on ne peut pas créer l'abonnement avant l'entreprise).
 * RG20 : une entreprise ne peut lancer un audit que si son abonnement est actif.
 */
@Entity
@Table(name = "abonnement")
public class Abonnement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "entreprise_id", nullable = false)
    private Entreprise entreprise;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "formule_id", nullable = false)
    private FormuleAbonnement formule;

    @Column(name = "date_debut", nullable = false)
    private LocalDate dateDebut;

    @Column(name = "date_fin")
    private LocalDate dateFin;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut", nullable = false, columnDefinition = "statut_abonnement")
    private StatutAbonnement statut = StatutAbonnement.EN_ATTENTE_PAIEMENT;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected Abonnement() {
        // JPA
    }

    public Abonnement(Entreprise entreprise, FormuleAbonnement formule, LocalDate dateDebut) {
        this.entreprise = entreprise;
        this.formule = formule;
        this.dateDebut = dateDebut;
    }

    public UUID getId() {
        return id;
    }

    public Entreprise getEntreprise() {
        return entreprise;
    }

    public FormuleAbonnement getFormule() {
        return formule;
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

    public StatutAbonnement getStatut() {
        return statut;
    }

    public void setStatut(StatutAbonnement statut) {
        this.statut = statut;
    }

    /** RG20 : un audit ne peut être lancé que si l'abonnement est actif. */
    public boolean estActif() {
        return statut == StatutAbonnement.ACTIF;
    }

    /**
     * Active l'abonnement suite à un paiement réussi, et calcule la date de
     * fin de période. Formule à prix unique, sans choix de périodicité : la
     * période de facturation est mensuelle par défaut (les prix des formules
     * restent historiquement des montants mensuels).
     */
    public void activerSuitePaiement() {
        this.statut = StatutAbonnement.ACTIF;
        this.dateFin = dateDebut.plusMonths(1);
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Abonnement other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
