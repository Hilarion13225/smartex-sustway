package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Exigence;

import java.util.List;
import java.util.UUID;

/**
 * Une exigence et ce qu'elle appelle en démonstration.
 *
 * `origine` est exposée pour que l'écran d'administration distingue les
 * exigences reprises du libellé du critère par l'initialisation de celles
 * qu'une personne a réellement rédigées.
 */
public record ExigenceDto(
        UUID id,
        UUID critereId,
        String code,
        String intitule,
        String enonce,
        int ordre,
        String origine,
        boolean modifiable,
        List<PreuveAttendueDto> preuvesAttendues
) {
    public static ExigenceDto depuis(Exigence e, List<PreuveAttendueDto> preuvesAttendues) {
        return new ExigenceDto(
                e.getId(),
                e.getCritere().getId(),
                e.getCode(),
                e.getIntitule(),
                e.getEnonce(),
                e.getOrdre(),
                e.getOrigine().name(),
                e.getReferentielVersion().estBrouillon(),
                preuvesAttendues
        );
    }
}
