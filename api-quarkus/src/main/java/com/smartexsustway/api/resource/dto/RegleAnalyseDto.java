package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.RegleAnalyse;

import java.util.Map;
import java.util.UUID;

/**
 * Une règle d'analyse et sa portée.
 *
 * `exigenceId` et `preuveAttendueId` sont nuls quand la règle porte sur le
 * critère entier : c'est la portée la plus large, celle des contradictions
 * entre exigences.
 */
public record RegleAnalyseDto(
        UUID id,
        UUID critereId,
        UUID exigenceId,
        UUID preuveAttendueId,
        String code,
        String type,
        String libelle,
        String severite,
        Map<String, Object> definition,
        int ordre,
        boolean modifiable,
        ProvenanceDto provenance
) {
    public static RegleAnalyseDto depuis(RegleAnalyse r) {
        return new RegleAnalyseDto(
                r.getId(),
                r.getCritere().getId(),
                r.getExigence() == null ? null : r.getExigence().getId(),
                r.getPreuveAttendue() == null ? null : r.getPreuveAttendue().getId(),
                r.getCode(),
                r.getType().name(),
                r.getLibelle(),
                r.getSeverite().name(),
                r.getDefinition(),
                r.getOrdre(),
                r.getReferentielVersion().estBrouillon(),
                ProvenanceDto.depuis(r.getOrigine(), r.getOrigineInitiale(),
                        r.getValideePar(), r.getValideeLe())
        );
    }
}
