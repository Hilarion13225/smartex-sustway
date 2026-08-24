package com.smartexsustway.api.resource.dto;

import java.math.BigDecimal;

/**
 * Moyenne anonymisée du score des entreprises clientes d'un secteur.
 * {@code scoreMoyen} vaut {@code null} tant que {@code nombreEntreprises}
 * n'atteint pas le seuil de k-anonymat (voir SecteurResource) — sous ce
 * seuil, une moyenne calculée sur 1 à 2 entreprises reviendrait à révéler
 * le score d'un concurrent précis.
 */
public record SecteurBenchmarkDto(String secteurCode, long nombreEntreprises, BigDecimal scoreMoyen) {
}
