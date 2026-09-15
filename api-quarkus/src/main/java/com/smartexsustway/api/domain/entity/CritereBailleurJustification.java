package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.CorrespondanceBailleur;
import com.smartexsustway.api.domain.enums.OrigineContenu;
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
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Pourquoi un critère compte pour un bailleur (V74) : la source officielle,
 * le passage cité, et la décision humaine qui s'y rapporte.
 *
 * <p>Le couple critère/bailleur est porté en identifiants plutôt qu'en
 * relations : la justification référence {@code critere_bailleur}, table sans
 * entité JPA (voir CritereBailleurRepository), et ne sert jamais à naviguer
 * vers le critère.
 *
 * <p>L'état n'est pas stocké : il se lit dans les colonnes de décision. Les
 * règles d'immuabilité sont tenues par la base (déclencheurs V74) ; les
 * méthodes ci-dessous ne font qu'éviter d'y aller buter. L'entité n'emploie
 * pas {@code @DynamicUpdate} : les déclencheurs comparent la ligne entière et
 * acceptent donc l'UPDATE complet qu'Hibernate émet.
 */
@Entity
@Table(name = "critere_bailleur_justification")
public class CritereBailleurJustification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "critere_id", nullable = false, updatable = false)
    private UUID critereId;

    @Column(name = "bailleur_id", nullable = false, updatable = false)
    private UUID bailleurId;

    @Column(name = "document_nom", columnDefinition = "text")
    private String documentNom;

    @Column(name = "document_edition", columnDefinition = "text")
    private String documentEdition;

    @Column(name = "document_organisme", columnDefinition = "text")
    private String documentOrganisme;

    @Column(name = "document_url", columnDefinition = "text")
    private String documentUrl;

    @Column(name = "reference_officielle", columnDefinition = "text")
    private String referenceOfficielle;

    @Column(name = "titre_officiel", columnDefinition = "text")
    private String titreOfficiel;

    @Column(name = "texte_source", columnDefinition = "text")
    private String texteSource;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "localisation", columnDefinition = "jsonb")
    private Map<String, Object> localisation;

    @Column(name = "confiance", precision = 4, scale = 3)
    private BigDecimal confiance;

    // Initialisées ici et non laissées au DEFAULT de la colonne : Hibernate
    // insère toutes les colonnes, et enverrait NULL.
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "origine", nullable = false, columnDefinition = "origine_contenu")
    private OrigineContenu origine = OrigineContenu.CONTENU_HUMAIN;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "correspondance", nullable = false, columnDefinition = "correspondance_bailleur")
    private CorrespondanceBailleur correspondance = CorrespondanceBailleur.NON_DETERMINEE;

    @Column(name = "justification", columnDefinition = "text")
    private String justification;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "validee_par")
    private Utilisateur valideePar;

    @Column(name = "validee_le")
    private OffsetDateTime valideeLe;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rejetee_par")
    private Utilisateur rejeteePar;

    @Column(name = "rejetee_le")
    private OffsetDateTime rejeteeLe;

    @Column(name = "motif_rejet", columnDefinition = "text")
    private String motifRejet;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "perimee_par")
    private Utilisateur perimeePar;

    @Column(name = "perimee_le")
    private OffsetDateTime perimeeLe;

    @Column(name = "motif_peremption", columnDefinition = "text")
    private String motifPeremption;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false, updatable = false)
    private Utilisateur creePar;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime creeLe;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "modifiee_par")
    private Utilisateur modifieePar;

    @Column(name = "modifiee_le")
    private OffsetDateTime modifieeLe;

    protected CritereBailleurJustification() {
        // requis par JPA
    }

    private CritereBailleurJustification(UUID critereId, UUID bailleurId, Utilisateur auteur) {
        this.critereId = Objects.requireNonNull(critereId);
        this.bailleurId = Objects.requireNonNull(bailleurId);
        this.creePar = Objects.requireNonNull(auteur);
    }

    /** Un brouillon, éventuellement sans aucune source : seule la validation en exige une. */
    public static CritereBailleurJustification brouillon(UUID critereId, UUID bailleurId, Utilisateur auteur) {
        return new CritereBailleurJustification(critereId, bailleurId, auteur);
    }

    /**
     * Report d'une justification vers le critère équivalent d'une version
     * dérivée. Le contenu documentaire est repris ; aucune décision ne l'est :
     * la copie est un brouillon, que quelqu'un devra de nouveau trancher.
     */
    public static CritereBailleurJustification reportDe(CritereBailleurJustification source,
                                                       UUID critereId, UUID bailleurId, Utilisateur auteur) {
        var copie = new CritereBailleurJustification(critereId, bailleurId, auteur);
        copie.documentNom = source.documentNom;
        copie.documentEdition = source.documentEdition;
        copie.documentOrganisme = source.documentOrganisme;
        copie.documentUrl = source.documentUrl;
        copie.referenceOfficielle = source.referenceOfficielle;
        copie.titreOfficiel = source.titreOfficiel;
        copie.texteSource = source.texteSource;
        copie.localisation = source.localisation == null ? null : new LinkedHashMap<>(source.localisation);
        copie.confiance = source.confiance;
        copie.origine = source.origine;
        copie.correspondance = source.correspondance;
        copie.justification = source.justification;
        return copie;
    }

    /**
     * Remplace le contenu d'un brouillon ; l'appelant a vérifié qu'il en est un.
     *
     * {@code auteurModification} nul à la création seulement : un brouillon
     * renseigné en naissant n'a pas été modifié, et ne doit pas le prétendre.
     */
    public void remplacerContenu(String documentNom, String documentEdition, String documentOrganisme,
                                 String documentUrl, String referenceOfficielle, String titreOfficiel,
                                 String texteSource, Map<String, Object> localisation, BigDecimal confiance,
                                 CorrespondanceBailleur correspondance, String justification,
                                 Utilisateur auteurModification) {
        this.documentNom = documentNom;
        this.documentEdition = documentEdition;
        this.documentOrganisme = documentOrganisme;
        this.documentUrl = documentUrl;
        this.referenceOfficielle = referenceOfficielle;
        this.titreOfficiel = titreOfficiel;
        this.texteSource = texteSource;
        this.localisation = localisation;
        this.confiance = confiance;
        this.correspondance = correspondance == null ? CorrespondanceBailleur.NON_DETERMINEE : correspondance;
        this.justification = justification;
        if (auteurModification != null) {
            this.modifieePar = auteurModification;
            this.modifieeLe = maintenant();
        }
    }

    public void valider(Utilisateur validateur) {
        this.valideePar = Objects.requireNonNull(validateur);
        this.valideeLe = maintenant();
    }

    public void rejeter(Utilisateur auteurRejet, String motif) {
        this.rejeteePar = Objects.requireNonNull(auteurRejet);
        this.rejeteeLe = maintenant();
        this.motifRejet = motif;
    }

    /** Seule manière de défaire une validation. Ne touche pas aux champs de modification. */
    public void perimer(Utilisateur auteurPeremption, String motif) {
        this.perimeePar = Objects.requireNonNull(auteurPeremption);
        this.perimeeLe = maintenant();
        this.motifPeremption = motif;
    }

    /**
     * L'instant présent à la précision que PostgreSQL conserve.
     *
     * {@code timestamptz} garde la microseconde ; {@code OffsetDateTime.now()}
     * peut porter davantage. Sans troncature, la réponse d'une écriture
     * annoncerait une date qui n'est pas celle enregistrée, et qu'une relecture
     * démentirait. {@code creeLe} n'est pas concerné : Hibernate tronque déjà
     * {@code @CreationTimestamp} à la précision de la colonne.
     */
    private static OffsetDateTime maintenant() {
        return OffsetDateTime.now().truncatedTo(ChronoUnit.MICROS);
    }

    public boolean estValidee() {
        return valideePar != null;
    }

    public boolean estRejetee() {
        return rejeteePar != null;
    }

    public boolean estPerimee() {
        return perimeeLe != null;
    }

    /** Ni validée, ni rejetée : le seul état où le contenu se modifie. */
    public boolean estBrouillon() {
        return valideePar == null && rejeteePar == null;
    }

    public UUID getId() {
        return id;
    }

    public UUID getCritereId() {
        return critereId;
    }

    public UUID getBailleurId() {
        return bailleurId;
    }

    public String getDocumentNom() {
        return documentNom;
    }

    public String getDocumentEdition() {
        return documentEdition;
    }

    public String getDocumentOrganisme() {
        return documentOrganisme;
    }

    public String getDocumentUrl() {
        return documentUrl;
    }

    public String getReferenceOfficielle() {
        return referenceOfficielle;
    }

    public String getTitreOfficiel() {
        return titreOfficiel;
    }

    public String getTexteSource() {
        return texteSource;
    }

    public Map<String, Object> getLocalisation() {
        return localisation;
    }

    public BigDecimal getConfiance() {
        return confiance;
    }

    public OrigineContenu getOrigine() {
        return origine;
    }

    public CorrespondanceBailleur getCorrespondance() {
        return correspondance;
    }

    public String getJustification() {
        return justification;
    }

    public Utilisateur getValideePar() {
        return valideePar;
    }

    public OffsetDateTime getValideeLe() {
        return valideeLe;
    }

    public Utilisateur getRejeteePar() {
        return rejeteePar;
    }

    public OffsetDateTime getRejeteeLe() {
        return rejeteeLe;
    }

    public String getMotifRejet() {
        return motifRejet;
    }

    public Utilisateur getPerimeePar() {
        return perimeePar;
    }

    public OffsetDateTime getPerimeeLe() {
        return perimeeLe;
    }

    public String getMotifPeremption() {
        return motifPeremption;
    }

    public Utilisateur getCreePar() {
        return creePar;
    }

    public OffsetDateTime getCreeLe() {
        return creeLe;
    }

    public Utilisateur getModifieePar() {
        return modifieePar;
    }

    public OffsetDateTime getModifieeLe() {
        return modifieeLe;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof CritereBailleurJustification other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
