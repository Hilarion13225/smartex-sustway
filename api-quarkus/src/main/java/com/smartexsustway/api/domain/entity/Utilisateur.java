package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.MethodeDeuxFa;
import com.smartexsustway.api.domain.enums.StatutUtilisateur;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Correspond à la table {@code utilisateur}.
 * RG36 : compte activé uniquement après vérification de l'email ; 2FA optionnelle.
 * Le mot de passe n'est jamais stocké en clair (voir security.PasswordService, hachage BCrypt).
 */
@Entity
@Table(name = "utilisateur")
public class Utilisateur {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "nom", nullable = false, length = 150)
    private String nom;

    @Column(name = "prenom", nullable = false, length = 150)
    private String prenom;

    @Column(name = "email", nullable = false, unique = true, columnDefinition = "citext")
    private String email;

    /** Hash BCrypt — jamais le mot de passe en clair. */
    @Column(name = "mot_de_passe_hash", nullable = false, columnDefinition = "text")
    private String motDePasseHash;

    @Column(name = "email_verifie", nullable = false)
    private boolean emailVerifie = false;

    @Column(name = "deuxfa_active", nullable = false)
    private boolean deuxfaActive = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "deuxfa_methode", length = 20)
    private MethodeDeuxFa deuxfaMethode;

    /** Secret TOTP (base32), méthode APP uniquement — jamais exposé via un DTO. */
    @Column(name = "deuxfa_secret", length = 64)
    private String deuxfaSecret;

    /** Nécessaire pour la méthode SMS — nullable, renseigné à l'activation de la 2FA. */
    @Column(name = "telephone", length = 20)
    private String telephone;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut", nullable = false, columnDefinition = "statut_utilisateur")
    private StatutUtilisateur statut = StatutUtilisateur.EN_ATTENTE_VERIFICATION;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected Utilisateur() {
        // JPA
    }

    public Utilisateur(String nom, String prenom, String email, String motDePasseHash) {
        this.nom = nom;
        this.prenom = prenom;
        this.email = email;
        this.motDePasseHash = motDePasseHash;
    }

    public UUID getId() {
        return id;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getPrenom() {
        return prenom;
    }

    public void setPrenom(String prenom) {
        this.prenom = prenom;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getMotDePasseHash() {
        return motDePasseHash;
    }

    public void setMotDePasseHash(String motDePasseHash) {
        this.motDePasseHash = motDePasseHash;
    }

    public boolean isEmailVerifie() {
        return emailVerifie;
    }

    /** RG36 : active le compte lorsque l'email est vérifié (le statut doit être mis à jour en cohérence par l'appelant). */
    public void marquerEmailVerifie() {
        this.emailVerifie = true;
        if (this.statut == StatutUtilisateur.EN_ATTENTE_VERIFICATION) {
            this.statut = StatutUtilisateur.ACTIF;
        }
    }

    public boolean isDeuxfaActive() {
        return deuxfaActive;
    }

    /**
     * Étape 1/2 de l'activation de la 2FA : enregistre la méthode et le
     * secret (APP uniquement — null pour SMS, qui n'a pas besoin de secret
     * persistant). {@code deuxfaActive} reste volontairement à false tant
     * que {@link #confirmerActivationDeuxFa()} n'a pas été appelé — on ne
     * doit jamais activer une 2FA dont l'utilisateur n'a pas prouvé qu'il
     * sait produire un code valide (risque de se verrouiller lui-même hors
     * de son compte).
     */
    public void demarrerActivationDeuxFa(MethodeDeuxFa methode, String secret) {
        this.deuxfaMethode = methode;
        this.deuxfaSecret = secret;
    }

    /** Étape 2/2 : à appeler uniquement après vérification réussie d'un code. */
    public void confirmerActivationDeuxFa() {
        this.deuxfaActive = true;
    }

    public void desactiverDeuxFa() {
        this.deuxfaActive = false;
        this.deuxfaMethode = null;
        this.deuxfaSecret = null;
    }

    public MethodeDeuxFa getDeuxfaMethode() {
        return deuxfaMethode;
    }

    public String getDeuxfaSecret() {
        return deuxfaSecret;
    }

    public String getTelephone() {
        return telephone;
    }

    public void setTelephone(String telephone) {
        this.telephone = telephone;
    }

    public StatutUtilisateur getStatut() {
        return statut;
    }

    public void setStatut(StatutUtilisateur statut) {
        this.statut = statut;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Utilisateur other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
