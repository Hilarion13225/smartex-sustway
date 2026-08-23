package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.StatutInvitation;
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
 * Correspond à la table {@code invitation} — invitation d'un collaborateur
 * qui ne possède pas encore de compte Smartex Sustway (RG05). Contrairement
 * au rattachement direct (MembreEntrepriseResource.ajouter, réservé aux
 * emails déjà inscrits), l'invitation porte le rôle et le site choisis à
 * l'avance : ils sont appliqués automatiquement à l'acceptation, sans que
 * l'invité n'ait à les ressaisir.
 *
 * Le token est un identifiant opaque (pas un JWT) : révocable simplement en
 * marquant la ligne REVOQUEE, sans dépendre d'une liste de blocage.
 */
@Entity
@Table(name = "invitation")
public class Invitation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "entreprise_id", nullable = false)
    private Entreprise entreprise;

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id")
    private Site site;

    @Column(name = "token", nullable = false, unique = true, length = 64)
    private String token;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invite_par_id", nullable = false)
    private Utilisateur invitePar;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut", nullable = false, columnDefinition = "statut_invitation")
    private StatutInvitation statut = StatutInvitation.EN_ATTENTE;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "expire_at", nullable = false)
    private OffsetDateTime expireAt;

    protected Invitation() {
        // JPA
    }

    public Invitation(Entreprise entreprise, String email, Role role, Site site, String token,
                       Utilisateur invitePar, OffsetDateTime expireAt) {
        this.entreprise = entreprise;
        this.email = email;
        this.role = role;
        this.site = site;
        this.token = token;
        this.invitePar = invitePar;
        this.expireAt = expireAt;
    }

    public boolean estValide() {
        return statut == StatutInvitation.EN_ATTENTE && expireAt.isAfter(OffsetDateTime.now());
    }

    public UUID getId() {
        return id;
    }

    public Entreprise getEntreprise() {
        return entreprise;
    }

    public String getEmail() {
        return email;
    }

    public Role getRole() {
        return role;
    }

    public Site getSite() {
        return site;
    }

    public String getToken() {
        return token;
    }

    public Utilisateur getInvitePar() {
        return invitePar;
    }

    public StatutInvitation getStatut() {
        return statut;
    }

    public void setStatut(StatutInvitation statut) {
        this.statut = statut;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getExpireAt() {
        return expireAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Invitation other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
