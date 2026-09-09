package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.StatutImportReferentiel;
import com.smartexsustway.api.domain.enums.StatutScanDocument;
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

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Suivi d'un import de référentiel : le fichier reçu, ce qu'on en a fait, et
 * ce qu'il en est advenu.
 *
 * Le fichier source est conservé dans le stockage objet, y compris quand
 * l'extraction échoue — c'est une pièce de traçabilité, pas un intermédiaire
 * jetable. Seule sa clé figure ici ; le binaire n'entre jamais en base.
 *
 * Le référentiel et la version sont nuls tant que l'extraction n'a pas
 * abouti : au moment du dépôt, on ne sait pas encore quel cadre le fichier
 * décrit, et prétendre le contraire obligerait à le demander à l'utilisateur
 * avant de l'avoir lu.
 */
@Entity
@Table(name = "import_referentiel")
public class ImportReferentiel {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    /** Renseigné une fois l'extraction aboutie. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "referentiel_id")
    private Referentiel referentiel;

    /** Version brouillon qui a reçu le contenu proposé. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "referentiel_version_id")
    private ReferentielVersion referentielVersion;

    @Column(name = "nom_fichier", nullable = false, length = 500)
    private String nomFichier;

    @Column(name = "type_mime", nullable = false, length = 150)
    private String typeMime;

    @Column(name = "taille", nullable = false)
    private long taille;

    @Column(name = "hash_fichier", nullable = false, length = 128)
    private String hashFichier;

    /** Clé de l'objet dans le stockage. Jamais exposée telle quelle au client. */
    @Column(name = "cle_stockage", nullable = false, columnDefinition = "text")
    private String cleStockage;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut_scan", nullable = false, columnDefinition = "statut_scan_document")
    private StatutScanDocument statutScan = StatutScanDocument.EN_ATTENTE;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut", nullable = false, columnDefinition = "statut_import_referentiel")
    private StatutImportReferentiel statut = StatutImportReferentiel.EN_ATTENTE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "importe_par")
    private Utilisateur importePar;

    @Column(name = "importe_le", nullable = false)
    private OffsetDateTime importeLe = OffsetDateTime.now();

    @Column(name = "analyse_debut")
    private OffsetDateTime analyseDebut;

    @Column(name = "analyse_fin")
    private OffsetDateTime analyseFin;

    /** Motif d'échec, destiné à l'administrateur. Obligatoire dès que le statut est ECHEC. */
    @Column(name = "erreur", columnDefinition = "text")
    private String erreur;

    /**
     * Ce que l'extraction a relevé sur le fichier lui-même — nombre de pages,
     * de feuilles, de lignes, modèle sollicité. Volontairement libre : ces
     * indications varient d'un format à l'autre et n'ont pas à être
     * interrogées, seulement affichées.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadonnees", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> metadonnees = Map.of();

    protected ImportReferentiel() {
        // JPA
    }

    public ImportReferentiel(String nomFichier, String typeMime, long taille, String hashFichier,
                             String cleStockage, StatutScanDocument statutScan, Utilisateur importePar) {
        this.nomFichier = nomFichier;
        this.typeMime = typeMime;
        this.taille = taille;
        this.hashFichier = hashFichier;
        this.cleStockage = cleStockage;
        this.statutScan = statutScan;
        this.importePar = importePar;
    }

    /** L'extraction commence. */
    public void marquerAnalyseEnCours() {
        this.statut = StatutImportReferentiel.ANALYSE_EN_COURS;
        this.analyseDebut = OffsetDateTime.now();
        this.erreur = null;
    }

    /** L'extraction a abouti : le contenu proposé est déposé dans cette version brouillon. */
    public void marquerBrouillonGenere(ReferentielVersion version, Map<String, Object> metadonnees) {
        this.referentielVersion = version;
        this.referentiel = version.getReferentiel();
        this.statut = StatutImportReferentiel.BROUILLON_GENERE;
        this.analyseFin = OffsetDateTime.now();
        this.erreur = null;
        if (metadonnees != null) {
            this.metadonnees = metadonnees;
        }
    }

    /**
     * L'extraction a échoué. Le motif est obligatoire : un import mort sans
     * explication ne laisse rien à corriger à l'administrateur, et la base le
     * refuserait de toute façon (contrainte import_referentiel_echec_motive).
     */
    public void marquerEchec(String motif) {
        this.statut = StatutImportReferentiel.ECHEC;
        this.analyseFin = OffsetDateTime.now();
        this.erreur = motif == null || motif.isBlank() ? "Échec sans motif rapporté" : motif;
    }

    public UUID getId() {
        return id;
    }

    public Referentiel getReferentiel() {
        return referentiel;
    }

    public ReferentielVersion getReferentielVersion() {
        return referentielVersion;
    }

    public String getNomFichier() {
        return nomFichier;
    }

    public String getTypeMime() {
        return typeMime;
    }

    public long getTaille() {
        return taille;
    }

    public String getHashFichier() {
        return hashFichier;
    }

    public String getCleStockage() {
        return cleStockage;
    }

    public StatutScanDocument getStatutScan() {
        return statutScan;
    }

    public StatutImportReferentiel getStatut() {
        return statut;
    }

    public Utilisateur getImportePar() {
        return importePar;
    }

    public OffsetDateTime getImporteLe() {
        return importeLe;
    }

    public OffsetDateTime getAnalyseDebut() {
        return analyseDebut;
    }

    public OffsetDateTime getAnalyseFin() {
        return analyseFin;
    }

    public String getErreur() {
        return erreur;
    }

    public Map<String, Object> getMetadonnees() {
        return metadonnees;
    }
}
