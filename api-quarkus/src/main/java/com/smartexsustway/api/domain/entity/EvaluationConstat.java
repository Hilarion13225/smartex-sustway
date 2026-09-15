package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.NatureConstat;
import com.smartexsustway.api.domain.enums.NiveauRattachement;
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
 * Une remarque rattachée à un élément précis du référentiel.
 *
 * <p>Deux natures partagent cette table — le signal du Risk Agent et
 * l'élément manquant relevé par l'agent de conformité — parce qu'elles ont
 * exactement la même forme : un rattachement et une justification. Les
 * séparer aurait produit deux tables identiques pour une différence qui
 * tient dans une valeur d'énumération. Le discriminant permet de les
 * scinder plus tard sans migration ambiguë si elles divergent.
 *
 * <p><strong>Un signal de risque IA n'est jamais le risque déterministe
 * RG26.</strong> Ce dernier reste dans {@code risque_evaluation}, où il est
 * le produit d'une multiplication reproductible. Y écrire un jugement de
 * modèle rendrait le risque attendu non recalculable et confondrait deux
 * natures d'information.
 *
 * <p>Exactement une cible est renseignée, cohérente avec le niveau déclaré
 * — imposé en base par la contrainte {@code evaluation_constat_cible_coherente}.
 */
@Entity
@Table(name = "evaluation_constat")
public class EvaluationConstat {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "evaluation_id", nullable = false)
    private Evaluation evaluation;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "nature", nullable = false, columnDefinition = "nature_constat")
    private NatureConstat nature;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "niveau_rattachement", nullable = false, columnDefinition = "niveau_rattachement")
    private NiveauRattachement niveauRattachement;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exigence_id")
    private Exigence exigence;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "preuve_attendue_id")
    private PreuveAttendue preuveAttendue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "regle_analyse_id")
    private RegleAnalyse regleAnalyse;

    /** Catégorie de risque. Nulle pour un élément manquant, qui n'en a pas. */
    @Column(name = "categorie", length = 40)
    private String categorie;

    @Column(name = "justification", columnDefinition = "text")
    private String justification;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "pieces_concernees", columnDefinition = "jsonb")
    private List<String> piecesConcernees;

    @Column(name = "ordre", nullable = false)
    private int ordre;

    protected EvaluationConstat() {
        // JPA
    }

    /**
     * Rattaché à une exigence. Les trois fabriques nommées évitent de
     * construire une ligne incohérente : le niveau et la cible sont posés
     * ensemble, jamais séparément.
     */
    public static EvaluationConstat surExigence(Evaluation evaluation, NatureConstat nature,
                                                Exigence exigence, int ordre) {
        EvaluationConstat constat = new EvaluationConstat(evaluation, nature,
                NiveauRattachement.EXIGENCE, ordre);
        constat.exigence = exigence;
        return constat;
    }

    public static EvaluationConstat surPreuveAttendue(Evaluation evaluation, NatureConstat nature,
                                                      PreuveAttendue preuveAttendue, int ordre) {
        EvaluationConstat constat = new EvaluationConstat(evaluation, nature,
                NiveauRattachement.PREUVE_ATTENDUE, ordre);
        constat.preuveAttendue = preuveAttendue;
        return constat;
    }

    public static EvaluationConstat surRegle(Evaluation evaluation, NatureConstat nature,
                                             RegleAnalyse regleAnalyse, int ordre) {
        EvaluationConstat constat = new EvaluationConstat(evaluation, nature,
                NiveauRattachement.REGLE, ordre);
        constat.regleAnalyse = regleAnalyse;
        return constat;
    }

    private EvaluationConstat(Evaluation evaluation, NatureConstat nature,
                              NiveauRattachement niveauRattachement, int ordre) {
        this.evaluation = evaluation;
        this.nature = nature;
        this.niveauRattachement = niveauRattachement;
        this.ordre = ordre;
    }

    public UUID getId() {
        return id;
    }

    public Evaluation getEvaluation() {
        return evaluation;
    }

    public NatureConstat getNature() {
        return nature;
    }

    public NiveauRattachement getNiveauRattachement() {
        return niveauRattachement;
    }

    public Exigence getExigence() {
        return exigence;
    }

    public PreuveAttendue getPreuveAttendue() {
        return preuveAttendue;
    }

    public RegleAnalyse getRegleAnalyse() {
        return regleAnalyse;
    }

    public String getCategorie() {
        return categorie;
    }

    public void setCategorie(String categorie) {
        this.categorie = categorie;
    }

    public String getJustification() {
        return justification;
    }

    public void setJustification(String justification) {
        this.justification = justification;
    }

    public List<String> getPiecesConcernees() {
        return piecesConcernees;
    }

    public void setPiecesConcernees(List<String> piecesConcernees) {
        this.piecesConcernees = piecesConcernees;
    }

    public int getOrdre() {
        return ordre;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof EvaluationConstat other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
