package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.AuditLog;
import com.smartexsustway.api.domain.entity.Utilisateur;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Entrée du journal d'audit exposée à l'UI (RG19). Le nom de l'auteur est
 * résolu par la ressource : la FK est ON DELETE SET NULL en base, une entrée
 * peut donc survivre à son auteur — d'où un champ nullable plutôt qu'une
 * relation obligatoire.
 */
public record AuditLogDto(
        UUID id,
        UUID utilisateurId,
        String utilisateurNom,
        String action,
        String entite,
        UUID entiteId,
        String ipAddress,
        String details,
        OffsetDateTime createdAt
) {
    public static AuditLogDto depuis(AuditLog log, Utilisateur auteur) {
        return new AuditLogDto(
                log.getId(),
                log.getUtilisateurId(),
                auteur != null ? auteur.getPrenom() + " " + auteur.getNom() : null,
                log.getAction(),
                log.getEntite(),
                log.getEntiteId(),
                log.getIpAddress(),
                log.getDetails(),
                log.getCreatedAt()
        );
    }
}
