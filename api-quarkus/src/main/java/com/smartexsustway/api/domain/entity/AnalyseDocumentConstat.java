package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.PresenceConstat;
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
 * Ce qu'un document dit d'une preuve attendue.
 *
 * <p><strong>C'est cette table qui préserve les contradictions.</strong>
 * Deux documents affirmant des choses opposées sur la même attente
 * produisent deux lignes, chacune rattachée à son document — aucune ne peut
 * écraser l'autre. Une structure qui n'aurait gardé qu'un constat par
 * attente aurait perdu le conflit, alors qu'un conflit entre pièces est un
 * fait d'audit, pas une erreur à trancher.
 *
 * <p>Le grain est donc {@code (document analysé × preuve attendue)}, à ne
 * pas confondre avec celui de {@link EvaluationPreuve}, qui porte la
 * synthèse par attente.
 */
@Entity
@Table(name = "analyse_document_constat")
public class AnalyseDocumentConstat {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "evaluation_document_analyse_id", nullable = false)
    private EvaluationDocumentAnalyse analyseDocument;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "preuve_attendue_id", nullable = false)
    private PreuveAttendue preuveAttendue;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "presence", nullable = false, columnDefinition = "presence_constat")
    private PresenceConstat presence;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "elements_releves", columnDefinition = "jsonb")
    private List<String> elementsReleves;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "elements_manquants", columnDefinition = "jsonb")
    private List<String> elementsManquants;

    @Column(name = "ordre", nullable = false)
    private int ordre;

    protected AnalyseDocumentConstat() {
        // JPA
    }

    public AnalyseDocumentConstat(EvaluationDocumentAnalyse analyseDocument, PreuveAttendue preuveAttendue,
                                  PresenceConstat presence, int ordre) {
        this.analyseDocument = analyseDocument;
        this.preuveAttendue = preuveAttendue;
        this.presence = presence;
        this.ordre = ordre;
    }

    public UUID getId() {
        return id;
    }

    public EvaluationDocumentAnalyse getAnalyseDocument() {
        return analyseDocument;
    }

    public PreuveAttendue getPreuveAttendue() {
        return preuveAttendue;
    }

    public PresenceConstat getPresence() {
        return presence;
    }

    public List<String> getElementsReleves() {
        return elementsReleves;
    }

    public void setElementsReleves(List<String> elementsReleves) {
        this.elementsReleves = elementsReleves;
    }

    public List<String> getElementsManquants() {
        return elementsManquants;
    }

    public void setElementsManquants(List<String> elementsManquants) {
        this.elementsManquants = elementsManquants;
    }

    public int getOrdre() {
        return ordre;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AnalyseDocumentConstat other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
