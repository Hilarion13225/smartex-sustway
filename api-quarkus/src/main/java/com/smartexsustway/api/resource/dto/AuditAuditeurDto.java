package com.smartexsustway.api.resource.dto;

import java.util.UUID;

/** RG06 : un membre de l'équipe affectée à une mission, avec son rôle sur cette mission précise. */
public record AuditAuditeurDto(UUID utilisateurId, String nom, String prenom, String email, String roleMission) {
}
