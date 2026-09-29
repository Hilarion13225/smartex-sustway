package com.smartexsustway.api.referentiel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

/**
 * Une proposition d'enrichissement d'un référentiel déjà publié.
 *
 * Ce n'est pas le format de l'import documentaire : celui-là décrit un
 * référentiel entier extrait d'un document, celui-ci ne décrit que ce qui
 * s'ajoute à une version existante. Les deux ne se recouvrent nulle part, et
 * les confondre reviendrait à faire croire qu'un enrichissement peut créer un
 * catalogue.
 *
 * Les blocs de travail de la proposition — statistiques, contrôles de
 * génération, coquilles relevées — ne sont pas repris ici. Ils documentent
 * comment le fichier a été produit ; ils ne décrivent aucun contenu à écrire,
 * et leur donner une place dans le DTO laisserait croire qu'ils en ont une en
 * base.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record Proposition22Dto(
        @JsonProperty("meta") MetaDto meta,
        @JsonProperty("criteres") List<CritereDto> criteres
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MetaDto(
            @JsonProperty("referentiel") String referentiel,
            @JsonProperty("version_source") String versionSource,
            @JsonProperty("version_cible_proposee") String versionCibleProposee
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CritereDto(
            @JsonProperty("code") String code,
            @JsonProperty("description") DescriptionDto description,
            @JsonProperty("regles_proposees") List<RegleDto> reglesProposees,
            @JsonProperty("preuve_complementaire") PreuveComplementaireDto preuveComplementaire
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DescriptionDto(
            @JsonProperty("valeur") String valeur,
            @JsonProperty("statut") String statut
    ) {
    }

    /**
     * Une règle proposée, ou le constat qu'aucune n'a pu être déduite.
     *
     * Les deux partagent la même place dans le fichier : une entrée dont
     * {@code type} est nul dit qu'aucune règle n'est proposée pour ce critère,
     * et la décision H-03 veut qu'elle le reste. Seules les entrées de statut
     * {@code PROPOSEE} sont écrites.
     *
     * {@code porteePreuveLibelle} désigne la pièce visée par son libellé, et
     * non par sa position. Le fichier de proposition exprime aujourd'hui cette
     * portée par un index de tableau ; un index n'identifie rien — il dépend
     * d'un ordre que rien ne garantit entre le fichier source et la base, et un
     * rapprochement positionnel faux rattacherait la règle à une autre pièce
     * sans qu'aucune erreur ne le signale. Le libellé est donc exigé, et son
     * absence fait échouer l'import.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RegleDto(
            @JsonProperty("suffixe") String suffixe,
            @JsonProperty("type") String type,
            @JsonProperty("libelle") String libelle,
            @JsonProperty("severite") String severite,
            @JsonProperty("portee_preuve_libelle") String porteePreuveLibelle,
            @JsonProperty("definition") Map<String, Object> definition,
            @JsonProperty("confiance") Double confiance,
            @JsonProperty("statut") String statut
    ) {
        public boolean estProposee() {
            return "PROPOSEE".equals(statut);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PreuveComplementaireDto(
            @JsonProperty("type") String type,
            @JsonProperty("libelle") String libelle,
            @JsonProperty("description") String description,
            @JsonProperty("obligatoire") Boolean obligatoire,
            @JsonProperty("confiance") Double confiance,
            @JsonProperty("statut") String statut
    ) {
    }
}
