package com.smartexsustway.api.domain.entity;

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
