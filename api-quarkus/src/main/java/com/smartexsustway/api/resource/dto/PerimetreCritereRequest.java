package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * RG35 : décision d'exclure un critère du périmètre d'une mission.
 *
 * Les deux drapeaux sont ceux d'AUDIT_CRITERE et gardent leur sens distinct :
 * {@code applicable=false} (le critère ne s'applique pas à cette mission) ou
 * {@code actif=false} (le critère a été retiré du périmètre). Une seule
 * exclusion par décision — voir AuditResource.definirPerimetreCritere pour
 * les combinaisons refusées.
 *
 * Le motif est exigé : une exclusion sans justification lisible ne se relit
 * pas, et c'est lui que le journal d'audit conserve.
 */
public record PerimetreCritereRequest(
        @NotNull Boolean actif,
        @NotNull Boolean applicable,
        @NotBlank(message = "Le motif de l'exclusion est obligatoire")
        @Size(max = 2000, message = "Le motif ne peut pas dépasser 2000 caractères")
        String motif
) {
}
