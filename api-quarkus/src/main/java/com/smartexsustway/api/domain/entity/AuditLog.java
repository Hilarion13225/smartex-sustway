package com.smartexsustway.api.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Correspond à la table {@code audit_log}.
 * RG19 : toute action importante du système est tracée. Exigence §1.4 :
 * couvre aussi les accès en lecture aux documents financiers/RH, pas
 * seulement les modifications.
 *
 * Les FK utilisateur_id/entreprise_id sont ON DELETE SET NULL en base
 * (le journal doit survivre à la suppression de son auteur ou de
 * l'entreprise concernée) — cette entité ne porte donc pas de relation
 * @ManyToOne obligatoire, seulement les identifiants bruts, pour rester
 * simple et éviter tout risque de LazyInitializationException lors de
 * l'écriture (souvent faite dans un contexte transactionnel court).
 */
@Entity
@Table(name = "audit_log")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "utilisateur_id")
    private UUID utilisateurId;

    @Column(name = "entreprise_id")
    private UUID entrepriseId;

    @Column(name = "action", nullable = false, length = 150)
    private String action;

    @Column(name = "entite", nullable = false, length = 100)
    private String entite;

    @Column(name = "entite_id")
    private UUID entiteId;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "text")
    private String userAgent;

    /** Détails libres au format JSON (colonne JSONB). Stocké tel quel, sérialisé par l'appelant. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "details")
    private String details;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected AuditLog() {
        // JPA
    }

    public AuditLog(UUID utilisateurId, UUID entrepriseId, String action, String entite, UUID entiteId) {
        this.utilisateurId = utilisateurId;
        this.entrepriseId = entrepriseId;
        this.action = action;
        this.entite = entite;
        this.entiteId = entiteId;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUtilisateurId() {
        return utilisateurId;
    }

    public UUID getEntrepriseId() {
        return entrepriseId;
    }

    public String getAction() {
        return action;
    }

    public String getEntite() {
        return entite;
    }

    public UUID getEntiteId() {
        return entiteId;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AuditLog other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
