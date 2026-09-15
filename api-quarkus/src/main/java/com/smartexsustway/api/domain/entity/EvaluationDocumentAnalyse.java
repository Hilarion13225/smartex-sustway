package com.smartexsustway.api.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Document lu par l'IA lors d'une évaluation, avec le résumé qu'elle en a tiré.
 *
 * Le nom est conservé tel quel : il décrit ce que l'IA a lu au moment de
 * l'analyse, y compris si le fichier a été renommé depuis. Une trace d'audit
 * doit rester vraie après coup.
 *
 * <p>Mais le nom seul ne suffisait pas à <em>identifier</em> le fichier :
 * deux documents de même nom sur une même mission étaient indiscernables, et
 * un renommage rompait le lien. {@link #document} rétablit l'identité, sans
 * remplacer le nom historique. Le hash n'est pas recopié — il est atteignable
 * par la relation, et le dupliquer créerait deux sources de vérité pouvant
 * diverger ; un hash qui diverge de son fichier inspire une confiance
 * injustifiée.
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

    /**
     * Le document réellement analysé. Nul sur les lignes antérieures à V2 :
     * le rattachement rétroactif par nom n'est pas fiable.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id")
    private Document document;

    /**
     * Référence locale de la pièce dans le payload soumis aux agents
     * ({@code p1}, {@code p2}…). Ce n'est pas une clé : elle n'a de sens
     * qu'à l'intérieur d'une passe, et sert à corréler cette analyse avec
     * la ligne d'{@link ExecutionAgent} correspondante — le Document Agent
     * effectuant un appel par pièce.
     */
    @Column(name = "piece_reference", length = 16)
    private String pieceReference;

    @Column(name = "confiance_lecture", precision = 5, scale = 4)
    private BigDecimal confianceLecture;

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

    public Document getDocument() {
        return document;
    }

    public void setDocument(Document document) {
        this.document = document;
    }

    public String getPieceReference() {
        return pieceReference;
    }

    public void setPieceReference(String pieceReference) {
        this.pieceReference = pieceReference;
    }

    public BigDecimal getConfianceLecture() {
        return confianceLecture;
    }

    public void setConfianceLecture(BigDecimal confianceLecture) {
        this.confianceLecture = confianceLecture;
    }
}
