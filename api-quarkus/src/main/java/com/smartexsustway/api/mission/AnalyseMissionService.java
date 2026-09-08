package com.smartexsustway.api.mission;

import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Passe d'analyse sur tous les critères d'une mission.
 *
 * Les déclarations et les preuves s'accumulent librement pendant la mission
 * sans produire de note ; cette passe confronte l'ensemble aux agents IA,
 * critère par critère, et fixe les scores.
 *
 * Elle ne clôture pas : lancer l'analyse et figer la mission sont deux
 * décisions distinctes, portées par deux permissions distinctes
 * (analyse:executer et audit:cloturer). Les enchaîner ferait qu'une personne
 * habilitée à clôturer déclencherait des appels au modèle sans détenir la
 * permission qui les gouverne.
 *
 * La passe s'exécute en arrière-plan : une mission de quatre-vingt-douze
 * critères demande autant d'appels au pipeline, ce qu'aucune requête HTTP
 * synchrone ne tiendrait. L'avancement est publié en mémoire et consultable
 * pendant l'exécution.
 */
@ApplicationScoped
public class AnalyseMissionService {

    private static final Logger LOG = Logger.getLogger(AnalyseMissionService.class);

    @Inject AuditCritereRepository auditCritereRepository;
    @Inject AnalyseTransactionnelle transactions;

    /**
     * Pause entre deux analyses. Réglée par défaut à quatre secondes et demie,
     * soit un peu plus que les quatre secondes qu'impose un plafond de quinze
     * requêtes par minute — la marge absorbe la durée variable des appels.
     * À ramener à zéro sur une offre sans plafond.
     */
    @ConfigProperty(name = "smartex.analyse.delai-entre-analyses-ms", defaultValue = "4500")
    long delaiEntreAnalysesMs;

    /** Pause avant de réessayer les critères en échec, le temps que le quota se reconstitue. */
    @ConfigProperty(name = "smartex.analyse.delai-seconde-tentative-ms", defaultValue = "45000")
    long delaiAvantSecondeTentativeMs;

    /**
     * Avancement d'une passe d'analyse.
     *
     * `sansElement` compte les critères sur lesquels l'organisation n'a rien
     * fourni : ils ne sont pas des échecs, simplement rien à analyser, et
     * resteront hors du score.
     */
    public record Avancement(
            UUID auditId,
            int total,
            int traites,
            int analyses,
            int sansElement,
            int echecs,
            boolean terminee
    ) {
    }

    /**
     * Avancements en cours, par mission. En mémoire volontairement : cet état
     * ne survit pas à un redémarrage, mais relancer une passe est sans
     * danger — les analyses déjà faites sont simplement refaites.
     */
    private final Map<UUID, Avancement> avancements = new ConcurrentHashMap<>();

    /** Avancement d'une passe en cours, s'il y en a une. */
    public Avancement avancement(UUID auditId) {
        return avancements.get(auditId);
    }

    /** Une passe est-elle déjà en cours sur cette mission ? */
    public boolean enCours(UUID auditId) {
        Avancement a = avancements.get(auditId);
        return a != null && !a.terminee();
    }

    /** Critères que la passe traitera : ceux que la mission porte réellement. */
    public List<AuditCritere> criteresAAnalyser(UUID auditId) {
        return auditCritereRepository.parAudit(auditId).stream()
                .filter(AuditCritere::isActif)
                .filter(AuditCritere::isApplicable)
                .toList();
    }

    /**
     * Critères que l'organisation a renseignés mais que l'IA n'a pas encore
     * analysés — statut DECLARE, posé à la saisie du questionnaire et remplacé
     * par EVALUE une fois l'analyse faite.
     *
     * C'est ce qui reste en suspens dans une mission : un critère A_EVALUER
     * n'attend rien, personne n'a rien fourni dessus, et il restera hors du
     * score.
     */
    public List<AuditCritere> criteresEnAttenteDAnalyse(UUID auditId) {
        return criteresAAnalyser(auditId).stream()
                .filter(c -> AnalyseCritereService.STATUT_DECLARE.equals(c.getStatut()))
                .toList();
    }

    /** Prépare l'avancement avant le lancement, pour qu'il soit lisible dès la réponse HTTP. */
    public Avancement preparer(UUID auditId, int total) {
        Avancement initial = new Avancement(auditId, total, 0, 0, 0, 0, false);
        avancements.put(auditId, initial);
        return initial;
    }

    /**
     * Exécute la passe. Ne change pas le statut de la mission : la clôture
     * est une opération séparée, décidée après lecture des résultats.
     *
     * Tous les accès à la base passent par AnalyseTransactionnelle : ce fil
     * s'exécute après la fin de la requête HTTP et ne peut pas emprunter sa
     * session, chaque critère ouvrant donc sa propre transaction.
     */
    public void executer(UUID auditId) {
        List<UUID> critereIds = transactions.idsDesCriteresAAnalyser(auditId);
        int total = critereIds.size();
        int analyses = 0;
        int sansElement = 0;
        var enEchec = new ArrayList<UUID>();

        for (int i = 0; i < total; i++) {
            var issue = transactions.analyserUnCritere(auditId, critereIds.get(i));
            switch (issue) {
                case ANALYSE -> {
                    analyses++;
                    // Le fournisseur du modèle plafonne les requêtes par minute
                    // (15 sur l'offre gratuite Gemini). Enchaîner sans pause
                    // épuise le quota au bout de quelques critères et fait
                    // échouer tout le reste de la passe.
                    patienter(delaiEntreAnalysesMs);
                }
                case RIEN -> sansElement++;
                case ECHEC -> enEchec.add(critereIds.get(i));
            }
            avancements.put(auditId,
                    new Avancement(auditId, total, i + 1, analyses, sansElement, enEchec.size(), false));
        }

        // Un échec vient le plus souvent d'un quota momentanément épuisé, pas
        // d'un critère fautif : une seconde tentative après une pause plus
        // longue récupère ces critères sans refaire toute la passe.
        if (!enEchec.isEmpty()) {
            LOG.infof("Analyse %s : nouvelle tentative sur %d critère(s) en échec", auditId, enEchec.size());
            patienter(delaiAvantSecondeTentativeMs);
            var echecsDefinitifs = new ArrayList<UUID>();
            for (UUID critereId : enEchec) {
                if (transactions.analyserUnCritere(auditId, critereId)
                        == AnalyseTransactionnelle.Issue.ANALYSE) {
                    analyses++;
                    patienter(delaiEntreAnalysesMs);
                } else {
                    echecsDefinitifs.add(critereId);
                }
                avancements.put(auditId,
                        new Avancement(auditId, total, total, analyses, sansElement, echecsDefinitifs.size(), false));
            }
            enEchec = echecsDefinitifs;
        }

        avancements.put(auditId,
                new Avancement(auditId, total, total, analyses, sansElement, enEchec.size(), true));
        LOG.infof("Analyse de la mission %s : %d analysés, %d sans élément, %d échecs",
                auditId, analyses, sansElement, enEchec.size());
    }

    /** Pause entre deux appels au pipeline ; une interruption abrège la passe sans la faire échouer. */
    private static void patienter(long millisecondes) {
        if (millisecondes <= 0) {
            return;
        }
        try {
            Thread.sleep(millisecondes);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    /** Vue de lecture seule des passes suivies, pour les diagnostics. */
    public Map<UUID, Avancement> tousLesAvancements() {
        return Collections.unmodifiableMap(avancements);
    }
}
