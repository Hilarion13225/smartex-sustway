package com.smartexsustway.api.referentiel;

import com.smartexsustway.api.domain.entity.ReferentielVersion;
import com.smartexsustway.api.ia.ExtractionReferentielResponseDto;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Ouvre le brouillon, y dépose le contenu proposé, et clôt l'import — en une
 * seule transaction.
 *
 * Cette classe existe pour une raison mécanique. {@code @Transactional} est
 * posé par un intercepteur CDI, qui n'agit que sur les appels passant par le
 * proxy du bean ; l'orchestrateur s'appelant lui-même n'en déclencherait
 * aucun, et les trois étapes ouvriraient chacune la sienne. Un échec au
 * milieu laisserait alors une version brouillon vide, ou à demi remplie,
 * indistinguable pour qui la relit d'un brouillon complet. C'est le même
 * découpage qu'{@code AnalyseTransactionnelle} en phase 2, pour la même
 * raison.
 *
 * Les services appelés portent eux-mêmes {@code @Transactional} en propagation
 * par défaut : ils rejoignent celle-ci au lieu d'en ouvrir une.
 */
@ApplicationScoped
public class DepotImportTransactionnel {

    @Inject ImportReferentielService importService;
    @Inject BrouillonImporteService brouillonService;

    @Transactional
    public void deposer(UUID importId, ImportReferentielService.CibleImport cible,
                        ExtractionReferentielResponseDto reponse, UUID utilisateurId) {
        ReferentielVersion brouillon = importService.ouvrirBrouillonCible(
                cibleComplete(cible, reponse), utilisateurId);

        Map<String, Integer> compte = brouillonService.deposer(brouillon, reponse.brouillon());

        var metadonnees = new LinkedHashMap<String, Object>();
        if (reponse.metadonnees() != null) {
            // Ce que l'extraction a mesuré du fichier — pages lues, lots
            // envoyés, doublons écartés — est conservé tel quel : c'est la
            // seule trace de ce qui s'est passé entre le fichier et le
            // brouillon.
            metadonnees.putAll(reponse.metadonnees());
        }
        metadonnees.put("elements_deposes", new HashMap<>(compte));
        metadonnees.put("version_brouillon", brouillon.getNumero());

        importService.marquerBrouillonGenere(importId, brouillon.getId(), metadonnees);
    }

    /**
     * Complète la cible avec ce que le document annonce, sans jamais l'écraser.
     *
     * Ce que la personne a saisi prime. L'extraction ne sert qu'à nommer un
     * référentiel neuf dont elle n'aurait donné que le code — et jamais à
     * changer le référentiel visé, ce qui reviendrait à laisser le contenu
     * d'un fichier décider de l'endroit où il s'écrit.
     */
    private ImportReferentielService.CibleImport cibleComplete(
            ImportReferentielService.CibleImport cible, ExtractionReferentielResponseDto reponse) {
        if (cible.referentielId() != null) {
            return cible;
        }
        var propose = reponse.brouillon() == null ? null : reponse.brouillon().referentiel();
        if (propose == null) {
            return cible;
        }
        return new ImportReferentielService.CibleImport(
                null,
                premierRenseigne(cible.codeReferentiel(), propose.code()),
                premierRenseigne(cible.nomReferentiel(), propose.nom()),
                cible.typeReferentiel(),
                cible.numeroVersion());
    }

    private static String premierRenseigne(String choisi, String propose) {
        return choisi == null || choisi.isBlank() ? propose : choisi;
    }
}
