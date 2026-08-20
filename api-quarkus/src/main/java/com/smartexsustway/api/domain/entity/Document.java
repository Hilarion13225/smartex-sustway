package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.StatutScanDocument;
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
 * Correspond à la table {@code document}.
 * Exigence sécurité §1.4 : scan antivirus à l'upload (voir AntivirusService),
 * restriction des types de fichiers acceptés (voir DocumentResource).
 * {@code cheminStockage} est la clé de l'objet dans le bucket S3/MinIO —
 * le chemin réel n'est jamais exposé directement au client (téléchargement
 * via un endpoint dédié qui relit le contenu depuis le stockage).
 */
@Entity
@Table(name = "document")
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "entreprise_id", nullable = false)
    private Entreprise entreprise;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id")
    private Site site;

    @Column(name = "nom_original", nullable = false, length = 500)
    private String nomOriginal;

    @Column(name = "nom_stockage", nullable = false, length = 500)
    private String nomStockage;

    @Column(name = "type_mime", nullable = false, length = 150)
    private String typeMime;

    @Column(name = "taille", nullable = false)
    private long taille;

    @Column(name = "chemin_stockage", nullable = false, columnDefinition = "text")
    private String cheminStockage;

    @Column(name = "hash", nullable = false, length = 128)
    private String hash;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "statut_scan", nullable = false, columnDefinition = "statut_scan_document")
    private StatutScanDocument statutScan = StatutScanDocument.EN_ATTENTE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by")
    private Utilisateur uploadedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected Document() {
        // JPA
    }

    public Document(Entreprise entreprise, String nomOriginal, String nomStockage, String typeMime,
                     long taille, String cheminStockage, String hash) {
        this.entreprise = entreprise;
        this.nomOriginal = nomOriginal;
        this.nomStockage = nomStockage;
        this.typeMime = typeMime;
        this.taille = taille;
        this.cheminStockage = cheminStockage;
        this.hash = hash;
    }

    public UUID getId() {
        return id;
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

    public String getNomOriginal() {
        return nomOriginal;
    }

    public String getTypeMime() {
        return typeMime;
    }

    public long getTaille() {
        return taille;
    }

    public String getCheminStockage() {
        return cheminStockage;
    }

    public String getHash() {
        return hash;
    }

    public StatutScanDocument getStatutScan() {
        return statutScan;
    }

    public void setStatutScan(StatutScanDocument statutScan) {
        this.statutScan = statutScan;
    }

    public Utilisateur getUploadedBy() {
        return uploadedBy;
    }

    public void setUploadedBy(Utilisateur uploadedBy) {
        this.uploadedBy = uploadedBy;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Document other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
