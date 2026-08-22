package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.ValeurReponse;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Correspond à la table {@code reponse_question} — RG09 : réponse déclarative
 * de l'entreprise cliente à une question du questionnaire figé dans la
 * mission. Une réponse au plus par {@link AuditQuestion} : la saisie est
 * révisable, l'historique d'évaluation restant porté par {@link Evaluation}.
 */
@Entity
@Table(name = "reponse_question")
public class ReponseQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "audit_question_id", nullable = false, unique = true)
    private AuditQuestion auditQuestion;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "valeur", columnDefinition = "valeur_reponse")
    private ValeurReponse valeur;

    @Column(name = "commentaire", columnDefinition = "text")
    private String commentaire;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "auteur_id")
    private Utilisateur auteur;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected ReponseQuestion() {
        // JPA
    }

    public ReponseQuestion(AuditQuestion auditQuestion) {
        this.auditQuestion = auditQuestion;
    }

    public UUID getId() {
        return id;
    }

    public AuditQuestion getAuditQuestion() {
        return auditQuestion;
    }

    public ValeurReponse getValeur() {
        return valeur;
    }

    public void setValeur(ValeurReponse valeur) {
        this.valeur = valeur;
    }

    public String getCommentaire() {
        return commentaire;
    }

    public void setCommentaire(String commentaire) {
        this.commentaire = commentaire;
    }

    public Utilisateur getAuteur() {
        return auteur;
    }

    public void setAuteur(Utilisateur auteur) {
        this.auteur = auteur;
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
        if (!(o instanceof ReponseQuestion other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
