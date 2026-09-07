package com.smartexsustway.api.domain.entity;

import jakarta.persistence.*;

import java.util.UUID;

/** Organisation retenue dans un projet, et la mission créée pour elle. */
@Entity
@Table(name = "projet_entreprise")
public class ProjetEntreprise {

    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "projet_id", nullable = false)
    private Projet projet;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "entreprise_id", nullable = false)
    private Entreprise entreprise;

    /** Nulle tant que la mission n'a pas été générée pour cette organisation. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "audit_id")
    private Audit audit;

    protected ProjetEntreprise() {
        // JPA
    }

    public ProjetEntreprise(Projet projet, Entreprise entreprise) {
        this.projet = projet;
        this.entreprise = entreprise;
    }

    public UUID getId() { return id; }
    public Projet getProjet() { return projet; }
    public Entreprise getEntreprise() { return entreprise; }
    public Audit getAudit() { return audit; }
    public void setAudit(Audit audit) { this.audit = audit; }
}
