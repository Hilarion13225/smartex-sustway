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

import java.util.Objects;
import java.util.UUID;

/** Correspond à la table {@code audit_question} — snapshot des questions d'un critère pour cette mission. */
@Entity
@Table(name = "audit_question")
public class AuditQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "audit_critere_id", nullable = false)
    private AuditCritere auditCritere;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(name = "statut", nullable = false, length = 30)
    private String statut = "A_REPONDRE";

    protected AuditQuestion() {
        // JPA
    }

    public AuditQuestion(AuditCritere auditCritere, Question question) {
        this.auditCritere = auditCritere;
        this.question = question;
    }

    public UUID getId() {
        return id;
    }

    public AuditCritere getAuditCritere() {
        return auditCritere;
    }

    public Question getQuestion() {
        return question;
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
        if (!(o instanceof AuditQuestion other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
