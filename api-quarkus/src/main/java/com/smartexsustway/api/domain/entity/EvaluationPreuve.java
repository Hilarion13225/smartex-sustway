package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.CouverturePreuveAttendue;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * L'avis du pipeline sur une preuve attendue — le cœur du contrat V2.
 *
 * <p>Ce que cette table apporte et que {@link Evaluation} ne pouvait pas
 * porter : la conformité cesse d'être un chiffre global et devient
 * traçable attente par attente. Un auditeur contesté peut montrer ce qui a
 * été observé, ce qui manquait, et ce qui n'a pas pu être vérifié.
 *
 * <p><strong>{@code couverture} est une énumération à quatre valeurs, pas
 * un booléen.</strong> {@code evaluation.couverturePreuve} est conservé
 * pour la compatibilité V1 mais cesse d'être la source de vérité :
 * {@code NON_VERIFIABLE} (« on n'a pas pu regarder ») et
 * {@code INSUFFISANTE} (« on a regardé ») ne disent pas la même chose.
 */
@Entity
@Table(name = "evaluation_preuve")
public class EvaluationPreuve {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "evaluation_id", nullable = false)
    private Evaluation evaluation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "preuve_attendue_id", nullable = false)
    private PreuveAttendue preuveAttendue;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "couverture", nullable = false, columnDefinition = "couverture_preuve_attendue")
    private CouverturePreuveAttendue couverture;

    /**
     * Contradiction entre deux pièces sur cette attente. Nul le plus
     * souvent — et c'est sa présence, non son contenu, qui se cherche :
     * « quelles attentes portent un conflit sur cette mission ? ». Le
     * fondre dans la justification rendrait la question inatteignable.
     */
    @Column(name = "conflit", columnDefinition = "text")
    private String conflit;

    @Column(name = "justification", columnDefinition = "text")
    private String justification;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "elements_observes", columnDefinition = "jsonb")
    private List<String> elementsObserves;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "elements_manquants", columnDefinition = "jsonb")
    private List<String> elementsManquants;

    /**
     * Jamais fusionnée avec {@link #elementsManquants}. Un élément non
     * vérifiable n'est pas un élément manquant, et la fusion serait
     * irréversible.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "elements_non_verifiables", columnDefinition = "jsonb")
    private List<String> elementsNonVerifiables;

    /**
     * Références locales des pièces ayant servi. Reste en JSON parce que le
     * lien pièce → attente est porté relationnellement par
     * {@link AnalyseDocumentConstat}, qui le fait mieux.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "pieces_utilisees", columnDefinition = "jsonb")
    private List<String> piecesUtilisees;

    @Column(name = "ordre", nullable = false)
    private int ordre;

    protected EvaluationPreuve() {
        // JPA
    }

    public EvaluationPreuve(Evaluation evaluation, PreuveAttendue preuveAttendue,
                            CouverturePreuveAttendue couverture, int ordre) {
        this.evaluation = evaluation;
        this.preuveAttendue = preuveAttendue;
        this.couverture = couverture;
        this.ordre = ordre;
    }

    public UUID getId() {
        return id;
    }

    public Evaluation getEvaluation() {
        return evaluation;
    }

    public PreuveAttendue getPreuveAttendue() {
        return preuveAttendue;
    }

    public CouverturePreuveAttendue getCouverture() {
        return couverture;
    }

    public String getConflit() {
        return conflit;
    }

    public void setConflit(String conflit) {
        this.conflit = conflit;
    }

    public String getJustification() {
        return justification;
    }

    public void setJustification(String justification) {
        this.justification = justification;
    }

    public List<String> getElementsObserves() {
        return elementsObserves;
    }

    public void setElementsObserves(List<String> elementsObserves) {
        this.elementsObserves = elementsObserves;
    }

    public List<String> getElementsManquants() {
        return elementsManquants;
    }

    public void setElementsManquants(List<String> elementsManquants) {
        this.elementsManquants = elementsManquants;
    }

    public List<String> getElementsNonVerifiables() {
        return elementsNonVerifiables;
    }

    public void setElementsNonVerifiables(List<String> elementsNonVerifiables) {
        this.elementsNonVerifiables = elementsNonVerifiables;
    }

    public List<String> getPiecesUtilisees() {
        return piecesUtilisees;
    }

    public void setPiecesUtilisees(List<String> piecesUtilisees) {
        this.piecesUtilisees = piecesUtilisees;
    }

    public int getOrdre() {
        return ordre;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof EvaluationPreuve other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
