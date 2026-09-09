package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.referentiel.ImportReferentielService;

import java.util.UUID;

/**
 * Où l'analyse doit déposer ce qu'elle aura trouvé.
 *
 * La cible est saisie par la personne qui lance l'analyse, et non déduite de
 * ce que le fichier annonce. Un document peut porter un code voisin de celui
 * d'un référentiel existant, ou aucun ; laisser son contenu décider de
 * l'endroit où il s'écrit ouvrirait un brouillon sur le mauvais référentiel,
 * qu'il faudrait ensuite démêler.
 *
 * Deux façons de la remplir. Pour alimenter un référentiel existant :
 * {@code referentielId} et {@code numeroVersion}, le numéro du brouillon à
 * ouvrir. Pour en créer un : {@code codeReferentiel}, {@code nomReferentiel}
 * et {@code typeReferentiel} — le code et le nom pouvant être laissés vides,
 * auquel cas ceux que le document annonce seront repris.
 */
public record LancerAnalyseImportDto(
        UUID referentielId,
        String codeReferentiel,
        String nomReferentiel,
        String typeReferentiel,
        String numeroVersion
) {
    public ImportReferentielService.CibleImport versCible() {
        return new ImportReferentielService.CibleImport(
                referentielId, codeReferentiel, nomReferentiel, typeReferentiel, numeroVersion);
    }
}
