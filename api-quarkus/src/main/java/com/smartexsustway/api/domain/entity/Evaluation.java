package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.SourceEvaluation;
import com.smartexsustway.api.domain.enums.StatutEvaluation;
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

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Correspond à la table {@code evaluation}.
 * RG14 : historique complet (probabilité, note dérivée, justification,
 * auteur, date, version référentiel). RG27 : la note n'est JAMAIS saisie
 * directement par l'IA — {@code note} est toujours calculée côté Quarkus
 * via ScoringEngine.noteObtenue(...), à partir de la probabilité renvoyée
 * par le pipeline Python (voir EvaluationResource). RG38 : {@code confianceIa}
 * inférieure au seuil (0,80) déclenche une revue experte (formule Avancées).
 */
@Entity
@Table(name = "evaluation")
public class Evaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "audit_critere_id", nullable = false)
    private AuditCritere auditCritere;

    @Column(name = "probabilite_conforme", nullable = false, precision = 5, scale = 4)
    private BigDecimal probabiliteConforme;

    @Column(name = "note", nullable = false)
    private short note;

    @Column(name = "confiance_ia", precision = 5, scale = 4)
    private BigDecimal confianceIa;

    @Column(name = "justification", columnDefinition = "text")
    private String justification;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "source", nullable = false, columnDefinition = "source_evaluation")
    private SourceEvaluation source = SourceEvaluation.IA;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "auteur_id")
    private Utilisateur auteur;

    @CreationTimestamp
    @Column(name = "date_evaluation", nullable = false, updatable = false)
    private OffsetDateTime dateEvaluation;

    @Column(name = "version_referentiel", length = 20)
    private String versionReferentiel;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut", nullable = false, columnDefinition = "statut_evaluation")
    private StatutEvaluation statut = StatutEvaluation.PROVISOIRE;

    // Risk Agent (CDC §10, formule Avancées) : signal d'anomalie détecté
    // dans le contenu des preuves. Distinct du risque attendu déterministe
    // (RG26, calculé côté ScoringEngine à partir de la criticité) — ce
    // champ ne participe à aucun calcul de score ni de priorité, il sert
    // uniquement de signal informatif pour l'expert et le Recommendation
    // Agent. Null si le pipeline n'a pas exécuté le Risk Agent (formule
    // Standard).
    @Column(name = "signal_risque")
    private Boolean signalRisque;

    @Column(name = "categorie_risque", length = 50)
    private String categorieRisque;

    @Column(name = "justification_risque", columnDefinition = "text")
    private String justificationRisque;

    // Recommendation Agent (CDC §10, formule Avancées) : pistes
    // d'amélioration concrètes proposées pour ce critère. Portée limitée
    // à ce lot (Phase E) — la génération automatique de non-conformités
    // et d'actions correctives (module 11) est prévue en Phase G et
    // s'appuiera sur les tables non_conforme/action_corrective, déjà en
    // base mais non encore alimentées. Null si le Recommendation Agent
    // n'a pas été exécuté (formule Standard).
    @Column(name = "recommandation_necessaire")
    private Boolean recommandationNecessaire;

    @Column(name = "pistes_amelioration", columnDefinition = "text")
    private String pistesAmelioration;

    protected Evaluation() {
        // JPA
    }

    public Evaluation(AuditCritere auditCritere, BigDecimal probabiliteConforme, short note) {
        this.auditCritere = auditCritere;
        this.probabiliteConforme = probabiliteConforme;
        this.note = note;
    }

    public UUID getId() {
        return id;
    }

    public AuditCritere getAuditCritere() {
        return auditCritere;
    }

    public BigDecimal getProbabiliteConforme() {
        return probabiliteConforme;
    }

    /**
     * Réservé à la correction par un expert humain lors d'une revue
     * (RevueExperteResource) — RG27 interdit à l'IA de fixer directement
     * ce champ, pas à un expert qui, lui, produit une décision humaine
     * documentée (voir RevueExperte.commentaire). Après appel, evaluation
     * redevient la source de vérité unique pour tout calcul de score en
     * aval, alignée sur la décision finale de l'expert.
     */
    public void setProbabiliteConforme(BigDecimal probabiliteConforme) {
        this.probabiliteConforme = probabiliteConforme;
    }

    public short getNote() {
        return note;
    }

    /** Voir {@link #setProbabiliteConforme(BigDecimal)} — même justification, réservé à la revue experte. */
    public void setNote(short note) {
        this.note = note;
    }

    public BigDecimal getConfianceIa() {
        return confianceIa;
    }

    public void setConfianceIa(BigDecimal confianceIa) {
        this.confianceIa = confianceIa;
    }

    public String getJustification() {
        return justification;
    }

    public void setJustification(String justification) {
        this.justification = justification;
    }

    public SourceEvaluation getSource() {
        return source;
    }

    public void setSource(SourceEvaluation source) {
        this.source = source;
    }

    public Utilisateur getAuteur() {
        return auteur;
    }

    public void setAuteur(Utilisateur auteur) {
        this.auteur = auteur;
    }

    public OffsetDateTime getDateEvaluation() {
        return dateEvaluation;
    }

    public String getVersionReferentiel() {
        return versionReferentiel;
    }

    public void setVersionReferentiel(String versionReferentiel) {
        this.versionReferentiel = versionReferentiel;
    }

    public StatutEvaluation getStatut() {
        return statut;
    }

    public void setStatut(StatutEvaluation statut) {
        this.statut = statut;
    }

    public Boolean getSignalRisque() {
        return signalRisque;
    }

    public void setSignalRisque(Boolean signalRisque) {
        this.signalRisque = signalRisque;
    }

    public String getCategorieRisque() {
        return categorieRisque;
    }

    public void setCategorieRisque(String categorieRisque) {
        this.categorieRisque = categorieRisque;
    }

    public String getJustificationRisque() {
        return justificationRisque;
    }

    public void setJustificationRisque(String justificationRisque) {
        this.justificationRisque = justificationRisque;
    }

    public Boolean getRecommandationNecessaire() {
        return recommandationNecessaire;
    }

    public void setRecommandationNecessaire(Boolean recommandationNecessaire) {
        this.recommandationNecessaire = recommandationNecessaire;
    }

    public String getPistesAmelioration() {
        return pistesAmelioration;
    }

    public void setPistesAmelioration(String pistesAmelioration) {
        this.pistesAmelioration = pistesAmelioration;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Evaluation other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
