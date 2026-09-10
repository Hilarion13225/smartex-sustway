package com.smartexsustway.api.ia;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Structure proposée par le service d'agents pour un référentiel importé.
 *
 * Chaque élément porte, quand le service d'agents a pu les mesurer, le
 * passage dont il est tiré, sa localisation dans le document et
 * l'appréciation du modèle sur sa propre extraction. Ces champs restent nuls
 * sinon : une localisation approximative enverrait le relecteur au mauvais
 * endroit avec confiance, et une confiance absente ne devient jamais zéro.
 *
 * Le contenu est reçu tel qu'il a été validé côté Python, puis revalidé ici
 * avant insertion : ce service ne fait pas autorité sur ce qui entre dans le
 * catalogue, il propose. Les annotations {@code @JsonIgnoreProperties} laissent
 * passer un champ ajouté côté Python sans casser l'appel — le contrat peut
 * s'enrichir sans qu'une version du service bloque l'autre.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ExtractionReferentielResponseDto(
        @JsonProperty("import_id") UUID importId,
        @JsonProperty("brouillon") BrouillonDto brouillon,
        @JsonProperty("metadonnees") Map<String, Object> metadonnees
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record BrouillonDto(
            @JsonProperty("referentiel") ReferentielDto referentiel,
            @JsonProperty("domaines") List<DomaineDto> domaines
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ReferentielDto(
            @JsonProperty("code") String code,
            @JsonProperty("nom") String nom,
            @JsonProperty("description") String description
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DomaineDto(
            @JsonProperty("code") String code,
            @JsonProperty("nom") String nom,
            @JsonProperty("description") String description,
            @JsonProperty("ordre") int ordre,
            @JsonProperty("sous_domaines") List<SousDomaineDto> sousDomaines,
            @JsonProperty("criteres") List<CritereDto> criteres
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SousDomaineDto(
            @JsonProperty("code") String code,
            @JsonProperty("nom") String nom,
            @JsonProperty("description") String description,
            @JsonProperty("ordre") int ordre
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CritereDto(
            @JsonProperty("localisation") Map<String, Object> localisation,
            @JsonProperty("texte_source") String texteSource,
            @JsonProperty("confiance") Double confiance,
            @JsonProperty("code") String code,
            @JsonProperty("libelle") String libelle,
            @JsonProperty("description") String description,
            @JsonProperty("sous_domaine_code") String sousDomaineCode,
            @JsonProperty("applicabilite") String applicabilite,
            @JsonProperty("criticite") String criticite,
            @JsonProperty("coefficient_ponderation") Double coefficientPonderation,
            @JsonProperty("ordre") int ordre,
            @JsonProperty("questions") List<QuestionDto> questions,
            @JsonProperty("exigences") List<ExigenceDto> exigences,
            @JsonProperty("regles_analyse") List<RegleDto> reglesAnalyse
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record QuestionDto(
            @JsonProperty("code") String code,
            @JsonProperty("libelle") String libelle,
            @JsonProperty("type") String type,
            @JsonProperty("echelle_reponse") String echelleReponse,
            @JsonProperty("obligatoire") Boolean obligatoire,
            @JsonProperty("ordre") int ordre
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ExigenceDto(
            @JsonProperty("localisation") Map<String, Object> localisation,
            @JsonProperty("texte_source") String texteSource,
            @JsonProperty("confiance") Double confiance,
            @JsonProperty("code") String code,
            @JsonProperty("intitule") String intitule,
            @JsonProperty("enonce") String enonce,
            @JsonProperty("ordre") int ordre,
            @JsonProperty("preuves_attendues") List<PreuveAttendueDto> preuvesAttendues
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PreuveAttendueDto(
            @JsonProperty("localisation") Map<String, Object> localisation,
            @JsonProperty("texte_source") String texteSource,
            @JsonProperty("confiance") Double confiance,
            @JsonProperty("type") String type,
            @JsonProperty("libelle") String libelle,
            @JsonProperty("description") String description,
            @JsonProperty("obligatoire") Boolean obligatoire,
            @JsonProperty("ordre") int ordre
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RegleDto(
            @JsonProperty("localisation") Map<String, Object> localisation,
            @JsonProperty("texte_source") String texteSource,
            @JsonProperty("confiance") Double confiance,
            @JsonProperty("code") String code,
            @JsonProperty("type") String type,
            @JsonProperty("libelle") String libelle,
            @JsonProperty("severite") String severite,
            @JsonProperty("exigence_code") String exigenceCode,
            @JsonProperty("preuve_attendue_libelle") String preuveAttendueLibelle,
            @JsonProperty("definition") Map<String, Object> definition
    ) {
    }
}
