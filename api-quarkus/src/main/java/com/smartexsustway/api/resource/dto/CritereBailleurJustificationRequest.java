package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.enums.CorrespondanceBailleur;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/**
 * Contenu d'une justification de mapping bailleur, à la création d'un
 * brouillon ou à sa modification.
 *
 * <p>Aucun champ n'est obligatoire ici : un brouillon peut naître sans
 * source. C'est la validation qui exige une preuve complète, et la base qui
 * le garantit. {@code origine} n'est pas saisissable : une justification
 * écrite par l'API est rédigée par une personne.
 */
public record CritereBailleurJustificationRequest(
        String documentNom,
        String documentEdition,
        String documentOrganisme,
        String documentUrl,
        String referenceOfficielle,
        String titreOfficiel,
        String texteSource,
        Map<String, Object> localisation,

        // numeric(4,3) arrondirait en silence un quatrième chiffre décimal.
        @DecimalMin(value = "0", message = "La confiance est comprise entre 0 et 1")
        @DecimalMax(value = "1", message = "La confiance est comprise entre 0 et 1")
        @Digits(integer = 1, fraction = 3, message = "La confiance porte au plus trois décimales")
        BigDecimal confiance,

        CorrespondanceBailleur correspondance,
        String justification
) {

    /** Motif d'un rejet ou d'une péremption. Obligatoire et non blanc, vérifié par le service. */
    public record Motif(String motif) {
    }

    /**
     * Report vers le critère de l'URL de la justification en cours du critère
     * {@code sourceCritereId}, qui doit être son équivalent dans la version
     * dont la version cible dérive directement.
     */
    public record Report(UUID sourceCritereId) {
    }
}
