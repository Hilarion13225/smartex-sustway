package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Changement de statut d'un compte par l'administration.
 *
 * <p>Le statut arrive en chaîne et non en énumération : une valeur inconnue
 * doit produire un message explicite plutôt qu'un 400 de désérialisation, qui
 * ne dirait pas laquelle des valeurs attendues manquait. La conversion et le
 * contrôle des valeurs admises se font dans la ressource.
 */
public record StatutUtilisateurRequest(
        @NotBlank(message = "Le statut est obligatoire")
        String statut
) {
}
