package com.smartexsustway.api.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.util.UUID;

/**
 * Document lu par l'IA lors d'une évaluation, avec le résumé qu'elle en a tiré.
 *
 * Le nom est conservé tel quel plutôt que rattaché à la table `document` : il
 * décrit ce que l'IA a lu au moment de l'analyse, y compris si le fichier a
 * été retiré de la mission depuis. Une trace d'audit doit rester vraie après
 * coup.
 */
@Entity
@Table(name = "evaluation_document_analyse")
public class EvaluationDocumentAnalyse {

    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "evaluation_id", nullable = false)
    private Evaluation evaluation;

    @Column(name = "nom", nullable = false, length = 500)
    private String nom;

    @Column(name = "resume", columnDefinition = "text")
    private String resume;

    @Column(name = "ordre", nullable = false)
    private int ordre;

    protected EvaluationDocumentAnalyse() {
        // JPA
    }

    public EvaluationDocumentAnalyse(Evaluation evaluation, String nom, String resume, int ordre) {
        this.evaluation = evaluation;
        this.nom = nom;
        this.resume = resume;
        this.ordre = ordre;
    }

    public UUID getId() {
        return id;
    }

    public Evaluation getEvaluation() {
        return evaluation;
    }

    public String getNom() {
        return nom;
    }

    public String getResume() {
        return resume;
    }

    public int getOrdre() {
        return ordre;
    }
}
