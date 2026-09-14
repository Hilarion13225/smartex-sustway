package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Formulaire de contact de la vitrine (voir ContactResource).
 *
 * `siteWeb` est un piège à robots : le champ existe dans le formulaire mais
 * reste invisible et hors tabulation pour un visiteur. Un robot qui remplit
 * tous les champs le renseigne ; un humain, jamais.
 */
public record ContactRequest(
        @NotBlank(message = "Indiquez votre nom.")
        @Size(max = 120, message = "Le nom ne peut dépasser 120 caractères.")
        String nom,

        @NotBlank(message = "Indiquez votre adresse e-mail.")
        @Email(message = "Vérifiez l'adresse e-mail.")
        @Size(max = 254, message = "L'adresse e-mail est trop longue.")
        String email,

        @NotBlank(message = "Indiquez le nom de votre organisation.")
        @Size(max = 160, message = "Le nom de l'organisation ne peut dépasser 160 caractères.")
        String organisation,

        @Size(max = 30, message = "Le numéro de téléphone est trop long.")
        @Pattern(regexp = "^[0-9 +().-]*$", message = "Le téléphone ne peut contenir que des chiffres, espaces et + ( ) . -")
        String telephone,

        @NotBlank(message = "Choisissez un sujet.")
        String sujet,

        @NotBlank(message = "Écrivez votre message.")
        @Size(max = 5000, message = "Le message ne peut dépasser 5 000 caractères.")
        String message,

        String siteWeb
) {
}
