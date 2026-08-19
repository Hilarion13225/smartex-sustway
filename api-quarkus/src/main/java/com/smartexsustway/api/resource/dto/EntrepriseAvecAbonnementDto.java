package com.smartexsustway.api.resource.dto;

public record EntrepriseAvecAbonnementDto(
        EntrepriseDto entreprise,
        AbonnementDto abonnement
) {
}
