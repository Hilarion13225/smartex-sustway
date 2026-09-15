package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.SourceEvaluation;
import com.smartexsustway.api.domain.enums.StatutEvaluation;
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
import java.util.Objects;
import java.util.UUID;

/**
 * Correspond à la table {@code evaluation}.
 * RG14 : historique complet (probabilité, note dérivée, justification,
 * auteur, date, version référentiel). RG27 : la note n'est JAMAIS saisie
 * directement par l'IA — {@code note} est toujours calculée côté Quarkus
 * via ScoringEngine.noteObtenue(...), à partir de la probabilité renvoyée
 * par le pipeline Python (voir EvaluationResource). RG38 : {@code confianceIa}
 * inférieure au seuil (0,80) déclenche une revue experte (formule Avancées).
 */
@Entity
@Table(name = "evaluation")
public class Evaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "audit_critere_id", nullable = false)
    private AuditCritere auditCritere;

    @Column(name = "probabilite_conforme", nullable = false, precision = 5, scale = 4)
    private BigDecimal probabiliteConforme;

    @Column(name = "note", nullable = false)
    private short note;

    @Column(name = "confiance_ia", precision = 5, scale = 4)
    private BigDecimal confianceIa;

    /**
     * Jugement de l'IA sur la suffisance des preuves fournies. Null pour une
     * évaluation saisie par un humain, qui n'émet pas ce jugement.
     */
    @Column(name = "couverture_preuve")
    private Boolean couverturePreuve;

    /**
     * Niveau déclaré par l'entreprise au moment de l'analyse. Comparé à la
     * note, il montre la rectification opérée au vu des preuves. Null pour une
     * saisie humaine, qui est elle-même la déclaration.
     */
    @Column(name = "niveau_declare")
    private Short niveauDeclare;

    @Column(name = "justification", columnDefinition = "text")
    private String justification;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "source", nullable = false, columnDefinition = "source_evaluation")
    private SourceEvaluation source = SourceEvaluation.IA;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "auteur_id")
    private Utilisateur auteur;

    @CreationTimestamp
    @Column(name = "date_evaluation", nullable = false, updatable = false)
    private OffsetDateTime dateEvaluation;

    @Column(name = "version_referentiel", length = 20)
    private String versionReferentiel;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut", nullable = false, columnDefinition = "statut_evaluation")
    private StatutEvaluation statut = StatutEvaluation.PROVISOIRE;

    // Risk Agent (CDC §10, formule Avancées) : signal d'anomalie détecté
    // dans le contenu des preuves. Distinct du risque attendu déterministe
    // (RG26, calculé côté ScoringEngine à partir de la criticité) — ce
    // champ ne participe à aucun calcul de score ni de priorité, il sert
    // uniquement de signal informatif pour l'expert et le Recommendation
    // Agent. Null si le pipeline n'a pas exécuté le Risk Agent (formule
    // Standard).
    @Column(name = "signal_risque")
    private Boolean signalRisque;

    @Column(name = "categorie_risque", length = 50)
    private String categorieRisque;

    @Column(name = "justification_risque", columnDefinition = "text")
    private String justificationRisque;

    // Recommendation Agent (CDC §10, formule Avancées) : pistes
    // d'amélioration concrètes proposées pour ce critère. Portée limitée
    // à ce lot (Phase E) — la génération automatique de non-conformités
    // et d'actions correctives (module 11) est prévue en Phase G et
    // s'appuiera sur les tables non_conforme/action_corrective, déjà en
    // base mais non encore alimentées. Null si le Recommendation Agent
    // n'a pas été exécuté (formule Standard).
    @Column(name = "recommandation_necessaire")
    private Boolean recommandationNecessaire;

    @Column(name = "pistes_amelioration", columnDefinition = "text")
    private String pistesAmelioration;

    // === Contrat IA V2 ===================================================

    /**
     * Version du référentiel épinglée au moment de l'évaluation.
     *
     * <p>L'information est déjà dérivable — {@code audit.referentielVersion}
     * est obligatoire et immuable, l'entité {@link Audit} ne l'expose qu'en
     * lecture. Ce champ n'est donc pas une correction mais une assurance :
     * il rend l'évaluation auto-descriptive, et si une évolution permettait
     * un jour de faire migrer une mission d'une version à l'autre, les
     * évaluations passées resteraient rattachées à la version sous laquelle
     * elles ont réellement été rendues.
     *
     * <p>Nul sur les évaluations antérieures à V2 : la valeur n'est pas
     * reconstituable avec certitude, et une valeur dérivée aurait une
     * autorité qu'elle n'a pas.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "referentiel_version_id")
    private ReferentielVersion referentielVersion;

    /**
     * L'exécution du pipeline qui a produit ce résultat. Nulle si la trace
     * technique a été purgée — le résultat métier lui survit.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "analyse_ia_id")
    private AnalyseIa analyseIa;

    /**
     * Version du contrat IA. {@code null} sur les évaluations antérieures
     * au contrat V2 — c'est ce qui les distingue sans qu'aucune ligne
     * n'ait eu besoin d'être réécrite.
     */
    @Column(name = "contrat_version", length = 10)
    private String contratVersion;

    /**
     * Confiance du Risk Agent, distincte de {@link #confianceIa} qui porte
     * celle de l'agent de conformité : les deux se prononcent sur des
     * choses différentes et n'ont aucune raison d'être aussi sûrs.
     */
    @Column(name = "confiance_risque", precision = 5, scale = 4)
    private BigDecimal confianceRisque;

    /** Pourquoi les preuves sont jugées suffisantes ou non. */
    @Column(name = "justification_couverture", columnDefinition = "text")
    private String justificationCouverture;

    /**
     * Qui a fait passer l'évaluation de {@code EN_REVUE} à {@code VALIDEE}.
     *
     * <p>Nul sur les 44 évaluations historiques, que le code validait
     * lui-même au titre de RG16. La base n'exige un validateur que sur les
     * évaluations portant un {@code contratVersion} — la règle nouvelle ne
     * s'applique pas rétroactivement à des faits anciens.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "validee_par")
    private Utilisateur valideePar;

    @Column(name = "validee_le")
    private OffsetDateTime valideeLe;

    protected Evaluation() {
        // JPA
    }

    public Evaluation(AuditCritere auditCritere, BigDecimal probabiliteConforme, short note) {
        this.auditCritere = auditCritere;
        this.probabiliteConforme = probabiliteConforme;
        this.note = note;
    }

    public UUID getId() {
        return id;
    }

    public AuditCritere getAuditCritere() {
        return auditCritere;
    }

    public BigDecimal getProbabiliteConforme() {
        return probabiliteConforme;
    }

    public short getNote() {
        return note;
    }

    public BigDecimal getConfianceIa() {
        return confianceIa;
    }

    public void setConfianceIa(BigDecimal confianceIa) {
        this.confianceIa = confianceIa;
    }

    public Short getNiveauDeclare() {
        return niveauDeclare;
    }

    public void setNiveauDeclare(Short niveauDeclare) {
        this.niveauDeclare = niveauDeclare;
    }

    public Boolean getCouverturePreuve() {
        return couverturePreuve;
    }

    public void setCouverturePreuve(Boolean couverturePreuve) {
        this.couverturePreuve = couverturePreuve;
    }

    public String getJustification() {
        return justification;
    }

    public void setJustification(String justification) {
        this.justification = justification;
    }

    public SourceEvaluation getSource() {
        return source;
    }

    public void setSource(SourceEvaluation source) {
        this.source = source;
    }

    public Utilisateur getAuteur() {
        return auteur;
    }

    public void setAuteur(Utilisateur auteur) {
        this.auteur = auteur;
    }

    public OffsetDateTime getDateEvaluation() {
        return dateEvaluation;
    }

    public String getVersionReferentiel() {
        return versionReferentiel;
    }

    public void setVersionReferentiel(String versionReferentiel) {
        this.versionReferentiel = versionReferentiel;
    }

    public StatutEvaluation getStatut() {
        return statut;
    }

    public void setStatut(StatutEvaluation statut) {
        this.statut = statut;
    }

    public Boolean getSignalRisque() {
        return signalRisque;
    }

    public void setSignalRisque(Boolean signalRisque) {
        this.signalRisque = signalRisque;
    }

    public String getCategorieRisque() {
        return categorieRisque;
    }

    public void setCategorieRisque(String categorieRisque) {
        this.categorieRisque = categorieRisque;
    }

    public String getJustificationRisque() {
        return justificationRisque;
    }

    public void setJustificationRisque(String justificationRisque) {
        this.justificationRisque = justificationRisque;
    }

    public Boolean getRecommandationNecessaire() {
        return recommandationNecessaire;
    }

    public void setRecommandationNecessaire(Boolean recommandationNecessaire) {
        this.recommandationNecessaire = recommandationNecessaire;
    }

    public String getPistesAmelioration() {
        return pistesAmelioration;
    }

    public void setPistesAmelioration(String pistesAmelioration) {
        this.pistesAmelioration = pistesAmelioration;
    }

    // === Contrat IA V2 ===================================================

    public ReferentielVersion getReferentielVersion() {
        return referentielVersion;
    }

    public void setReferentielVersion(ReferentielVersion referentielVersion) {
        this.referentielVersion = referentielVersion;
    }

    public AnalyseIa getAnalyseIa() {
        return analyseIa;
    }

    public void setAnalyseIa(AnalyseIa analyseIa) {
        this.analyseIa = analyseIa;
    }

    public String getContratVersion() {
        return contratVersion;
    }

    public void setContratVersion(String contratVersion) {
        this.contratVersion = contratVersion;
    }

    public BigDecimal getConfianceRisque() {
        return confianceRisque;
    }

    public void setConfianceRisque(BigDecimal confianceRisque) {
        this.confianceRisque = confianceRisque;
    }

    public String getJustificationCouverture() {
        return justificationCouverture;
    }

    public void setJustificationCouverture(String justificationCouverture) {
        this.justificationCouverture = justificationCouverture;
    }

    public Utilisateur getValideePar() {
        return valideePar;
    }

    public OffsetDateTime getValideeLe() {
        return valideeLe;
    }

    /**
     * Fait passer l'évaluation à {@code VALIDEE} par décision humaine.
     *
     * <p>Statut et validateur sont posés ensemble, jamais séparément : la
     * base refuse une évaluation V2 validée sans validateur, c'est-à-dire
     * une validation dont personne ne répondrait. Le score officiel
     * n'intègre que les évaluations dans cet état.
     */
    public void validerPar(Utilisateur validateur) {
        this.statut = StatutEvaluation.VALIDEE;
        this.valideePar = validateur;
        this.valideeLe = OffsetDateTime.now();
    }

    /** Vrai si l'évaluation provient du pipeline V2, faux pour l'historique. */
    public boolean issueDuContratV2() {
        return contratVersion != null;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Evaluation other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
