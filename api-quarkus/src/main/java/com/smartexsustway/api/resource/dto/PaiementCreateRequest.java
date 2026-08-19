package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.Pattern;

/** Décision actée CDC §13 : PI-SPI et Wave sont les deux fournisseurs retenus. */
public record PaiementCreateRequest(
        @Pattern(regexp = "PI_SPI|WAVE", message = "Le fournisseur doit être PI_SPI ou WAVE")
        String fournisseur
) {
}
