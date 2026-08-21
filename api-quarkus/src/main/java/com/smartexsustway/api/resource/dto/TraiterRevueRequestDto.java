package com.smartexsustway.api.resource.dto;

import java.math.BigDecimal;

/**
 * Corps de la requête de traitement d'une revue experte.
 * {@code probabiliteFinale} est optionnel : si l'expert confirme purement
 * et simplement l'estimation IA sans la modifier, il peut l'omettre — dans
 * ce cas la probabilité initiale est reconduite telle quelle. La note
 * finale n'est jamais saisie directement (même cohérence que RG27 côté
 * IA) : elle est toujours dérivée de la probabilité finale via
 * ScoringEngine.niveauEngagement, que cette probabilité vienne de l'IA ou
 * de l'expert.
 */
public record TraiterRevueRequestDto(
        BigDecimal probabiliteFinale,
        String commentaire
) {
}
