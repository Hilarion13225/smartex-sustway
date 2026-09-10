package com.smartexsustway.api.resource.dto;

import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Corps d'une demande de rejet.
 *
 * Comme pour la validation, aucun champ de provenance n'y figure :
 * {@code origine}, {@code origine_initiale} et les marques de décision ne
 * s'écrivent que par l'opération métier. Un client qui pourrait les poser
 * lui-même se déclarerait relecteur sans rien relire.
 *
 * {@code motif} est facultatif. Exiger une justification serait une décision
 * métier que rien n'a tranchée, et une proposition manifestement hors sujet
 * doit pouvoir être écartée sans plaidoirie. Quand il est donné, il est
 * conservé sur l'élément et dans le journal.
 *
 * {@code referentielVersionId} sert de confirmation, comme pour la
 * validation : le client dit sur quel brouillon il croit travailler.
 */
public record RejetContenuRequestDto(
        UUID referentielVersionId,
        @Size(max = 2000, message = "Le motif ne peut pas dépasser 2000 caractères")
        String motif
) {
    public static UUID versionAttendue(RejetContenuRequestDto requete) {
        return requete == null ? null : requete.referentielVersionId();
    }

    public static String motif(RejetContenuRequestDto requete) {
        return requete == null ? null : requete.motif();
    }
}
