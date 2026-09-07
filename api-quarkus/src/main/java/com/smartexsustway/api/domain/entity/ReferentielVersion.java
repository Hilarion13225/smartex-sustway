package com.smartexsustway.api.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Publication datée d'un référentiel.
 *
 * Les volumétries sont figées à la publication : relues plus tard, elles
 * décriraient l'état courant du référentiel et non celui de la version.
 */
@Entity
@Table(name = "referentiel_version")
public class ReferentielVersion {

    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "referentiel_id", nullable = false)
    private Referentiel referentiel;

    @Column(name = "numero", nullable = false, length = 20)
    private String numero;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    @Column(name = "nombre_domaines", nullable = false)
    private int nombreDomaines;

    @Column(name = "nombre_criteres", nullable = false)
    private int nombreCriteres;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "auteur_id")
    private Utilisateur auteur;

    @Column(name = "publiee_le", nullable = false)
    private OffsetDateTime publieeLe = OffsetDateTime.now();

    protected ReferentielVersion() {
        // JPA
    }

    public ReferentielVersion(Referentiel referentiel, String numero, String notes,
                              int nombreDomaines, int nombreCriteres, Utilisateur auteur) {
        this.referentiel = referentiel;
        this.numero = numero;
        this.notes = notes;
        this.nombreDomaines = nombreDomaines;
        this.nombreCriteres = nombreCriteres;
        this.auteur = auteur;
    }

    public UUID getId() {
        return id;
    }

    public Referentiel getReferentiel() {
        return referentiel;
    }

    public String getNumero() {
        return numero;
    }

    public String getNotes() {
        return notes;
    }

    public int getNombreDomaines() {
        return nombreDomaines;
    }

    public int getNombreCriteres() {
        return nombreCriteres;
    }

    public Utilisateur getAuteur() {
        return auteur;
    }

    public OffsetDateTime getPublieeLe() {
        return publieeLe;
    }
}
