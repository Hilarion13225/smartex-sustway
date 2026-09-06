package com.smartexsustway.api.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Code à usage unique d'activation de compte (RG36).
 *
 * Le code lui-même n'est jamais stocké : seule son empreinte l'est, comme
 * pour un mot de passe. Sa durée de vie est courte et ses essais sont
 * comptés, un code à six chiffres étant sinon devinable par force brute.
 */
@Entity
@Table(name = "code_verification_email")
public class CodeVerificationEmail {

    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "utilisateur_id", nullable = false)
    private Utilisateur utilisateur;

    @Column(name = "code_hash", nullable = false, columnDefinition = "text")
    private String codeHash;

    @Column(name = "expire_le", nullable = false)
    private OffsetDateTime expireLe;

    @Column(name = "tentatives", nullable = false)
    private short tentatives;

    @Column(name = "consomme_le")
    private OffsetDateTime consommeLe;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected CodeVerificationEmail() {
        // JPA
    }

    public CodeVerificationEmail(Utilisateur utilisateur, String codeHash, OffsetDateTime expireLe) {
        this.utilisateur = utilisateur;
        this.codeHash = codeHash;
        this.expireLe = expireLe;
    }

    public UUID getId() {
        return id;
    }

    public Utilisateur getUtilisateur() {
        return utilisateur;
    }

    public String getCodeHash() {
        return codeHash;
    }

    public OffsetDateTime getExpireLe() {
        return expireLe;
    }

    public short getTentatives() {
        return tentatives;
    }

    public void incrementerTentatives() {
        this.tentatives++;
    }

    public OffsetDateTime getConsommeLe() {
        return consommeLe;
    }

    public void consommer() {
        this.consommeLe = OffsetDateTime.now();
    }

    /** Un code périmé, déjà utilisé ou trop souvent tenté ne vaut plus rien. */
    public boolean estUtilisable(int tentativesMax) {
        return consommeLe == null
                && tentatives < tentativesMax
                && expireLe.isAfter(OffsetDateTime.now());
    }
}
