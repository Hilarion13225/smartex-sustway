package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.PrioriteAction;
import com.smartexsustway.api.domain.enums.StatutActionCorrective;
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
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Correspond à la table {@code action_corrective}.
 * RG18 : une non-conformité peut donner lieu à plusieurs actions
 * correctives, chacune assignable à un responsable avec une échéance.
 */
@Entity
@Table(name = "action_corrective")
public class ActionCorrective {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "non_conforme_id", nullable = false)
    private NonConforme nonConforme;

    @Column(name = "titre", nullable = false, length = 255)
    private String titre;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsable_id")
    private Utilisateur responsable;

    @Column(name = "date_echeance")
    private LocalDate dateEcheance;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut", nullable = false, columnDefinition = "statut_action_corrective")
    private StatutActionCorrective statut = StatutActionCorrective.OUVERTE;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "priorite", nullable = false, columnDefinition = "priorite_action")
    private PrioriteAction priorite = PrioriteAction.MOYENNE;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected ActionCorrective() {
        // JPA
    }

    public ActionCorrective(NonConforme nonConforme, String titre) {
        this.nonConforme = nonConforme;
        this.titre = titre;
    }

    public UUID getId() {
        return id;
    }

    public NonConforme getNonConforme() {
        return nonConforme;
    }

    public String getTitre() {
        return titre;
    }

    public void setTitre(String titre) {
        this.titre = titre;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Utilisateur getResponsable() {
        return responsable;
    }

    public void setResponsable(Utilisateur responsable) {
        this.responsable = responsable;
    }

    public LocalDate getDateEcheance() {
        return dateEcheance;
    }

    public void setDateEcheance(LocalDate dateEcheance) {
        this.dateEcheance = dateEcheance;
    }

    public StatutActionCorrective getStatut() {
        return statut;
    }

    public void setStatut(StatutActionCorrective statut) {
        this.statut = statut;
    }

    public PrioriteAction getPriorite() {
        return priorite;
    }

    public void setPriorite(PrioriteAction priorite) {
        this.priorite = priorite;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ActionCorrective other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
