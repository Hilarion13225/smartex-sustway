package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.StatutGenerique;
import com.smartexsustway.api.domain.enums.TailleEntreprise;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Correspond à la table {@code entreprise}.
 * RG02 : identité légale unique. RG03 : peut exercer dans plusieurs pays (N-N,
 * modélisé directement via {@code @ManyToMany}, la table entreprise_pays étant
 * une pure table de jointure sans colonne propre).
 * RG34 : secteur et taille utilisés pour la composition dynamique du questionnaire.
 */
@Entity
@Table(name = "entreprise")
public class Entreprise {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "raison_sociale", nullable = false)
    private String raisonSociale;

    @Column(name = "identifiant_legal", nullable = false, unique = true, length = 100)
    private String identifiantLegal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "secteur_id")
    private Secteur secteur;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "taille", columnDefinition = "taille_entreprise")
    private TailleEntreprise taille;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut", nullable = false, columnDefinition = "statut_generique")
    private StatutGenerique statut = StatutGenerique.ACTIF;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "entreprise_pays",
            joinColumns = @JoinColumn(name = "entreprise_id"),
            inverseJoinColumns = @JoinColumn(name = "pays_id")
    )
    private Set<Pays> pays = new HashSet<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected Entreprise() {
        // JPA
    }

    public Entreprise(String raisonSociale, String identifiantLegal) {
        this.raisonSociale = raisonSociale;
        this.identifiantLegal = identifiantLegal;
    }

    public UUID getId() {
        return id;
    }

    public String getRaisonSociale() {
        return raisonSociale;
    }

    public void setRaisonSociale(String raisonSociale) {
        this.raisonSociale = raisonSociale;
    }

    public String getIdentifiantLegal() {
        return identifiantLegal;
    }

    public void setIdentifiantLegal(String identifiantLegal) {
        this.identifiantLegal = identifiantLegal;
    }

    public Secteur getSecteur() {
        return secteur;
    }

    public void setSecteur(Secteur secteur) {
        this.secteur = secteur;
    }

    public TailleEntreprise getTaille() {
        return taille;
    }

    public void setTaille(TailleEntreprise taille) {
        this.taille = taille;
    }

    public StatutGenerique getStatut() {
        return statut;
    }

    public void setStatut(StatutGenerique statut) {
        this.statut = statut;
    }

    public Set<Pays> getPays() {
        return pays;
    }

    public void ajouterPays(Pays p) {
        this.pays.add(p);
    }

    public void retirerPays(Pays p) {
        this.pays.remove(p);
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
        if (!(o instanceof Entreprise other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
