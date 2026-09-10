package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.Exigence;
import com.smartexsustway.api.domain.entity.PreuveAttendue;
import com.smartexsustway.api.domain.entity.ReferentielVersion;
import com.smartexsustway.api.domain.entity.RegleAnalyse;
import com.smartexsustway.api.domain.entity.SousDomaine;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Ce qu'un import a déposé dans un brouillon, et où en est sa relecture.
 *
 * Chaque élément porte sa position dans la hiérarchie — domaine,
 * sous-domaine, critère — plutôt qu'un simple code de critère. L'écran de
 * relecture peut ainsi bâtir son arborescence à partir de ce seul appel : la
 * reconstituer autrement supposerait un appel par critère, soit des dizaines
 * de requêtes pour afficher une page.
 *
 * Ce n'est pas le référentiel complet qui est rendu, seulement ce que
 * l'import a proposé. Le reste du catalogue se lit par les endpoints
 * existants, et le dupliquer ici en ferait une seconde source de vérité.
 *
 * {@code publiable} n'autorise rien : le déclencheur
 * {@code refuser_publication_sans_validation} (V58) reste seul à trancher au
 * moment de la publication. Le calculer ici évite seulement de proposer un
 * bouton qui échouerait.
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
        int elementsRejetes,
        int elementsImportesTotal,
        List<Map<String, Object>> doublonsDetectes
) {

    /**
     * Un élément proposé par l'IA que personne n'a encore tranché, situé dans
     * la hiérarchie du référentiel.
     *
     * Le libellé est repris tel quel : c'est le texte que la personne doit
     * lire pour décider, et un résumé lui ferait valider autre chose que ce
     * qui entrera dans le catalogue.
     *
     * {@code sousDomaineCode} est nul quand le critère est rattaché
     * directement à son domaine — les grilles SFI et PRI n'ont aucun
     * sous-domaine, là où la grille de durabilité en compte dix-huit.
     */
    public record ElementAValiderDto(
            String nature,
            UUID id,
            String domaineCode,
            String domaineLibelle,
            String sousDomaineCode,
            String sousDomaineLibelle,
            String critereCode,
            String critereLibelle,
            UUID critereId,
            String code,
            String libelle,
            ProvenanceDto provenance
    ) {

        static ElementAValiderDto de(String nature, UUID id, Critere critere, String code,
                                     String libelle, ProvenanceDto provenance) {
            SousDomaine sousDomaine = critere.getSousDomaine();
            return new ElementAValiderDto(
                    nature, id,
                    critere.getDomaine().getCode(), critere.getDomaine().getNom(),
                    sousDomaine == null ? null : sousDomaine.getCode(),
                    sousDomaine == null ? null : sousDomaine.getNom(),
                    critere.getCode(), critere.getLibelle(), critere.getId(),
                    code, libelle, provenance);
        }
    }

    /**
     * @param exigences     exigences importées restant à trancher
     * @param preuves       preuves attendues importées restant à trancher
     * @param regles        règles importées restant à trancher
     * @param valides       nombre d'éléments importés déjà retenus
     * @param rejetes       nombre d'éléments importés écartés
     * @param importesTotal total déposé par l'import, décisions comprises —
     *                      sans lui, l'écran ne pourrait dire que « 8
     *                      restants » au lieu de « 4 sur 12 », et
     *                      l'avancement disparaîtrait au moment précis où il
     *                      devient intéressant
     * @param doublons      doublons repérés à l'extraction, tels que le
     *                      service d'agents les a rapportés ; vide s'il n'en
     *                      a signalé aucun
     */
    public static BrouillonImporteDto depuis(ReferentielVersion version,
                                             Map<String, Object> metadonneesImport,
                                             List<Exigence> exigences,
                                             List<PreuveAttendue> preuves,
                                             List<RegleAnalyse> regles,
                                             int valides,
                                             int rejetes,
                                             int importesTotal,
                                             List<Map<String, Object>> doublons) {
        var elements = new ArrayList<ElementAValiderDto>();
        exigences.forEach(e -> elements.add(ElementAValiderDto.de(
                "EXIGENCE", e.getId(), e.getCritere(), e.getCode(), e.getIntitule(),
                ProvenanceDto.depuis(e))));
        preuves.forEach(p -> elements.add(ElementAValiderDto.de(
                "PREUVE_ATTENDUE", p.getId(), p.getExigence().getCritere(), null, p.getLibelle(),
                ProvenanceDto.depuis(p))));
        regles.forEach(r -> elements.add(ElementAValiderDto.de(
                "REGLE_ANALYSE", r.getId(), r.getCritere(), r.getCode(), r.getLibelle(),
                ProvenanceDto.depuis(r))));

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
                valides,
                rejetes,
                importesTotal,
                doublons == null ? List.of() : doublons);
    }
}
