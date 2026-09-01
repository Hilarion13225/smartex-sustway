package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;

/** RG06 : rôle porté par la personne affectée (AUDITEUR_PRINCIPAL, AUDITEUR_SECONDAIRE, OBSERVATEUR). */
public record AffecterAuditeurRequest(@NotBlank String roleMission) {
}
