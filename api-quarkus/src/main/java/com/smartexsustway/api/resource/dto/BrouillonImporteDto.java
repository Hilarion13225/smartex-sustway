package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Exigence;
import com.smartexsustway.api.domain.entity.PreuveAttendue;
import com.smartexsustway.api.domain.entity.RegleAnalyse;
import com.smartexsustway.api.domain.entity.ReferentielVersion;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Ce qu'un import a déposé dans un brouillon, et ce qu'il reste à relire.
 *
 * Destiné à l'écran de relecture qui viendra : il lui faut savoir ce qui a
 * été produit, d'où cela vient, et ce qui empêche encore la publication. Le
 * comptage et la liste des éléments à valider répondent à la dernière
 * question sans que l'écran ait à la reconstituer lui-même.
 *
 * {@code publiable} n'est pas une autorisation mais un constat, et il
 * n'autorise rien : le déclencheur {@code refuser_publication_sans_validation}
 * (V57) reste seul à trancher au moment de la publication. Le calculer ici
 * évite seulement de proposer un bouton qui échouerait.
 */
public record BrouillonImporteDto(
        UUID versionId,
        String versionNumero,
        String versionStatut,
        String referentielCode,
        String referentielNom,
        Map<String, Object> metadonneesImport,
        int exigencesAValider,
        int preuvesAttenduesAValider,
        int reglesAValider,
        boolean publiable,
        List<ElementAValiderDto> elementsAValider,
        int elementsValides,
        int elementsImportesTotal
) {

    /**
     * Un élément proposé par l'IA que personne n'a encore accepté.
     *
     * Le libellé est repris tel quel : c'est le texte que la personne doit
     * lire pour décider, et un résumé lui ferait valider autre chose que ce
     * qui entrera dans le catalogue.
     */
    public record ElementAValiderDto(
            String nature,
            UUID id,
            String critereCode,
            String code,
            String libelle
    ) {
    }

    /**
     * @param exigences        exigences importées restant à valider
     * @param preuves          preuves attendues importées restant à valider
     * @param regles           règles importées restant à valider
     * @param importesTotal    nombre total d'éléments que l'import a déposés,
     *                         validés compris — sans lui, l'écran de relecture
     *                         ne saurait pas dire « 4 sur 12 » mais seulement
     *                         « 8 restants », et l'avancement disparaîtrait au
     *                         moment précis où il devient intéressant.
     */
    public static BrouillonImporteDto depuis(ReferentielVersion version,
                                             Map<String, Object> metadonneesImport,
                                             List<Exigence> exigences,
                                             List<PreuveAttendue> preuves,
                                             List<RegleAnalyse> regles,
                                             int importesTotal) {
        var elements = new java.util.ArrayList<ElementAValiderDto>();
        exigences.forEach(e -> elements.add(new ElementAValiderDto(
                "EXIGENCE", e.getId(), e.getCritere().getCode(), e.getCode(), e.getIntitule())));
        preuves.forEach(p -> elements.add(new ElementAValiderDto(
                "PREUVE_ATTENDUE", p.getId(), p.getExigence().getCritere().getCode(),
                null, p.getLibelle())));
        regles.forEach(r -> elements.add(new ElementAValiderDto(
                "REGLE_ANALYSE", r.getId(), r.getCritere().getCode(), r.getCode(), r.getLibelle())));

        return new BrouillonImporteDto(
                version.getId(),
                version.getNumero(),
                version.getStatut().name(),
                version.getReferentiel().getCode(),
                version.getReferentiel().getNom(),
                metadonneesImport,
                exigences.size(),
                preuves.size(),
                regles.size(),
                elements.isEmpty(),
                elements,
                Math.max(0, importesTotal - elements.size()),
                importesTotal);
    }
}
