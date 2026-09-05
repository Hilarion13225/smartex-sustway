package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Corps de la requête d'évaluation experte d'un critère : niveau d'engagement
 * choisi par l'auditeur sur l'échelle de maturité en cinq niveaux, et
 * commentaire justifiant ce choix.
 *
 * Les bornes 1-5 reprennent la contrainte {@code CHECK (note BETWEEN 1 AND 5)}
 * portée par la table {@code evaluation} : elles sont validées ici pour
 * renvoyer un 400 explicite plutôt qu'une violation de contrainte en base.
 */
public record EvaluationExperteRequestDto(
        @NotNull @Min(1) @Max(5) Integer niveau,
        @Size(max = 500) String justification
) {
}
