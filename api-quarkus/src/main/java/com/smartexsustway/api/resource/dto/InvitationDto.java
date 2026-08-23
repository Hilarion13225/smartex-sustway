package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Invitation;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Vue publique d'une invitation (page d'acceptation, pas d'authentification). */
public record InvitationDto(
        UUID id,
        String email,
        String entrepriseNom,
        String roleCode,
        String roleNom,
        String siteNom,
        boolean valide,
        OffsetDateTime createdAt,
        OffsetDateTime expireAt
) {
    public static InvitationDto depuis(Invitation invitation) {
        return new InvitationDto(
                invitation.getId(),
                invitation.getEmail(),
                invitation.getEntreprise().getRaisonSociale(),
                invitation.getRole().getCode(),
                invitation.getRole().getNom(),
                invitation.getSite() == null ? null : invitation.getSite().getNom(),
                invitation.estValide(),
                invitation.getCreatedAt(),
                invitation.getExpireAt()
        );
    }
}
