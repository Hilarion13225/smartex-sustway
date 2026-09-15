package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.OrigineAxe;
import com.smartexsustway.api.domain.enums.StatutPlan;
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
 * Un plan de pilotage, rattaché à la mission et non à un axe.
 *
 * <p>Le suspendre à un axe donnerait autant de plans que d'axes, alors que
 * la réalité est inverse : un plan regroupe plusieurs axes, et une même
 * action en traite souvent plusieurs à la fois.
 */
@Entity
@Table(name = "plan_action")
public class PlanAction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "audit_id", nullable = false)
    private Audit audit;

    @Column(name = "titre", nullable = false, length = 255)
    private String titre;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut", nullable = false, columnDefinition = "statut_plan")
    private StatutPlan statut = StatutPlan.BROUILLON;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsable_id")
    private Utilisateur responsable;

    @Column(name = "date_echeance")
    private LocalDate dateEcheance;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "origine", nullable = false, columnDefinition = "origine_axe")
    private OrigineAxe origine = OrigineAxe.HUMAIN;

    /**
     * Pourquoi le plan a été gelé, et par qui.
     *
     * <p>Le motif est exigé par la base à la clôture
     * ({@code plan_cloture_motivee}) : un plan clôturé sans motif lisible ne
     * se relit pas six mois plus tard. Les trois champs servent aux deux
     * gestes de gel — clôture et archivage.
     */
    @Column(name = "motif_cloture", columnDefinition = "text")
    private String motifCloture;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cloture_par")
    private Utilisateur cloturePar;

    @Column(name = "cloture_le")
    private OffsetDateTime clotureLe;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private Utilisateur creePar;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime creeLe;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime modifieLe;

    protected PlanAction() {
        // JPA
    }

    public PlanAction(Audit audit, String titre) {
        this.audit = audit;
        this.titre = titre;
    }

    public UUID getId() {
        return id;
    }

    public Audit getAudit() {
        return audit;
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

    public StatutPlan getStatut() {
        return statut;
    }

    public void setStatut(StatutPlan statut) {
        this.statut = statut;
    }

    /** Vrai lorsque le plan ne peut plus être modifié (D25). */
    public boolean estGele() {
        return statut.estGele();
    }

    /**
     * Le plan est arrivé à son terme.
     *
     * <p>Statut, décideur, date et motif sont posés ensemble : la base refuse
     * un plan {@code CLOTURE} sans motif, et un gel dont personne ne
     * répondrait ne se relirait pas.
     */
    public void cloturer(Utilisateur decideur, String motif) {
        this.statut = StatutPlan.CLOTURE;
        this.cloturePar = decideur;
        this.clotureLe = OffsetDateTime.now();
        this.motifCloture = motif;
    }

    /**
     * Le plan est retiré sans avoir été mené à terme.
     *
     * <p>Remplace la suppression, qui emporterait les actions par CASCADE et
     * effacerait la trace du travail engagé. Le motif reste facultatif ici :
     * c'est la clôture qui engage, l'archivage qui range.
     */
    public void archiver(Utilisateur decideur, String motif) {
        this.statut = StatutPlan.ARCHIVE;
        this.cloturePar = decideur;
        this.clotureLe = OffsetDateTime.now();
        this.motifCloture = motif;
    }

    public String getMotifCloture() {
        return motifCloture;
    }

    public Utilisateur getCloturePar() {
        return cloturePar;
    }

    public OffsetDateTime getClotureLe() {
        return clotureLe;
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

    public OrigineAxe getOrigine() {
        return origine;
    }

    public Utilisateur getCreePar() {
        return creePar;
    }

    public void setCreePar(Utilisateur creePar) {
        this.creePar = creePar;
    }

    public OffsetDateTime getCreeLe() {
        return creeLe;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof PlanAction other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
