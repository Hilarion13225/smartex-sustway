package com.smartexsustway.api.referentiel;

import com.smartexsustway.api.ia.ExtractionReferentielRequestDto;
import com.smartexsustway.api.ia.ExtractionReferentielResponseDto;
import com.smartexsustway.api.ia.ReferentielImportClient;
import io.smallrye.mutiny.infrastructure.Infrastructure;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.ProcessingException;
import jakarta.ws.rs.WebApplicationException;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

import java.util.Base64;
import java.util.Map;
import java.util.UUID;

/**
 * Enchaîne l'analyse d'un fichier de référentiel, de sa lecture au brouillon.
 *
 * Le trajet est : réserver l'import, lire le fichier, le confier au service
 * d'agents, revalider ce qu'il propose, ouvrir un brouillon et l'y déposer.
 *
 * Deux découpages gouvernent cette classe, et ils tirent en sens contraire.
 *
 * D'un côté, aucune transaction n'est tenue ouverte pendant l'appel au service
 * d'agents. Cet appel dure des minutes — un référentiel se lit en plusieurs
 * lots, espacés pour tenir le quota du fournisseur — et une transaction
 * maintenue pendant ce temps immobiliserait une connexion du pool à ne rien
 * faire, jusqu'à les épuiser toutes si plusieurs imports coïncidaient.
 *
 * De l'autre, le dépôt du contenu est fait d'un seul tenant. Un brouillon à
 * moitié écrit — trois domaines, quatre critères, puis une erreur — serait
 * indistinguable d'un brouillon complet pour qui le relit, et la version
 * porterait un contenu que personne n'a voulu.
 *
 * Aucun réessai automatique. Un import en échec est relançable à la main, et
 * c'est délibéré : rejouer tout seul un appel qui a échoué peut consommer un
 * quota déjà à bout, ou refaire un travail long dont personne n'attend plus
 * le résultat. La reprise est une décision, pas un effet de bord.
 */
@ApplicationScoped
public class AnalyseImportOrchestrateur {

    private static final Logger LOG = Logger.getLogger(AnalyseImportOrchestrateur.class);

    /**
     * Longueur au-delà de laquelle un motif d'échec est coupé.
     *
     * Le motif est stocké et réaffiché ; une réponse d'erreur inhabituellement
     * longue — une page HTML d'un intermédiaire réseau, par exemple — n'a pas
     * à remplir la colonne ni l'écran.
     */
    private static final int LONGUEUR_MOTIF_MAXIMALE = 2000;

    @Inject ImportReferentielService importService;
    @Inject DepotImportTransactionnel depot;

    @Inject
    @RestClient
    ReferentielImportClient client;

    /**
     * Lance l'analyse et rend la main tout de suite.
     *
     * Rend faux si l'import est déjà pris : la ressource en fait un 409. Le
     * travail part sur le pool de travail brut et non sur {@code
     * ManagedExecutor}, qui propagerait le contexte de la requête HTTP — dont
     * la session de persistance se ferme dès la réponse envoyée. C'est le
     * défaut corrigé en phase 2 : la passe mourait par intermittence sur
     * « statement fermé ».
     */
    public boolean lancer(UUID importId, ImportReferentielService.CibleImport cible, UUID utilisateurId) {
        if (!importService.reclamerPourAnalyse(importId, utilisateurId)) {
            return false;
        }
        Infrastructure.getDefaultWorkerPool().execute(() -> executer(importId, cible, utilisateurId));
        return true;
    }

    /**
     * Déroule l'analyse. Ne lève jamais : tout échec est consigné sur l'import.
     *
     * Une exception qui remonterait d'ici finirait dans les journaux du pool
     * de travail, et l'import resterait indéfiniment « analyse en cours » sans
     * que personne ne sache pourquoi.
     */
    void executer(UUID importId, ImportReferentielService.CibleImport cible, UUID utilisateurId) {
        try {
            var descripteur = importService.descripteurFichier(importId);
            byte[] contenu = importService.contenuDe(descripteur);

            var requete = new ExtractionReferentielRequestDto(
                    importId, descripteur.nomFichier(), descripteur.typeMime(),
                    Base64.getEncoder().encodeToString(contenu));

            LOG.infof("Import %s : extraction confiée au service d'agents (%s, %d octets)",
                    importId, descripteur.typeMime(), contenu.length);
            ExtractionReferentielResponseDto reponse = client.extraire(requete);

            depot.deposer(importId, cible, reponse, utilisateurId);
        } catch (Exception e) {
            String motif = motifDe(e);
            // La trace complète reste ici ; ce qui est conservé sur l'import,
            // donc réaffiché, est une phrase.
            LOG.errorf(e, "Import %s : analyse en échec", importId);
            try {
                importService.marquerEchec(importId, motif);
            } catch (Exception secondaire) {
                LOG.errorf(secondaire, "Import %s : l'échec n'a pas pu être consigné", importId);
            }
        }
    }

    /**
     * Traduit une défaillance en une phrase que l'écran d'administration peut
     * afficher.
     *
     * Rien de ce qui sort d'ici ne contient de trace d'exécution ni de nom de
     * classe : ce texte est rendu à l'appelant, et lui décrire l'intérieur du
     * service ne l'aiderait pas à agir. Chaque cas dit ce qui s'est passé et,
     * quand il y en a une, la suite à donner.
     */
    private String motifDe(Exception e) {
        if (e instanceof BrouillonImporteService.ContenuRefuseException refus) {
            return "Contenu proposé refusé : " + refus.getMessage();
        }
        if (e instanceof ImportReferentielService.FichierRefuseException refus) {
            return refus.getMessage();
        }
        if (e instanceof VersionReferentielService.VersionFigeeException figee) {
            return "Brouillon impossible à ouvrir : " + figee.getMessage();
        }
        if (e instanceof WebApplicationException web) {
            return motifDuServiceIa(web);
        }
        if (e instanceof ProcessingException) {
            // Connexion refusée, délai dépassé, réponse illisible : rien ne
            // distingue ici une panne d'une lenteur, et prétendre le contraire
            // enverrait la personne chercher au mauvais endroit.
            return "Le service d'analyse est injoignable ou n'a pas répondu dans le délai imparti";
        }
        return "L'analyse a échoué pour une raison inattendue ; voir les journaux du service";
    }

    private String motifDuServiceIa(WebApplicationException e) {
        int statut = e.getResponse() == null ? 0 : e.getResponse().getStatus();
        String detail = detailDe(e);
        return switch (statut) {
            case 401, 403 -> "Le service d'analyse a refusé l'appel : vérifiez la configuration "
                    + "des clés de signature entre les deux services";
            case 413 -> "Le fichier est trop volumineux pour le service d'analyse";
            case 422 -> "Le document n'a pas pu être exploité : " + detail;
            case 429 -> "Le quota du fournisseur d'analyse est atteint ; relancez l'import plus tard";
            case 503 -> "Le service d'analyse est indisponible : " + detail;
            default -> "Le service d'analyse a répondu " + statut
                    + (detail.isBlank() ? "" : " : " + detail);
        };
    }

    /**
     * Extrait le {@code detail} de la réponse d'erreur du service d'agents.
     *
     * FastAPI rend {@code {"detail": "..."}}. Le corps n'est lu qu'une fois —
     * un flux d'entité consommé deux fois lève — et toute difficulté de
     * lecture rend une chaîne vide plutôt que de masquer l'erreur d'origine
     * derrière une erreur de lecture d'erreur.
     */
    private String detailDe(WebApplicationException e) {
        try {
            var reponse = e.getResponse();
            if (reponse == null || !reponse.hasEntity()) {
                return "";
            }
            Map<?, ?> corps = reponse.readEntity(Map.class);
            Object detail = corps == null ? null : corps.get("detail");
            return detail == null ? "" : tronquer(detail.toString());
        } catch (Exception ignore) {
            return "";
        }
    }

    private static String tronquer(String texte) {
        return texte.length() <= LONGUEUR_MOTIF_MAXIMALE
                ? texte
                : texte.substring(0, LONGUEUR_MOTIF_MAXIMALE) + "…";
    }
}
