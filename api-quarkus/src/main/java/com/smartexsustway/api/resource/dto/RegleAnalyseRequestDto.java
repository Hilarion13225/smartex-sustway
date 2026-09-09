package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Map;
import java.util.UUID;

/**
 * Création ou modification d'une règle d'analyse.
 *
 * La portée est donnée par `exigenceId` et `preuveAttendueId` : tous deux
 * nuls pour une règle de critère, `exigenceId` seul pour une règle
 * d'exigence, les deux pour une règle portant sur une pièce précise.
 */
public record RegleAnalyseRequestDto(
        UUID exigenceId,
        UUID preuveAttendueId,
        String type,
        @Size(max = 300) String libelle,
        String severite,
        Map<String, Object> definition,
        Integer ordre
) {
    public record Creation(
            UUID exigenceId,
            UUID preuveAttendueId,
            @NotBlank(message = "Le code est obligatoire")
            @Size(max = 40) String code,
            @NotBlank(message = "Le type de règle est obligatoire") String type,
            @NotBlank(message = "Le libellé est obligatoire")
            @Size(max = 300) String libelle,
            String severite,
            Map<String, Object> definition,
            Integer ordre
    ) {
    }
}
