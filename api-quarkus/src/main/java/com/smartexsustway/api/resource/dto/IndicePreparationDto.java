package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.IndicePreparation;
import com.smartexsustway.api.domain.enums.StatutIndice;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * RG41/RG42/RG43 : indice de préparation bailleur — un alignement mesuré, jamais une garantie d'éligibilité.
 *
 * <p>{@code score} est nul dès que {@code statut} n'est pas {@code CALCULE}.
 * L'interface doit lire le statut avant le score : afficher {@code 0} pour un
 * indice sans périmètre reviendrait à annoncer une préparation nulle là où
 * rien n'a été mesuré.
 *
 * <p>Les deux compteurs séparent les deux causes que {@code SANS_EVALUATION}
 * recouvre : {@code nombreCriteresRetenus == 0} avec un
 * {@code nombreCriteresTagues > 0} peut signifier que la mission n'a pas
 * assez avancé, ou qu'aucun critère tagué n'appartient à son référentiel.
 *
 * <p>Aucun élément de raisonnement IA n'y figure : un indice est un chiffre
 * et son périmètre, pas une justification.
 */
public record IndicePreparationDto(
        UUID id,
        UUID auditId,
        String bailleurCode,
        String bailleurNom,
        StatutIndice statut,
        BigDecimal score,
        int nombreCriteresTagues,
        int nombreCriteresRetenus,
        OffsetDateTime dateCalcul
) {
    public static IndicePreparationDto depuis(IndicePreparation i) {
        return new IndicePreparationDto(
                i.getId(),
                i.getAudit().getId(),
                i.getBailleur().getCode(),
                i.getBailleur().getNom(),
                i.getStatut(),
                i.getScore(),
                i.getNombreCriteresTagues(),
                i.getNombreCriteresRetenus(),
                i.getDateCalcul()
        );
    }
}
