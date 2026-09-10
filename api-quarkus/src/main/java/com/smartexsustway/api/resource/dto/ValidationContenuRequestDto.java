package com.smartexsustway.api.resource.dto;

import java.util.UUID;

/**
 * Corps d'une demande de validation.
 *
 * Il ne porte volontairement aucun champ de provenance : {@code origine},
 * {@code origine_initiale}, {@code validee_par} et {@code validee_le} ne
 * s'écrivent que par l'opération de validation, jamais par une modification
 * ordinaire. Un client qui pourrait les poser lui-même se déclarerait
 * validateur sans rien relire.
 *
 * {@code referentielVersionId} est facultatif et sert de confirmation : le
 * client dit sur quel brouillon il croit travailler. Si l'élément appartient à
 * une autre version, la validation est refusée plutôt qu'appliquée ailleurs
 * que là où l'écran l'a montrée.
 */
public record ValidationContenuRequestDto(UUID referentielVersionId) {

    /** Le corps entier est facultatif : valider sans confirmation reste permis. */
    public static UUID versionAttendue(ValidationContenuRequestDto requete) {
        return requete == null ? null : requete.referentielVersionId();
    }
}
