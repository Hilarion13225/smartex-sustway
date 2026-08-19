package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.FournisseurPaiement;
import com.smartexsustway.api.domain.enums.StatutPaiement;
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
 * Correspond à la table {@code paiement}.
 * Décision actée CDC §13 : PI-SPI et Wave. Le traitement réel (appel API,
 * webhooks, vérification de signature) n'est PAS encore implémenté — voir
 * PaiementService, qui documente ce point explicitement (CDC §5.3 : "les
 * modalités précises d'intégration technique avec PI-SPI et Wave... restent
 * à cadrer avec Smartex Expertises").
 */
@Entity
@Table(name = "paiement")
public class Paiement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "abonnement_id", nullable = false)
    private Abonnement abonnement;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "fournisseur", nullable = false, columnDefinition = "fournisseur_paiement")
    private FournisseurPaiement fournisseur;

    @Column(name = "reference", nullable = false, unique = true)
    private String reference;

    @Column(name = "montant", nullable = false, precision = 10, scale = 2)
    private BigDecimal montant;

    @Column(name = "devise", nullable = false, length = 3)
    private String devise = "XOF";

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut", nullable = false, columnDefinition = "statut_paiement")
    private StatutPaiement statut = StatutPaiement.EN_ATTENTE;

    @Column(name = "date_paiement")
    private OffsetDateTime datePaiement;

    protected Paiement() {
        // JPA
    }

    public Paiement(Abonnement abonnement, FournisseurPaiement fournisseur, String reference, BigDecimal montant) {
        this.abonnement = abonnement;
        this.fournisseur = fournisseur;
        this.reference = reference;
        this.montant = montant;
    }

    public UUID getId() {
        return id;
    }

    public Abonnement getAbonnement() {
        return abonnement;
    }

    public FournisseurPaiement getFournisseur() {
        return fournisseur;
    }

    public String getReference() {
        return reference;
    }

    public BigDecimal getMontant() {
        return montant;
    }

    public String getDevise() {
        return devise;
    }

    public StatutPaiement getStatut() {
        return statut;
    }

    public void setStatut(StatutPaiement statut) {
        this.statut = statut;
    }

    public OffsetDateTime getDatePaiement() {
        return datePaiement;
    }

    public void setDatePaiement(OffsetDateTime datePaiement) {
        this.datePaiement = datePaiement;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Paiement other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
