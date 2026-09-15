package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.NiveauNonConformite;
import com.smartexsustway.api.domain.enums.StatutNonConformite;
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

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Correspond à la table {@code non_conforme}.
 * RG17 : une évaluation peut générer zéro, une ou plusieurs non-conformités.
 * {@code niveau} et {@code risqueAttendu} sont dérivés de ScoringEngine
 * (RG26 : risqueAttendu = (1 - probabilité de conformité) x poids de
 * criticité ; niveau = prioriteNonConformite(risqueAttendu)) — voir
 * NonConformiteService, seul point de création de cette entité.
 *
 * <p><strong>L'identité logique est le critère, pas l'évaluation.</strong>
 * Un écart sur un critère reste le même écart, qu'on l'ait constaté une
 * fois ou cinq. La table portait pourtant {@code evaluation_id} seul, donc
 * un rattachement à un <em>instantané</em> : chaque ré-analyse créait une
 * non-conformité de plus, avec le même titre. La base en comptait 39 pour
 * 22 critères.
 *
 * <p>{@link #auditCritere} porte désormais l'identité et {@link #courante}
 * distingue l'état actuel de l'historique. Un index unique partiel
 * garantit qu'un critère n'a qu'une non-conformité courante, sans interdire
 * les lignes historiques — c'est ce qui a permis de corriger l'invariant
 * sans supprimer une seule ligne.
 *
 * <p>{@link #evaluation} est conservé : il devient « l'évaluation qui a
 * produit l'état courant », information de traçabilité toujours utile.
 */
@Entity
@Table(name = "non_conforme")
public class NonConforme {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "evaluation_id", nullable = false)
    private Evaluation evaluation;

    @Column(name = "titre", nullable = false, length = 255)
    private String titre;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "niveau", nullable = false, columnDefinition = "niveau_non_conformite")
    private NiveauNonConformite niveau;

    @Column(name = "risque_attendu", precision = 6, scale = 4)
    private BigDecimal risqueAttendu;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut", nullable = false, columnDefinition = "statut_non_conformite")
    private StatutNonConformite statut = StatutNonConformite.OUVERTE;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    /**
     * Identité logique de l'écart. Dénormalisé volontairement : un index
     * unique ne traverse pas de jointure, et atteindre le critère via
     * l'évaluation rendrait l'unicité impossible à imposer en base.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "audit_critere_id")
    private AuditCritere auditCritere;

    /**
     * Vrai pour la non-conformité qui représente l'état actuel du critère.
     * Les lignes historiques restent en base avec {@code false} — rien
     * n'est jamais supprimé.
     */
    @Column(name = "courante", nullable = false)
    private boolean courante = true;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    protected NonConforme() {
        // JPA
    }

    public NonConforme(Evaluation evaluation, String titre, String description,
                        NiveauNonConformite niveau, BigDecimal risqueAttendu) {
        this.evaluation = evaluation;
        this.auditCritere = evaluation == null ? null : evaluation.getAuditCritere();
        this.titre = titre;
        this.description = description;
        this.niveau = niveau;
        this.risqueAttendu = risqueAttendu;
    }

    /**
     * Réactualise l'écart depuis une nouvelle évaluation du même critère.
     *
     * <p>Le statut métier n'est <strong>pas</strong> touché : une
     * non-conformité en cours de traitement, avec ses actions correctives
     * rattachées, ne doit pas être ramenée à l'état ouvert parce qu'une
     * analyse a été relancée.
     */
    public void actualiserDepuis(Evaluation evaluation, String description,
                                 NiveauNonConformite niveau, BigDecimal risqueAttendu) {
        this.evaluation = evaluation;
        this.description = description;
        this.niveau = niveau;
        this.risqueAttendu = risqueAttendu;
    }

    /** Sort la non-conformité de l'état courant, sans la supprimer. */
    public void archiver() {
        this.courante = false;
    }

    public UUID getId() {
        return id;
    }

    public Evaluation getEvaluation() {
        return evaluation;
    }

    public String getTitre() {
        return titre;
    }

    public String getDescription() {
        return description;
    }

    public NiveauNonConformite getNiveau() {
        return niveau;
    }

    public BigDecimal getRisqueAttendu() {
        return risqueAttendu;
    }

    public StatutNonConformite getStatut() {
        return statut;
    }

    public void setStatut(StatutNonConformite statut) {
        this.statut = statut;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public AuditCritere getAuditCritere() {
        return auditCritere;
    }

    public boolean isCourante() {
        return courante;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof NonConforme other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
