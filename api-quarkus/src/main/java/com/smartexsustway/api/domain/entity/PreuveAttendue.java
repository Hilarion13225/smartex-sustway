package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.OrigineContenu;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
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

    /**
     * Provenance de cette pièce attendue, et sa provenance à la création.
     *
     * Voir {@link Exigence#getOrigineInitiale()} : ces trois tables portent
     * la même paire, pour la même raison.
     */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "origine", nullable = false, columnDefinition = "origine_contenu")
    private OrigineContenu origine = OrigineContenu.CONTENU_HUMAIN;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "origine_initiale", columnDefinition = "origine_contenu")
    private OrigineContenu origineInitiale;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "validee_par")
    private Utilisateur valideePar;

    @Column(name = "validee_le")
    private Instant valideeLe;

    /**
     * Qui a écarté cette proposition, et quand — avec un motif s'il en a
     * donné un.
     *
     * Miroir exact de la validation, et pour la même raison : la décision
     * d'une personne se lit sur la ligne elle-même. Écarter ne supprime pas —
     * supprimer effacerait la trace qu'une machine l'avait proposée, et
     * l'import deviendrait invérifiable après coup. Le motif reste facultatif :
     * exiger une justification serait une décision métier que rien n'a
     * tranchée, et une proposition manifestement hors sujet doit pouvoir
     * partir sans plaidoirie.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rejetee_par")
    private Utilisateur rejeteePar;

    @Column(name = "rejetee_le")
    private Instant rejeteeLe;

    @Column(name = "motif_rejet", columnDefinition = "text")
    private String motifRejet;

    /**
     * D'où la proposition a été tirée du document.
     *
     * Ces trois champs sont renseignés seulement quand le service d'agents les
     * a réellement mesurés, et restent nuls sinon. Une localisation
     * approximative serait pire qu'absente : elle enverrait le relecteur au
     * mauvais endroit avec confiance. De même, une confiance absente ne
     * devient jamais zéro — l'ignorance n'est pas une certitude négative.
     *
     * Ils survivent à la validation : comprendre après coup d'où vient une
     * ligne du catalogue reste utile longtemps après qu'on l'a acceptée.
     */
    @Column(name = "texte_source", columnDefinition = "text")
    private String texteSource;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "localisation", columnDefinition = "jsonb")
    private Map<String, Object> localisation;

    @Column(name = "confiance")
    private BigDecimal confiance;

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
        copie.origine = this.origine;
        copie.origineInitiale = this.origineInitiale;
        copie.valideePar = this.valideePar;
        copie.valideeLe = this.valideeLe;
        copie.rejeteePar = this.rejeteePar;
        copie.rejeteeLe = this.rejeteeLe;
        copie.motifRejet = this.motifRejet;
        copie.texteSource = this.texteSource;
        copie.localisation = this.localisation;
        copie.confiance = this.confiance;
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

    public OrigineContenu getOrigine() {
        return origine;
    }

    public void setOrigine(OrigineContenu origine) {
        this.origine = origine;
    }

    public OrigineContenu getOrigineInitiale() {
        return origineInitiale;
    }

    public void setOrigineInitiale(OrigineContenu origineInitiale) {
        this.origineInitiale = origineInitiale;
    }

    public Utilisateur getValideePar() {
        return valideePar;
    }

    public Instant getValideeLe() {
        return valideeLe;
    }

    public void validerPar(Utilisateur utilisateur, Instant quand) {
        this.valideePar = utilisateur;
        this.valideeLe = quand;
    }

    public Utilisateur getRejeteePar() {
        return rejeteePar;
    }

    public Instant getRejeteeLe() {
        return rejeteeLe;
    }

    public String getMotifRejet() {
        return motifRejet;
    }

    /**
     * Enregistre le refus par une personne.
     *
     * Les champs sont posés ensemble parce que la base l'impose : un rejet
     * sans date, ou un motif sans rejet, ne dit rien d'exploitable.
     */
    public void rejeterPar(Utilisateur utilisateur, Instant quand, String motif) {
        this.rejeteePar = utilisateur;
        this.rejeteeLe = quand;
        this.motifRejet = motif;
    }

    public String getTexteSource() {
        return texteSource;
    }

    public void setTexteSource(String texteSource) {
        this.texteSource = texteSource;
    }

    public Map<String, Object> getLocalisation() {
        return localisation;
    }

    public void setLocalisation(Map<String, Object> localisation) {
        this.localisation = localisation;
    }

    public BigDecimal getConfiance() {
        return confiance;
    }

    public void setConfiance(BigDecimal confiance) {
        this.confiance = confiance;
    }
}
