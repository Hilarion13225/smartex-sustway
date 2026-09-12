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
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Une action d'un plan de mission, répondant à un ou plusieurs axes.
 *
 * <p>Distincte d'{@link ActionCorrective}, qui répond à une non-conformité
 * constatée. Les deux ne sont pas interchangeables : {@code ActionCorrective}
 * exige un {@code non_conforme_id}, et y loger une action issue d'un axe
 * obligerait à fabriquer une non-conformité fictive — donc à transformer
 * une proposition d'amélioration en constat d'écart.
 *
 * <p>La relation vers les axes est <strong>N-N</strong>. Une action unique
 * — « formaliser et diffuser la politique RSE » — en couvre couramment
 * trois ; un {@code axe_id} posé ici obligerait à dupliquer l'action, et
 * chaque copie porterait alors son propre responsable et sa propre
 * échéance sans que rien ne dise qu'il s'agit du même travail.
 *
 * <p>Les deux énumérations sont celles d'{@code action_corrective}. En
 * créer de nouvelles donnerait deux vocabulaires pour le même concept, et
 * obligerait l'interface à traduire selon la provenance de l'action.
 */
@Entity
@Table(name = "action_plan")
public class ActionPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_action_id", nullable = false)
    private PlanAction plan;

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

    @Column(name = "ordre", nullable = false)
    private int ordre;

    /**
     * Les axes traités par cette action.
     *
     * <p>La clé primaire composite de {@code action_axe} porte
     * l'idempotence : rattacher deux fois le même axe est structurellement
     * impossible, sans qu'aucun code n'ait à le vérifier.
     */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "action_axe",
            joinColumns = @JoinColumn(name = "action_plan_id"),
            inverseJoinColumns = @JoinColumn(name = "axe_amelioration_id"))
    private Set<AxeAmelioration> axes = new LinkedHashSet<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime creeLe;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime modifieLe;

    protected ActionPlan() {
        // JPA
    }

    public ActionPlan(PlanAction plan, String titre, int ordre) {
        this.plan = plan;
        this.titre = titre;
        this.ordre = ordre;
    }

    /** Ajoute un axe traité. Un ajout répété est sans effet. */
    public void rattacher(AxeAmelioration axe) {
        this.axes.add(axe);
    }

    public UUID getId() {
        return id;
    }

    public PlanAction getPlan() {
        return plan;
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

    public int getOrdre() {
        return ordre;
    }

    public Set<AxeAmelioration> getAxes() {
        return axes;
    }

    public OffsetDateTime getCreeLe() {
        return creeLe;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ActionPlan other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
