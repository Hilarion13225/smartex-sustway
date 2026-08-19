package com.smartexsustway.api.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;

import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Correspond à la table {@code role} (CDC section 4 : SUPER_ADMIN, ADMIN_AUDIT,
 * EXPERT_REVIEWER, RESPONSABLE_ENTREPRISE, EMPLOYE, VISITEUR).
 * La table de liaison {@code role_permission} (pure, sans colonne propre) est
 * modélisée directement via {@code @ManyToMany}, sans entité de jointure dédiée.
 */
@Entity
@Table(name = "role")
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "nom", nullable = false, length = 150)
    private String nom;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "role_permission",
            joinColumns = @JoinColumn(name = "role_id"),
            inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    private Set<Permission> permissions = new HashSet<>();

    protected Role() {
        // JPA
    }

    public Role(String code, String nom, String description) {
        this.code = code;
        this.nom = nom;
        this.description = description;
    }

    public UUID getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Set<Permission> getPermissions() {
        return permissions;
    }

    public void ajouterPermission(Permission permission) {
        this.permissions.add(permission);
    }

    public void retirerPermission(Permission permission) {
        this.permissions.remove(permission);
    }

    /** Utilisé par le RBAC centralisé (voir security.AutorisationService) pour éviter les vérifications dispersées. */
    public boolean possede(String codePermission) {
        return permissions.stream().anyMatch(p -> p.getCode().equals(codePermission));
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Role other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
