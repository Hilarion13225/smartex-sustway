package com.smartexsustway.api.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.util.UUID;

/**
 * Regroupement intermédiaire à l'intérieur d'un domaine.
 *
 * Facultatif : les grilles SFI et PRI n'en comportent aucun, là où la grille
 * de durabilité en compte dix-huit. Un critère peut donc être rattaché
 * directement à son domaine.
 */
@Entity
@Table(name = "sous_domaine")
public class SousDomaine {

    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "domaine_id", nullable = false)
    private Domaine domaine;

    @Column(name = "code", nullable = false, length = 30)
    private String code;

    @Column(name = "nom", nullable = false, length = 300)
    private String nom;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "ordre", nullable = false)
    private int ordre;

    protected SousDomaine() {
        // JPA
    }

    public SousDomaine(Domaine domaine, String code, String nom, int ordre) {
        this.domaine = domaine;
        this.code = code;
        this.nom = nom;
        this.ordre = ordre;
    }

    public UUID getId() {
        return id;
    }

    public Domaine getDomaine() {
        return domaine;
    }

    public String getCode() {
        return code;
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

    public int getOrdre() {
        return ordre;
    }

    public void setOrdre(int ordre) {
        this.ordre = ordre;
    }
}
