package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.StatutRevueExperte;
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
 * Correspond a la table revue_experte.
 * RG22/RG38 : file de revue experte creee automatiquement si la confiance
 * IA est inferieure au seuil (0,80) - formule Avancees uniquement (voir
 * EvaluationResource, seule creation possible pour cette entite dans ce
 * lot ; l'ecran de traitement de la revue elle-meme est un lot ulterieur).
 */
@Entity
@Table(name = "revue_experte")
public class RevueExperte {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "evaluation_id", nullable = false)
    private Evaluation evaluation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expert_id")
    private Utilisateur expert;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut", nullable = false, columnDefinition = "statut_revue_experte")
    private StatutRevueExperte statut = StatutRevueExperte.EN_ATTENTE;

    @Column(name = "commentaire", columnDefinition = "text")
    private String commentaire;

    @Column(name = "probabilite_initiale", precision = 5, scale = 4)
    private BigDecimal probabiliteInitiale;

    @Column(name = "probabilite_finale", precision = 5, scale = 4)
    private BigDecimal probabiliteFinale;

    @Column(name = "note_initiale")
    private Short noteInitiale;

    @Column(name = "note_finale")
    private Short noteFinale;

    @CreationTimestamp
    @Column(name = "date_attribution", nullable = false, updatable = false)
    private OffsetDateTime dateAttribution;

    @Column(name = "date_completion")
    private OffsetDateTime dateCompletion;

    protected RevueExperte() {
        // JPA
    }

    public RevueExperte(Evaluation evaluation, BigDecimal probabiliteInitiale, Short noteInitiale) {
        this.evaluation = evaluation;
        this.probabiliteInitiale = probabiliteInitiale;
        this.noteInitiale = noteInitiale;
    }

    public UUID getId() {
        return id;
    }

    public Evaluation getEvaluation() {
        return evaluation;
    }

    public Utilisateur getExpert() {
        return expert;
    }

    public void setExpert(Utilisateur expert) {
        this.expert = expert;
    }

    public StatutRevueExperte getStatut() {
        return statut;
    }

    public void setStatut(StatutRevueExperte statut) {
        this.statut = statut;
    }

    public String getCommentaire() {
        return commentaire;
    }

    public void setCommentaire(String commentaire) {
        this.commentaire = commentaire;
    }

    public BigDecimal getProbabiliteInitiale() {
        return probabiliteInitiale;
    }

    public BigDecimal getProbabiliteFinale() {
        return probabiliteFinale;
    }

    public void setProbabiliteFinale(BigDecimal probabiliteFinale) {
        this.probabiliteFinale = probabiliteFinale;
    }

    public Short getNoteInitiale() {
        return noteInitiale;
    }

    public Short getNoteFinale() {
        return noteFinale;
    }

    public void setNoteFinale(Short noteFinale) {
        this.noteFinale = noteFinale;
    }

    public OffsetDateTime getDateAttribution() {
        return dateAttribution;
    }

    public OffsetDateTime getDateCompletion() {
        return dateCompletion;
    }

    public void setDateCompletion(OffsetDateTime dateCompletion) {
        this.dateCompletion = dateCompletion;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof RevueExperte other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
