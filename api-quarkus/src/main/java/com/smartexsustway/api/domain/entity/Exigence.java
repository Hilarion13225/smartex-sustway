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

import java.time.Instant;
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
}
