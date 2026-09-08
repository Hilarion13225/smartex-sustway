package com.smartexsustway.api.domain.entity;

import com.smartexsustway.api.domain.enums.TypeQuestion;
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

import java.util.Objects;
import java.util.UUID;

/** Correspond à la table {@code question}. RG09 : plusieurs questions/indicateurs détaillés par critère. */
@Entity
@Table(name = "question")
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "critere_id", nullable = false)
    private Critere critere;


    /**
     * Version propriétaire de cette ligne. Une ligne d'une version publiée
     * n'est plus modifiable : le déclencheur de V49 refuse l'écriture.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "referentiel_version_id", nullable = false)
    private ReferentielVersion referentielVersion;

    @Column(name = "code", nullable = false, length = 30)
    private String code;

    @Column(name = "libelle", nullable = false, columnDefinition = "text")
    private String libelle;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "type", nullable = false, columnDefinition = "type_question")
    private TypeQuestion type = TypeQuestion.FERMEE;

    @Column(name = "ordre", nullable = false)
    private int ordre;

    @Column(name = "obligatoire", nullable = false)
    private boolean obligatoire = true;

    /**
     * Échelle attendue en réponse : {@code MATURITE} (niveau 1 à 5) ou
     * {@code BINAIRE} (constat de fait, oui/non). Voir V27.
     */
    @Column(name = "echelle_reponse", nullable = false, length = 20)
    private String echelleReponse = "MATURITE";

    protected Question() {
        // JPA
    }

    private Question(Critere critere, String code, String libelle) {
        this.critere = critere;
        this.referentielVersion = critere.getReferentielVersion();
        this.code = code;
        this.libelle = libelle;
    }

    /** Réplique cette question sous le critère correspondant d'une autre version. */
    public Question copieSous(Critere critereCible) {
        Question copie = new Question(critereCible, this.code, this.libelle);
        copie.type = this.type;
        copie.ordre = this.ordre;
        copie.obligatoire = this.obligatoire;
        copie.echelleReponse = this.echelleReponse;
        return copie;
    }

    public UUID getId() {
        return id;
    }

    public Critere getCritere() {
        return critere;
    }

    public ReferentielVersion getReferentielVersion() {
        return referentielVersion;
    }

    public String getCode() {
        return code;
    }

    public String getLibelle() {
        return libelle;
    }

    public String getEchelleReponse() {
        return echelleReponse;
    }

    public TypeQuestion getType() {
        return type;
    }

    public int getOrdre() {
        return ordre;
    }

    public boolean isObligatoire() {
        return obligatoire;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Question other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
