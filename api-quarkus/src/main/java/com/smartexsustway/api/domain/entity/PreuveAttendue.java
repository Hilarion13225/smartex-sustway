package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.TypePreuveAttendue;
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

import java.util.UUID;

/**
 * Ce que l'audit attend en démonstration d'une exigence.
 *
 * À ne pas confondre avec {@link Document} et {@link Preuve}, qui sont ce
 * que l'organisation fournit effectivement pendant une mission :
 *
 * <pre>
 *   PreuveAttendue  → ce que l'audit attend       (catalogue, versionné)
 *   Document/Preuve → ce que l'entreprise fournit (mission, mutable)
 * </pre>
 *
 * Elle décrit le type d'élément que l'agent doit rechercher, avant même
 * qu'une organisation n'ait déposé quoi que ce soit.
 */
@Entity
@Table(name = "preuve_attendue")
public class PreuveAttendue {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "referentiel_version_id", nullable = false)
    private ReferentielVersion referentielVersion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exigence_id", nullable = false)
    private Exigence exigence;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "type", nullable = false, columnDefinition = "type_preuve_attendue")
    private TypePreuveAttendue type = TypePreuveAttendue.AUTRE;

    @Column(name = "libelle", nullable = false, length = 300)
    private String libelle;

    /** Critères de recevabilité : ce qui rend cette pièce acceptable. */
    @Column(name = "description", columnDefinition = "text")
    private String description;

    /** Vrai si l'absence de cette pièce empêche à elle seule de tenir l'exigence pour démontrée. */
    @Column(name = "obligatoire", nullable = false)
    private boolean obligatoire = true;

    @Column(name = "ordre", nullable = false)
    private int ordre;

    protected PreuveAttendue() {
        // JPA
    }

    public PreuveAttendue(Exigence exigence, TypePreuveAttendue type, String libelle) {
        this.exigence = exigence;
        this.referentielVersion = exigence.getReferentielVersion();
        this.type = type;
        this.libelle = libelle;
    }

    /** Réplique cette preuve attendue sous l'exigence correspondante d'une autre version. */
    public PreuveAttendue copieSous(Exigence exigenceCible) {
        PreuveAttendue copie = new PreuveAttendue(exigenceCible, this.type, this.libelle);
        copie.description = this.description;
        copie.obligatoire = this.obligatoire;
        copie.ordre = this.ordre;
        return copie;
    }

    public UUID getId() {
        return id;
    }

    public ReferentielVersion getReferentielVersion() {
        return referentielVersion;
    }

    public Exigence getExigence() {
        return exigence;
    }

    public TypePreuveAttendue getType() {
        return type;
    }

    public void setType(TypePreuveAttendue type) {
        this.type = type;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isObligatoire() {
        return obligatoire;
    }

    public void setObligatoire(boolean obligatoire) {
        this.obligatoire = obligatoire;
    }

    public int getOrdre() {
        return ordre;
    }

    public void setOrdre(int ordre) {
        this.ordre = ordre;
    }
}
