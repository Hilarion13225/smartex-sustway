package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.OrigineContenu;
import com.smartexsustway.api.domain.enums.TypeApplicabilite;
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
import java.util.Objects;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * Correspond à la table {@code critere}.
 * RG09 : peut posséder plusieurs questions. RG34/RG39 : applicabilité
 * générale/sectorielle/bailleur, qui détermine sa présence dans le
 * questionnaire composé dynamiquement (voir QuestionnaireService).
 */
@Entity
@Table(name = "critere")
public class Critere {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "domaine_id", nullable = false)
    private Domaine domaine;

    /** Regroupement facultatif à l'intérieur du domaine (voir V33). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sous_domaine_id")
    private SousDomaine sousDomaine;

    /**
     * Poids du critère dans le score de son référentiel (1 à 3 dans les
     * grilles Smartex), recopié dans la mission à sa création.
     */
    @Column(name = "coefficient_ponderation", nullable = false)
    private BigDecimal coefficientPonderation = BigDecimal.ONE;


    /**
     * Version propriétaire de cette ligne. Une ligne d'une version publiée
     * n'est plus modifiable : le déclencheur de V49 refuse l'écriture.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "referentiel_version_id", nullable = false)
    private ReferentielVersion referentielVersion;

    @Column(name = "code", nullable = false, length = 30)
    private String code;

    @Column(name = "libelle", nullable = false, length = 500)
    private String libelle;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "applicabilite", nullable = false, columnDefinition = "type_applicabilite")
    private TypeApplicabilite applicabilite = TypeApplicabilite.GENERALE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "criticite_id")
    private Criticite criticite;

    @Column(name = "actif", nullable = false)
    private boolean actif = true;

    /**
     * Provenance de cette ligne — libellé, description, applicabilité,
     * coefficient et criticité ensemble.
     *
     * L'unité est la ligne, non le champ : ces valeurs viennent de la même
     * proposition, et les séparer supposerait cinq décisions là où le
     * relecteur n'en prend qu'une.
     */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "origine", nullable = false, columnDefinition = "origine_contenu")
    private OrigineContenu origine = OrigineContenu.CONTENU_HUMAIN;

    /**
     * Origine à la création, conservée quand {@link #origine} évolue.
     * Nulle pour le contenu antérieur à l'import assisté.
     */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "origine_initiale", columnDefinition = "origine_contenu")
    private OrigineContenu origineInitiale;

    /**
     * Qui a accepté ce critère, et quand.
     *
     * Nuls tant que personne ne l'a fait, et c'est cette nullité qui interdit
     * la publication d'une version contenant des propositions non relues
     * (déclencheur {@code refuser_publication_sans_validation}, V75).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "validee_par")
    private Utilisateur valideePar;

    @Column(name = "validee_le")
    private Instant valideeLe;

    /**
     * Qui a écarté cette proposition, et quand — avec un motif s'il en a
     * donné un. Écarter ne supprime pas : supprimer un critère emporterait
     * ses exigences, ses preuves et ses règles.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rejetee_par")
    private Utilisateur rejeteePar;

    @Column(name = "rejetee_le")
    private Instant rejeteeLe;

    @Column(name = "motif_rejet", columnDefinition = "text")
    private String motifRejet;

    protected Critere() {
        // JPA
    }

    public Critere(Domaine domaine, String code, String libelle) {
        this.domaine = domaine;
        this.referentielVersion = domaine.getReferentielVersion();
        this.code = code;
        this.libelle = libelle;
    }

    /**
     * Réplique ce critère sous le domaine correspondant d'une autre version.
     * Le sous-domaine est passé à part : sa copie appartient elle aussi à la
     * version cible, et le rattacher à celui de la version source relierait
     * deux versions entre elles.
     */
    public Critere copieSous(Domaine domaineCible, SousDomaine sousDomaineCible) {
        Critere copie = new Critere(domaineCible, this.code, this.libelle);
        copie.sousDomaine = sousDomaineCible;
        copie.description = this.description;
        copie.applicabilite = this.applicabilite;
        copie.criticite = this.criticite;
        copie.coefficientPonderation = this.coefficientPonderation;
        copie.actif = this.actif;
        // L'origine suit la copie : la reprise d'un contenu initial reste un
        // contenu initial tant que personne ne l'a réécrit.
        copie.origine = this.origine;
        copie.origineInitiale = this.origineInitiale;
        // La validation suit elle aussi. Une personne a relu cette ligne ; la
        // recopier à l'identique ne la remet pas en cause. Sans cela, dériver
        // un brouillon d'une version publiée produirait un brouillon
        // impubliable, dont chaque critère serait à revalider sans avoir changé.
        copie.valideePar = this.valideePar;
        copie.valideeLe = this.valideeLe;
        copie.rejeteePar = this.rejeteePar;
        copie.rejeteeLe = this.rejeteeLe;
        copie.motifRejet = this.motifRejet;
        return copie;
    }

    public UUID getId() {
        return id;
    }

    public Domaine getDomaine() {
        return domaine;
    }

    public ReferentielVersion getReferentielVersion() {
        return referentielVersion;
    }

    public SousDomaine getSousDomaine() {
        return sousDomaine;
    }

    public void setSousDomaine(SousDomaine sousDomaine) {
        this.sousDomaine = sousDomaine;
    }

    public BigDecimal getCoefficientPonderation() {
        return coefficientPonderation;
    }

    public void setCoefficientPonderation(BigDecimal coefficientPonderation) {
        this.coefficientPonderation = coefficientPonderation;
    }

    public String getCode() {
        return code;
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

    public TypeApplicabilite getApplicabilite() {
        return applicabilite;
    }

    public void setApplicabilite(TypeApplicabilite applicabilite) {
        this.applicabilite = applicabilite;
    }

    public Criticite getCriticite() {
        return criticite;
    }

    public void setCriticite(Criticite criticite) {
        this.criticite = criticite;
    }

    public boolean isActif() {
        return actif;
    }

    public void setActif(boolean actif) {
        this.actif = actif;
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
     * Enregistre l'acceptation par une personne.
     *
     * Les deux champs sont posés ensemble parce que la base l'impose
     * ({@code critere_validation_complete}) : un validateur sans date, ou
     * l'inverse, ne dit rien d'exploitable.
     */
    public void validerPar(Utilisateur utilisateur, Instant quand) {
        this.valideePar = utilisateur;
        this.valideeLe = quand;
    }

    /**
     * Enregistre le rejet par une personne, avec un motif facultatif.
     *
     * La ligne subsiste : supprimer effacerait la trace qu'une machine l'avait
     * proposée, et emporterait au passage ses exigences, ses preuves et ses
     * règles.
     */
    public void rejeterPar(Utilisateur utilisateur, Instant quand, String motif) {
        this.rejeteePar = utilisateur;
        this.rejeteeLe = quand;
        this.motifRejet = motif == null || motif.isBlank() ? null : motif;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Critere other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
