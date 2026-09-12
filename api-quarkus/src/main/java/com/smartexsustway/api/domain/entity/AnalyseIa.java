package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.FormulePipeline;
import com.smartexsustway.api.domain.enums.StatutPipeline;
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

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Une exécution du pipeline d'agents — la passe, pas son résultat.
 *
 * <p>La distinction avec {@link Evaluation} est le point de tout ce
 * modèle : une analyse représente ce qui s'est <em>passé</em>, une
 * évaluation ce qui a été <em>conclu</em>. Une passe qui échoue produit une
 * {@code AnalyseIa} et aucune {@code Evaluation} — c'est précisément ce
 * cas-là qu'il fallait pouvoir tracer, et que rien ne traçait.
 *
 * <p>La table existe depuis longtemps et n'avait jamais été mappée : aucune
 * entité, aucun dépôt, zéro ligne.
 *
 * <p><strong>Ne portent jamais :</strong> prompt, contenu de document,
 * jeton, clé d'API, secret. {@code erreur} est un texte assaini par le
 * service Python avant d'être transmis (phase 5.6).
 */
@Entity
@Table(name = "analyse_ia")
public class AnalyseIa {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "audit_id", nullable = false)
    private Audit audit;

    /**
     * Critère analysé. Nul si la passe a échoué avant de le résoudre — une
     * analyse peut échouer sur la configuration du fournisseur, donc avant
     * d'avoir rien décidé.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "audit_critere_id")
    private AuditCritere auditCritere;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut", nullable = false, columnDefinition = "statut_pipeline")
    private StatutPipeline statut = StatutPipeline.EN_ATTENTE;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "formule", nullable = false, columnDefinition = "formule_pipeline")
    private FormulePipeline formule;

    @Column(name = "date_debut")
    private OffsetDateTime dateDebut;

    @Column(name = "date_fin")
    private OffsetDateTime dateFin;

    /** Cause technique, toujours assainie. Jamais de secret ni de contenu client. */
    @Column(name = "erreur", columnDefinition = "text")
    private String erreur;

    /** Catégorie d'erreur du fournisseur, telle que classée en phase 5.6. */
    @Column(name = "erreur_type", length = 40)
    private String erreurType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "declenche_par")
    private Utilisateur declenchePar;

    /**
     * Modèle demandé, constant sur toute la passe. Le modèle réellement
     * servi peut varier d'un appel à l'autre : il est porté par
     * {@link ExecutionAgent}, pas ici.
     */
    @Column(name = "requested_model", length = 64)
    private String requestedModel;

    @Column(name = "contrat_version", length = 10)
    private String contratVersion;

    @Column(name = "contrat_execution_version", length = 10)
    private String contratExecutionVersion;

    protected AnalyseIa() {
        // JPA
    }

    public AnalyseIa(Audit audit, AuditCritere auditCritere, FormulePipeline formule) {
        this.audit = audit;
        this.auditCritere = auditCritere;
        this.formule = formule;
        this.statut = StatutPipeline.EN_COURS;
        this.dateDebut = OffsetDateTime.now();
    }

    /** Clôture la passe sur un succès. */
    public void terminer() {
        this.statut = StatutPipeline.TERMINE;
        this.dateFin = OffsetDateTime.now();
    }

    /**
     * Clôture la passe sur un échec.
     *
     * @param erreurAssainie message déjà débarrassé de tout secret
     */
    public void echouer(String erreurType, String erreurAssainie) {
        this.statut = StatutPipeline.ERREUR;
        this.erreurType = erreurType;
        this.erreur = erreurAssainie;
        this.dateFin = OffsetDateTime.now();
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

    public void setAuditCritere(AuditCritere auditCritere) {
        this.auditCritere = auditCritere;
    }

    public StatutPipeline getStatut() {
        return statut;
    }

    public void setStatut(StatutPipeline statut) {
        this.statut = statut;
    }

    public FormulePipeline getFormule() {
        return formule;
    }

    public OffsetDateTime getDateDebut() {
        return dateDebut;
    }

    public OffsetDateTime getDateFin() {
        return dateFin;
    }

    public String getErreur() {
        return erreur;
    }

    public String getErreurType() {
        return erreurType;
    }

    public Utilisateur getDeclenchePar() {
        return declenchePar;
    }

    public void setDeclenchePar(Utilisateur declenchePar) {
        this.declenchePar = declenchePar;
    }

    public String getRequestedModel() {
        return requestedModel;
    }

    public void setRequestedModel(String requestedModel) {
        this.requestedModel = requestedModel;
    }

    public String getContratVersion() {
        return contratVersion;
    }

    public void setContratVersion(String contratVersion) {
        this.contratVersion = contratVersion;
    }

    public String getContratExecutionVersion() {
        return contratExecutionVersion;
    }

    public void setContratExecutionVersion(String contratExecutionVersion) {
        this.contratExecutionVersion = contratExecutionVersion;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AnalyseIa other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
