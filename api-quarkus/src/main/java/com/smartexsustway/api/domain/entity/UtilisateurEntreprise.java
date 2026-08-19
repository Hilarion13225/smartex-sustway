package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.StatutGenerique;
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

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Correspond à la table {@code utilisateur_entreprise} — rattachement RBAC
 * d'un utilisateur à une entreprise (et optionnellement un site précis).
 *
 * RG05 : rattachement utilisateur/entreprise. Le site est volontairement
 * optionnel : un utilisateur peut être rattaché à l'entreprise entière.
 * Voir database/migrations/002_fix_utilisateur_entreprise_pk.sql — la clé
 * primaire composite d'origine (utilisateur_id, entreprise_id, site_id)
 * rendait site_id implicitement NOT NULL en PostgreSQL, ce qui contredisait
 * cette règle ; corrigé par une clé de substitution {@code id} + deux index
 * d'unicité partielle (avec/sans site) qui reproduisent la même contrainte
 * métier au niveau base de données. Cette entité n'a donc pas de contrainte
 * d'unicité déclarée côté JPA : elle est appliquée en base, pas en mémoire.
 */
@Entity
@Table(name = "utilisateur_entreprise")
public class UtilisateurEntreprise {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "utilisateur_id", nullable = false)
    private Utilisateur utilisateur;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "entreprise_id", nullable = false)
    private Entreprise entreprise;

    /** Optionnel : absent si l'utilisateur est rattaché à l'entreprise entière. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id")
    private Site site;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @CreationTimestamp
    @Column(name = "date_affectation", nullable = false, updatable = false)
    private OffsetDateTime dateAffectation;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut", nullable = false, columnDefinition = "statut_generique")
    private StatutGenerique statut = StatutGenerique.ACTIF;

    protected UtilisateurEntreprise() {
        // JPA
    }

    public UtilisateurEntreprise(Utilisateur utilisateur, Entreprise entreprise, Site site, Role role) {
        this.utilisateur = utilisateur;
        this.entreprise = entreprise;
        this.site = site;
        this.role = role;
    }

    public UUID getId() {
        return id;
    }

    public Utilisateur getUtilisateur() {
        return utilisateur;
    }

    public Entreprise getEntreprise() {
        return entreprise;
    }

    public Site getSite() {
        return site;
    }

    public void setSite(Site site) {
        this.site = site;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public OffsetDateTime getDateAffectation() {
        return dateAffectation;
    }

    public StatutGenerique getStatut() {
        return statut;
    }

    public void setStatut(StatutGenerique statut) {
        this.statut = statut;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UtilisateurEntreprise other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
