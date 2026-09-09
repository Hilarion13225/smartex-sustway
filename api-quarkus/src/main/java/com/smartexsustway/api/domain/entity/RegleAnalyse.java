package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.NiveauCriticite;
import com.smartexsustway.api.domain.enums.OrigineContenu;
import com.smartexsustway.api.domain.enums.TypeRegleAnalyse;
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
import java.util.Map;
import java.util.UUID;

/**
 * Règle d'évaluation d'un critère, portée par le référentiel.
 *
 * La règle est une donnée, le prompt en est le rendu. Stocker le
 * comportement d'analyse dans un champ « prompt » libre reviendrait à coder
 * la logique métier dans du texte : impossible à valider, à comparer d'une
 * version à l'autre, ou à faire évoluer sans relire chaque ligne.
 *
 * La portée descend du plus général au plus précis. {@code critere} est
 * toujours renseigné ; {@code exigence} et {@code preuveAttendue} sont
 * facultatifs, le plus profond des trois donnant la portée :
 *
 * <ul>
 *   <li>sur une preuve attendue : « la procédure doit être signée » ;</li>
 *   <li>sur une exigence : « la déclaration doit concorder avec les pièces » ;</li>
 *   <li>sur le critère : « détecter une contradiction entre les exigences ».</li>
 * </ul>
 *
 * Ces rattachements sont de vraies clés étrangères plutôt que des
 * identifiants nichés dans le JSON : supprimer une exigence d'un brouillon
 * emporte ses règles, et aucune règle ne peut désigner une exigence qui
 * n'existe pas.
 */
@Entity
@Table(name = "regle_analyse")
public class RegleAnalyse {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "referentiel_version_id", nullable = false)
    private ReferentielVersion referentielVersion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "critere_id", nullable = false)
    private Critere critere;

    /** Nul pour une règle portant sur le critère entier. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exigence_id")
    private Exigence exigence;

    /** Nul sauf pour une règle portant sur une pièce attendue précise. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "preuve_attendue_id")
    private PreuveAttendue preuveAttendue;

    @Column(name = "code", nullable = false, length = 40)
    private String code;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "type", nullable = false, columnDefinition = "type_regle_analyse")
    private TypeRegleAnalyse type;

    @Column(name = "libelle", nullable = false, length = 300)
    private String libelle;

    /**
     * Poids du manquement pour l'agent. N'entre pas dans le calcul du score,
     * qui reste porté par la criticité du critère (RG31).
     */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "severite", nullable = false, columnDefinition = "niveau_criticite")
    private NiveauCriticite severite = NiveauCriticite.MOYENNE;

    /**
     * Paramètres propres au type de règle. Validés à l'écriture selon le
     * type (voir RegleAnalyseValidation) : le JSON donne la souplesse
     * nécessaire d'un référentiel à l'autre, la validation évite qu'il ne
     * devienne un fourre-tout.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "definition", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> definition = Map.of();

    @Column(name = "ordre", nullable = false)
    private int ordre;

    /**
     * Provenance de cette règle, et sa provenance à la création.
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

    protected RegleAnalyse() {
        // JPA
    }

    public RegleAnalyse(Critere critere, String code, TypeRegleAnalyse type, String libelle) {
        this.critere = critere;
        this.referentielVersion = critere.getReferentielVersion();
        this.code = code;
        this.type = type;
        this.libelle = libelle;
    }

    /**
     * Réplique cette règle dans une autre version. La portée est passée à
     * part : les copies de l'exigence et de la pièce visées appartiennent
     * elles aussi à la version cible.
     */
    public RegleAnalyse copieSous(Critere critereCible, Exigence exigenceCible,
                                  PreuveAttendue preuveAttendueCible) {
        RegleAnalyse copie = new RegleAnalyse(critereCible, this.code, this.type, this.libelle);
        copie.exigence = exigenceCible;
        copie.preuveAttendue = preuveAttendueCible;
        copie.severite = this.severite;
        copie.definition = this.definition;
        copie.ordre = this.ordre;
        copie.origine = this.origine;
        copie.origineInitiale = this.origineInitiale;
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

    public Exigence getExigence() {
        return exigence;
    }

    public void setExigence(Exigence exigence) {
        this.exigence = exigence;
    }

    public PreuveAttendue getPreuveAttendue() {
        return preuveAttendue;
    }

    public void setPreuveAttendue(PreuveAttendue preuveAttendue) {
        this.preuveAttendue = preuveAttendue;
    }

    public String getCode() {
        return code;
    }

    public TypeRegleAnalyse getType() {
        return type;
    }

    public void setType(TypeRegleAnalyse type) {
        this.type = type;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public NiveauCriticite getSeverite() {
        return severite;
    }

    public void setSeverite(NiveauCriticite severite) {
        this.severite = severite;
    }

    public Map<String, Object> getDefinition() {
        return definition;
    }

    public void setDefinition(Map<String, Object> definition) {
        this.definition = definition == null ? Map.of() : definition;
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
}
