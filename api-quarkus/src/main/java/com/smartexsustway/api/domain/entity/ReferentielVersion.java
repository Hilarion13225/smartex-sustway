package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.StatutVersionReferentiel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Version d'un référentiel, et propriétaire de son contenu.
 *
 * Ce n'est plus un journal de publications : domaines, sous-domaines,
 * critères et questions appartiennent à une version (V47). On édite un
 * BROUILLON ; une fois publié il devient immuable, garanti par déclencheur
 * en base (V49). Une mission conserve la version qu'elle a auditée, ce qui
 * rend son résultat opposable même si le catalogue évolue ensuite.
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

    /** Nulle tant que la version est un brouillon. */
    @Column(name = "publiee_le")
    private OffsetDateTime publieeLe;

    @Column(name = "creee_le", nullable = false)
    private OffsetDateTime creeeLe = OffsetDateTime.now();

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut", nullable = false, columnDefinition = "statut_version_referentiel")
    private StatutVersionReferentiel statut = StatutVersionReferentiel.BROUILLON;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "publiee_par")
    private Utilisateur publieePar;

    /** Version dont celle-ci est issue par copie, pour tracer la filiation. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "remplace_version_id")
    private ReferentielVersion remplaceVersion;

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

    public OffsetDateTime getCreeeLe() {
        return creeeLe;
    }

    public StatutVersionReferentiel getStatut() {
        return statut;
    }

    public void setStatut(StatutVersionReferentiel statut) {
        this.statut = statut;
    }

    public Utilisateur getPublieePar() {
        return publieePar;
    }

    public void setPublieePar(Utilisateur publieePar) {
        this.publieePar = publieePar;
    }

    public ReferentielVersion getRemplaceVersion() {
        return remplaceVersion;
    }

    public void setRemplaceVersion(ReferentielVersion remplaceVersion) {
        this.remplaceVersion = remplaceVersion;
    }

    public void setNombreDomaines(int nombreDomaines) {
        this.nombreDomaines = nombreDomaines;
    }

    public void setNombreCriteres(int nombreCriteres) {
        this.nombreCriteres = nombreCriteres;
    }

    public void setPublieeLe(OffsetDateTime publieeLe) {
        this.publieeLe = publieeLe;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    /** Un brouillon est le seul état dans lequel le contenu se modifie. */
    public boolean estBrouillon() {
        return statut == StatutVersionReferentiel.BROUILLON;
    }
}
