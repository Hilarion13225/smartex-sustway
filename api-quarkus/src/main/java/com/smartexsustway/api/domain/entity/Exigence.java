package com.smartexsustway.api.domain.entity;

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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Ce qu'un critère exige de l'organisation.
 *
 * Un critère en compte une ou plusieurs : « disposer d'une procédure »,
 * « la faire valider » et « la réviser annuellement » sont trois exigences
 * d'un même critère, et elles ne se démontrent pas par les mêmes pièces.
 *
 * L'exigence n'est pas une unité d'évaluation : le score reste calculé au
 * niveau du critère (RG31). Elle enrichit le contexte soumis aux agents,
 * elle ne le découpe pas.
 */
@Entity
@Table(name = "exigence")
public class Exigence {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    /**
     * Version propriétaire. Une exigence d'une version publiée n'est plus
     * modifiable : les déclencheurs de V53 refusent l'écriture.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "referentiel_version_id", nullable = false)
    private ReferentielVersion referentielVersion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "critere_id", nullable = false)
    private Critere critere;

    @Column(name = "code", nullable = false, length = 40)
    private String code;

    @Column(name = "intitule", nullable = false, length = 300)
    private String intitule;

    /** Formulation soumise aux agents d'analyse. */
    @Column(name = "enonce", nullable = false, columnDefinition = "text")
    private String enonce;

    @Column(name = "ordre", nullable = false)
    private int ordre;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "origine", nullable = false, columnDefinition = "origine_contenu")
    private OrigineContenu origine = OrigineContenu.CONTENU_HUMAIN;

    /**
     * Origine à la création, conservée quand {@link #origine} évolue.
     *
     * Reprendre à son compte une proposition de l'IA en fait un contenu
     * humain, et c'est bien ce que doit dire {@code origine}. Mais si rien ne
     * gardait trace de la provenance, plus personne ne pourrait dire après
     * coup quelles lignes du catalogue ont été suggérées par une machine.
     * Nulle pour le contenu antérieur à l'import assisté.
     */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "origine_initiale", columnDefinition = "origine_contenu")
    private OrigineContenu origineInitiale;

    /**
     * Qui a accepté cette exigence, et quand.
     *
     * Nuls tant que personne ne l'a fait, et c'est cette nullité qui interdit
     * la publication d'une version contenant des propositions non relues
     * (déclencheur {@code refuser_publication_sans_validation}, V57).
     */
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

    protected Exigence() {
        // JPA
    }

    public Exigence(Critere critere, String code, String intitule, String enonce) {
        this.critere = critere;
        this.referentielVersion = critere.getReferentielVersion();
        this.code = code;
        this.intitule = intitule;
        this.enonce = enonce;
    }

    /** Réplique cette exigence sous le critère correspondant d'une autre version. */
    public Exigence copieSous(Critere critereCible) {
        Exigence copie = new Exigence(critereCible, this.code, this.intitule, this.enonce);
        copie.ordre = this.ordre;
        // L'origine suit la copie : la reprise d'un contenu initial reste un
        // contenu initial tant que personne ne l'a réécrit.
        copie.origine = this.origine;
        copie.origineInitiale = this.origineInitiale;
        // La validation suit elle aussi. Une personne a relu ce texte ; le
        // recopier à l'identique ne le remet pas en cause. Sans cela, dériver
        // un brouillon d'une version publiée produirait un brouillon
        // impubliable, dont chaque ligne serait à revalider sans avoir changé.
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

    public Critere getCritere() {
        return critere;
    }

    public String getCode() {
        return code;
    }

    public String getIntitule() {
        return intitule;
    }

    public void setIntitule(String intitule) {
        this.intitule = intitule;
    }

    public String getEnonce() {
        return enonce;
    }

    public void setEnonce(String enonce) {
        this.enonce = enonce;
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

    /**
     * Enregistre l'acceptation par une personne.
     *
     * Les deux champs sont posés ensemble parce que la base l'impose
     * ({@code exigence_validation_complete}) : un validateur sans date, ou
     * l'inverse, ne dit rien d'exploitable.
     */
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
