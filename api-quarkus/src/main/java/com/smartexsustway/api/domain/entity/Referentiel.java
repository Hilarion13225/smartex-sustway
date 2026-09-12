package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.StatutGenerique;
import com.smartexsustway.api.domain.enums.TypeReferentiel;
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
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/** Correspond à la table {@code referentiel}. RG07 : se décompose en plusieurs domaines. */
@Entity
@Table(name = "referentiel")
public class Referentiel {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "code", nullable = false, unique = true, length = 30)
    private String code;

    @Column(name = "nom", nullable = false, length = 200)
    private String nom;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "type", nullable = false, columnDefinition = "type_referentiel")
    private TypeReferentiel type;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "version", nullable = false, length = 20)
    private String version = "1.0";

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut", nullable = false, columnDefinition = "statut_generique")
    private StatutGenerique statut = StatutGenerique.ACTIF;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected Referentiel() {
        // JPA
    }

    public Referentiel(String code, String nom, TypeReferentiel type) {
        this.code = code;
        this.nom = nom;
        this.type = type;
    }

    public UUID getId() {
        return id;
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

    public TypeReferentiel getType() {
        return type;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public StatutGenerique getStatut() {
        return statut;
    }

    public void setStatut(StatutGenerique statut) {
        this.statut = statut;
    }

    /**
     * Vrai lorsque ce référentiel peut porter un nouveau travail — une mission
     * ou un projet.
     *
     * <p>Seul {@code ACTIF} l'autorise : {@code INACTIF}, {@code SUSPENDU} et
     * {@code ARCHIVE} disent chacun à leur manière que le cadre n'est plus
     * proposé. La règle est portée ici, et non recopiée dans chaque ressource,
     * pour que {@code AuditResource} et {@code ProjetResource} ne puissent pas
     * diverger — elles ont déjà chacune leur convention d'erreur.
     *
     * <p>Elle ne gouverne que la création. Une mission ou un projet déjà
     * rattaché à un référentiel archivé reste consultable : archiver retire
     * de l'offre, cela ne réécrit pas l'histoire.
     *
     * <p>Le filtre existait déjà côté React ({@code AuditsListe},
     * {@code Questionnaire}), mais une interface qui masque une option
     * n'empêche personne d'appeler l'API directement.
     */
    public boolean accepteDeNouveauxTravaux() {
        return statut == StatutGenerique.ACTIF;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Referentiel other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
