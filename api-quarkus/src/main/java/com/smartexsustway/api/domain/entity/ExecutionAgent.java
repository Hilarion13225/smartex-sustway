package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.StatutExecutionAgent;
import com.smartexsustway.api.domain.enums.TypeAgentIa;
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
 * Un appel au fournisseur de modèle — pas un agent.
 *
 * <p>La distinction compte : le Document Agent effectue <em>un appel par
 * pièce</em>. Une contrainte d'unicité sur {@code (analyse_ia_id, agent)}
 * interdirait de tracer huit lectures documentaires ; elle n'est
 * volontairement pas posée, et c'est {@link #pieceReference} qui distingue
 * les appels d'un même agent.
 *
 * <p>Les champs de métadonnées reprennent un à un ceux que
 * l'instrumentation Python produit ({@code AppelTrace}, phase 5.6). Ils
 * sont tous nullables : un appel en échec n'a ni modèle servi, ni
 * {@code responseId}, ni jetons — et c'est une information, pas une lacune
 * à combler par zéro.
 *
 * <p><strong>Ne portent jamais :</strong> prompt, contenu de document,
 * réponse brute, secret. {@code erreurMessage} arrive déjà assaini.
 */
@Entity
@Table(name = "execution_agent")
public class ExecutionAgent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "analyse_ia_id", nullable = false)
    private AnalyseIa analyseIa;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "agent", nullable = false, columnDefinition = "type_agent_ia")
    private TypeAgentIa agent;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut", nullable = false, columnDefinition = "statut_execution_agent")
    private StatutExecutionAgent statut = StatutExecutionAgent.EN_ATTENTE;

    /**
     * Référence locale de la pièce, pour les appels documentaires. Ce n'est
     * pas une clé : elle n'a de sens qu'à l'intérieur de sa passe.
     */
    @Column(name = "piece_reference", length = 16)
    private String pieceReference;

    /**
     * Le modèle qui a réellement répondu. S'il diffère du modèle demandé,
     * c'est lui qui fait foi — le fournisseur a le droit de servir autre
     * chose que ce qu'on lui demande.
     */
    @Column(name = "served_model", length = 64)
    private String servedModel;

    /** Seul ancrage permettant une réclamation auprès du fournisseur. */
    @Column(name = "response_id", length = 64)
    private String responseId;

    /** Mesurée côté Python sur une horloge monotone, jamais déduite. */
    @Column(name = "duration_ms")
    private Integer dureeMs;

    @Column(name = "prompt_token_count")
    private Integer jetonsPrompt;

    @Column(name = "candidates_token_count")
    private Integer jetonsReponse;

    @Column(name = "total_token_count")
    private Integer jetonsTotal;

    @Column(name = "erreur_type", length = 40)
    private String erreurType;

    /** Message assaini : jamais de secret, d'URL authentifiée ni de contenu. */
    @Column(name = "erreur_message", columnDefinition = "text")
    private String erreurMessage;

    @Column(name = "date_debut")
    private OffsetDateTime dateDebut;

    @Column(name = "date_fin")
    private OffsetDateTime dateFin;

    protected ExecutionAgent() {
        // JPA
    }

    public ExecutionAgent(AnalyseIa analyseIa, TypeAgentIa agent, StatutExecutionAgent statut) {
        this.analyseIa = analyseIa;
        this.agent = agent;
        this.statut = statut;
    }

    public UUID getId() {
        return id;
    }

    public AnalyseIa getAnalyseIa() {
        return analyseIa;
    }

    public TypeAgentIa getAgent() {
        return agent;
    }

    public StatutExecutionAgent getStatut() {
        return statut;
    }

    public void setStatut(StatutExecutionAgent statut) {
        this.statut = statut;
    }

    public String getPieceReference() {
        return pieceReference;
    }

    public void setPieceReference(String pieceReference) {
        this.pieceReference = pieceReference;
    }

    public String getServedModel() {
        return servedModel;
    }

    public void setServedModel(String servedModel) {
        this.servedModel = servedModel;
    }

    public String getResponseId() {
        return responseId;
    }

    public void setResponseId(String responseId) {
        this.responseId = responseId;
    }

    public Integer getDureeMs() {
        return dureeMs;
    }

    public void setDureeMs(Integer dureeMs) {
        this.dureeMs = dureeMs;
    }

    public Integer getJetonsPrompt() {
        return jetonsPrompt;
    }

    public void setJetonsPrompt(Integer jetonsPrompt) {
        this.jetonsPrompt = jetonsPrompt;
    }

    public Integer getJetonsReponse() {
        return jetonsReponse;
    }

    public void setJetonsReponse(Integer jetonsReponse) {
        this.jetonsReponse = jetonsReponse;
    }

    public Integer getJetonsTotal() {
        return jetonsTotal;
    }

    public void setJetonsTotal(Integer jetonsTotal) {
        this.jetonsTotal = jetonsTotal;
    }

    public String getErreurType() {
        return erreurType;
    }

    public void setErreurType(String erreurType) {
        this.erreurType = erreurType;
    }

    public String getErreurMessage() {
        return erreurMessage;
    }

    public void setErreurMessage(String erreurMessage) {
        this.erreurMessage = erreurMessage;
    }

    public OffsetDateTime getDateDebut() {
        return dateDebut;
    }

    public void setDateDebut(OffsetDateTime dateDebut) {
        this.dateDebut = dateDebut;
    }

    public OffsetDateTime getDateFin() {
        return dateFin;
    }

    public void setDateFin(OffsetDateTime dateFin) {
        this.dateFin = dateFin;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ExecutionAgent other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
