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

import java.math.BigDecimal;
import java.util.Objects;
import java.util.UUID;

/**
 * Correspond à la table {@code audit_critere}.
 * RG35 : le score est recalculé sur les seuls critères actifs/applicables
 * de CET audit — {@code actif}/{@code applicable} sont donc dupliqués ici
 * (snapshot au moment de la composition du questionnaire, voir
 * QuestionnaireService) plutôt que relus depuis {@code critere} à chaque
 * calcul : un audit en cours ne doit pas changer de périmètre si le
 * référentiel évolue entre-temps (versioning implicite de la mission).
 * Idem pour {@code criticite} et {@code coefficientPonderation} : valeurs
 * gelées à la création de l'audit.
 */
@Entity
@Table(name = "audit_critere")
public class AuditCritere {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "audit_id", nullable = false)
    private Audit audit;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "critere_id", nullable = false)
    private Critere critere;

    @Column(name = "actif", nullable = false)
    private boolean actif = true;

    @Column(name = "applicable", nullable = false)
    private boolean applicable = true;

    @Column(name = "coefficient_ponderation", nullable = false, precision = 3, scale = 1)
    private BigDecimal coefficientPonderation = BigDecimal.ONE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "criticite_id")
    private Criticite criticite;

    @Column(name = "statut", nullable = false, length = 30)
    private String statut = "A_EVALUER";

    protected AuditCritere() {
        // JPA
    }

    public AuditCritere(Audit audit, Critere critere) {
        this.audit = audit;
        this.critere = critere;
        this.criticite = critere.getCriticite();
    }

    /**
     * RG37 — variante utilisée quand la criticité effective a déjà été
     * résolue en amont (voir QuestionnaireService.criticiteEffective),
     * qui peut différer de {@code critere.getCriticite()} si une
     * surcharge sectorielle existe pour le secteur de l'entreprise
     * auditée. Le constructeur à deux arguments reste disponible pour les
     * appelants qui n'ont pas besoin de cette résolution (ex. tests).
     */
    public AuditCritere(Audit audit, Critere critere, Criticite criticiteEffective) {
        this.audit = audit;
        this.critere = critere;
        this.criticite = criticiteEffective;
    }

    public UUID getId() {
        return id;
    }

    public Audit getAudit() {
        return audit;
    }

    public Critere getCritere() {
        return critere;
    }

    public boolean isActif() {
        return actif;
    }

    public void setActif(boolean actif) {
        this.actif = actif;
    }

    public boolean isApplicable() {
        return applicable;
    }

    public void setApplicable(boolean applicable) {
        this.applicable = applicable;
    }

    public BigDecimal getCoefficientPonderation() {
        return coefficientPonderation;
    }

    public void setCoefficientPonderation(BigDecimal coefficientPonderation) {
        this.coefficientPonderation = coefficientPonderation;
    }

    public Criticite getCriticite() {
        return criticite;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AuditCritere other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
