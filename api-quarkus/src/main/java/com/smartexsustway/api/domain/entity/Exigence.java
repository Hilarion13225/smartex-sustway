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
}
