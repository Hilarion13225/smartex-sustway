package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Paiement;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PaiementDto(
        UUID id,
        UUID abonnementId,
        String fournisseur,
        String reference,
        BigDecimal montant,
        String devise,
        String statut,
        OffsetDateTime datePaiement
) {
    public static PaiementDto depuis(Paiement p) {
        return new PaiementDto(
                p.getId(), p.getAbonnement().getId(), p.getFournisseur().name(),
                p.getReference(), p.getMontant(), p.getDevise(), p.getStatut().name(), p.getDatePaiement()
        );
    }
}
