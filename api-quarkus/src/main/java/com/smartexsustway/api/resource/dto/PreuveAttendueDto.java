package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.PreuveAttendue;

import java.util.UUID;

/** Ce que l'audit attend en démonstration d'une exigence — pas une pièce déposée. */
public record PreuveAttendueDto(
        UUID id,
        UUID exigenceId,
        String type,
        String libelle,
        String description,
        boolean obligatoire,
        int ordre,
        boolean modifiable,
        ProvenanceDto provenance
) {
    public static PreuveAttendueDto depuis(PreuveAttendue p) {
        return new PreuveAttendueDto(
                p.getId(),
                p.getExigence().getId(),
                p.getType().name(),
                p.getLibelle(),
                p.getDescription(),
                p.isObligatoire(),
                p.getOrdre(),
                p.getReferentielVersion().estBrouillon(),
                ProvenanceDto.depuis(p)
        );
    }
}
