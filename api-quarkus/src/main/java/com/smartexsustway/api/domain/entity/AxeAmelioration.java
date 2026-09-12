package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.NiveauRattachement;
import com.smartexsustway.api.domain.enums.OrigineAxe;
import com.smartexsustway.api.domain.enums.StatutAxe;
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
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Une proposition d'amélioration — et rien de plus tant qu'une personne ne
 * l'a pas reprise.
 *
 * <p>C'est la pièce qui manquait pour qu'une recommandation d'IA ait un
 * destin honnête. Sans elle, elle n'avait le choix qu'entre rester du texte
 * libre et être recopiée dans la description d'une non-conformité — donc
 * entrer dans un objet opposable sans que personne ne l'ait acceptée.
 *
 * <p>Le motif de validation est repris littéralement de {@link Exigence} :
 * {@code origine}, {@code origineInitiale}, {@code validee*},
 * {@code rejetee*}, {@code motifRejet}. Ce motif tient déjà une barrière de
 * publication en base ; le réutiliser évite d'inventer un second
 * vocabulaire de validation dans la même application.
 *
 * <p>Un axe rejeté <strong>est conservé</strong>. Effacer une
 * recommandation écartée rendrait la relecture invérifiable après coup.
 */
@Entity
@Table(name = "axe_amelioration")
public class AxeAmelioration {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    /**
     * Clé de tenant, obligatoire, bien qu'elle soit dérivable via
     * l'évaluation ou le critère. Un contrôle d'accès qui coûte trois
     * jointures est un contrôle qu'on finit par oublier d'écrire.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "audit_id", nullable = false)
    private Audit audit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "audit_critere_id")
    private AuditCritere auditCritere;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluation_id")
    private Evaluation evaluation;

    @Column(name = "libelle", nullable = false, length = 255)
    private String libelle;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "origine", nullable = false, columnDefinition = "origine_axe")
    private OrigineAxe origine;

    /**
     * Origine à la création, conservée si {@code origine} évolue. Sans
     * elle, un axe proposé par l'IA puis reformulé par un auditeur devient
     * indistinguable d'un axe humain.
     */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "origine_initiale", columnDefinition = "origine_axe")
    private OrigineAxe origineInitiale;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "niveau_rattachement", columnDefinition = "niveau_rattachement")
    private NiveauRattachement niveauRattachement;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exigence_id")
    private Exigence exigence;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "preuve_attendue_id")
    private PreuveAttendue preuveAttendue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "regle_analyse_id")
    private RegleAnalyse regleAnalyse;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut", nullable = false, columnDefinition = "statut_axe")
    private StatutAxe statut = StatutAxe.PROPOSE;

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
    @JoinColumn(name = "created_by")
    private Utilisateur creePar;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime creeLe;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime modifieLe;

    protected AxeAmelioration() {
        // JPA
    }

    /**
     * Axe issu d'une recommandation du pipeline.
     *
     * <p>Naît {@code PROPOSE} : c'est le seul état qu'une sortie de modèle
     * peut atteindre sans intervention humaine.
     */
    public static AxeAmelioration proposeParIa(Audit audit, AuditCritere auditCritere,
                                               Evaluation evaluation, String libelle) {
        AxeAmelioration axe = new AxeAmelioration();
        axe.audit = audit;
        axe.auditCritere = auditCritere;
        axe.evaluation = evaluation;
        axe.libelle = libelle;
        axe.origine = OrigineAxe.IA;
        axe.origineInitiale = OrigineAxe.IA;
        axe.statut = StatutAxe.PROPOSE;
        return axe;
    }

    /** Axe saisi par une personne. Il naît lui aussi {@code PROPOSE}. */
    public static AxeAmelioration saisiParHumain(Audit audit, AuditCritere auditCritere, String libelle) {
        AxeAmelioration axe = new AxeAmelioration();
        axe.audit = audit;
        axe.auditCritere = auditCritere;
        axe.libelle = libelle;
        axe.origine = OrigineAxe.HUMAIN;
        axe.origineInitiale = OrigineAxe.HUMAIN;
        axe.statut = StatutAxe.PROPOSE;
        return axe;
    }

    /** Rattache l'axe à un élément du référentiel. Niveau et cible vont ensemble. */
    public void rattacherA(Exigence exigence) {
        this.niveauRattachement = NiveauRattachement.EXIGENCE;
        this.exigence = exigence;
        this.preuveAttendue = null;
        this.regleAnalyse = null;
    }

    public void rattacherA(PreuveAttendue preuveAttendue) {
        this.niveauRattachement = NiveauRattachement.PREUVE_ATTENDUE;
        this.preuveAttendue = preuveAttendue;
        this.exigence = null;
        this.regleAnalyse = null;
    }

    public void rattacherA(RegleAnalyse regleAnalyse) {
        this.niveauRattachement = NiveauRattachement.REGLE;
        this.regleAnalyse = regleAnalyse;
        this.exigence = null;
        this.preuveAttendue = null;
    }

    /**
     * Décision humaine d'accepter l'axe.
     *
     * <p>Le statut et le validateur sont posés ensemble : la base refuse un
     * axe {@code VALIDE} sans validateur, une validation dont personne ne
     * répondrait.
     */
    public void valider(Utilisateur validateur) {
        this.statut = StatutAxe.VALIDE;
        this.valideePar = validateur;
        this.valideeLe = OffsetDateTime.now();
        this.rejeteePar = null;
        this.rejeteeLe = null;
        this.motifRejet = null;
    }

    /** Décision humaine d'écarter l'axe. Le motif est exigé par la base. */
    public void rejeter(Utilisateur decideur, String motif) {
        this.statut = StatutAxe.REJETE;
        this.rejeteePar = decideur;
        this.rejeteeLe = OffsetDateTime.now();
        this.motifRejet = motif;
        this.valideePar = null;
        this.valideeLe = null;
    }

    public UUID getId() {
        return id;
    }

    public Audit getAudit() {
        return audit;
    }

    public AuditCritere getAuditCritere() {
        return auditCritere;
    }

    public Evaluation getEvaluation() {
        return evaluation;
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

    public OrigineAxe getOrigine() {
        return origine;
    }

    public OrigineAxe getOrigineInitiale() {
        return origineInitiale;
    }

    public NiveauRattachement getNiveauRattachement() {
        return niveauRattachement;
    }

    public Exigence getExigence() {
        return exigence;
    }

    public PreuveAttendue getPreuveAttendue() {
        return preuveAttendue;
    }

    public RegleAnalyse getRegleAnalyse() {
        return regleAnalyse;
    }

    public StatutAxe getStatut() {
        return statut;
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

    public Utilisateur getCreePar() {
        return creePar;
    }

    public void setCreePar(Utilisateur creePar) {
        this.creePar = creePar;
    }

    public OffsetDateTime getCreeLe() {
        return creeLe;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AxeAmelioration other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
