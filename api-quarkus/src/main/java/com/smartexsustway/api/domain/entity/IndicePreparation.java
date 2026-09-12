package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.StatutIndice;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Correspond à la table {@code indice_preparation}.
 * RG41/RG42/RG43 : indice de préparation bailleur (financements verts),
 * réservé à la formule Avancées. Même méthode de calcul que le score
 * pondéré (RG32, voir IndicePreparationService), restreinte aux critères
 * tagués applicables à ce bailleur (RG39, critere_bailleur) — un readiness
 * élevé n'est en aucun cas une garantie d'éligibilité auprès du bailleur.
 */
@Entity
@Table(name = "indice_preparation")
public class IndicePreparation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "audit_id", nullable = false)
    private Audit audit;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bailleur_id", nullable = false)
    private Bailleur bailleur;

    /**
     * Nul dès que {@code statut} n'est pas {@code CALCULE}. Un zéro ne doit
     * jamais tenir lieu d'absence de données — c'est toute la raison de la
     * migration V73.
     */
    @Column(name = "score", precision = 6, scale = 2)
    private BigDecimal score;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut", nullable = false, columnDefinition = "statut_indice")
    private StatutIndice statut;

    /** Périmètre théorique : critères marqués applicables à ce bailleur. */
    @Column(name = "nombre_criteres_tagues", nullable = false)
    private int nombreCriteresTagues;

    /** Périmètre effectif : critères de cette mission réellement entrés dans le calcul. */
    @Column(name = "nombre_criteres_retenus", nullable = false)
    private int nombreCriteresRetenus;

    @Column(name = "date_calcul", nullable = false)
    private OffsetDateTime dateCalcul;

    protected IndicePreparation() {
        // JPA
    }

    public IndicePreparation(Audit audit, Bailleur bailleur, OffsetDateTime dateCalcul) {
        this.audit = audit;
        this.bailleur = bailleur;
        this.dateCalcul = dateCalcul;
        this.statut = StatutIndice.NON_CALCULABLE;
    }

    public UUID getId() {
        return id;
    }

    public Audit getAudit() {
        return audit;
    }

    public Bailleur getBailleur() {
        return bailleur;
    }

    public BigDecimal getScore() {
        return score;
    }

    public StatutIndice getStatut() {
        return statut;
    }

    public int getNombreCriteresTagues() {
        return nombreCriteresTagues;
    }

    public int getNombreCriteresRetenus() {
        return nombreCriteresRetenus;
    }

    public OffsetDateTime getDateCalcul() {
        return dateCalcul;
    }

    /**
     * Pose le résultat d'un calcul d'un seul geste.
     *
     * <p>Il n'y a délibérément pas de {@code setScore} ni de {@code setStatut}
     * séparés : le score et le statut se répondent — un {@code CALCULE} sans
     * score, ou un score sans {@code CALCULE}, donnerait un indice qu'on ne
     * saurait pas lire. La base tient la même règle (contrainte
     * {@code indice_score_coherent_avec_statut}, V73) ; l'entité évite d'y
     * arriver dans un état qu'elle refuserait.
     *
     * @param score nul obligatoirement lorsque {@code statut} n'est pas {@code CALCULE}
     */
    public void enregistrerResultat(StatutIndice statut, BigDecimal score,
                                    int nombreCriteresTagues, int nombreCriteresRetenus,
                                    OffsetDateTime dateCalcul) {
        if (statut.porteUnScore() == (score == null)) {
            throw new IllegalArgumentException(
                    "Statut %s et score %s sont incohérents".formatted(statut, score));
        }
        this.statut = statut;
        this.score = score;
        this.nombreCriteresTagues = nombreCriteresTagues;
        this.nombreCriteresRetenus = nombreCriteresRetenus;
        this.dateCalcul = dateCalcul;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof IndicePreparation other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
