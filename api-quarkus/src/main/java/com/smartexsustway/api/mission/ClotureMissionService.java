package com.smartexsustway.api.mission;

import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.enums.StatutAudit;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Clôture d'une mission : passe d'analyse complète, puis gel du résultat.
 *
 * Les déclarations et les preuves s'accumulent librement pendant la mission
 * sans produire de note ; c'est la clôture qui confronte l'ensemble aux
 * agents IA, critère par critère, et fixe le score définitif. Un seul moment
 * de vérité, à la demande du responsable audit.
 *
 * La passe s'exécute en arrière-plan : une mission de quatre-vingt-douze
 * critères demande autant d'appels au pipeline, ce qu'aucune requête HTTP
 * synchrone ne tiendrait. L'avancement est publié en mémoire et consultable
 * pendant l'exécution.
 */
@ApplicationScoped
public class ClotureMissionService {

    private static final Logger LOG = Logger.getLogger(ClotureMissionService.class);

    @Inject AuditRepository auditRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject AnalyseCritereService analyseCritereService;

    /**
     * Pause entre deux analyses. Réglée par défaut à quatre secondes et demie,
     * soit un peu plus que les quatre secondes qu'impose un plafond de quinze
     * requêtes par minute — la marge absorbe la durée variable des appels.
     * À ramener à zéro sur une offre sans plafond.
     */
    @ConfigProperty(name = "smartex.cloture.delai-entre-analyses-ms", defaultValue = "4500")
    long delaiEntreAnalysesMs;

    /** Pause avant de réessayer les critères en échec, le temps que le quota se reconstitue. */
    @ConfigProperty(name = "smartex.cloture.delai-seconde-tentative-ms", defaultValue = "45000")
    long delaiAvantSecondeTentativeMs;

    /**
     * Avancement d'une passe de clôture.
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
     * ne survit pas à un redémarrage, mais relancer une clôture est sans
     * danger — les analyses déjà faites sont simplement refaites.
     */
    private final Map<UUID, Avancement> avancements = new ConcurrentHashMap<>();

    /** Avancement d'une clôture en cours, s'il y en a une. */
    public Avancement avancement(UUID auditId) {
        return avancements.get(auditId);
    }

    /** Une clôture est-elle déjà en cours sur cette mission ? */
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

    /** Prépare l'avancement avant le lancement, pour qu'il soit lisible dès la réponse HTTP. */
    public Avancement preparer(UUID auditId, int total) {
        Avancement initial = new Avancement(auditId, total, 0, 0, 0, 0, false);
        avancements.put(auditId, initial);
        return initial;
    }

    /**
     * Exécute la passe puis clôt la mission.
     *
     * Chaque critère est analysé dans sa propre transaction : une mission de
     * quatre-vingt-douze critères tenue dans une seule transaction garderait
     * la base verrouillée plusieurs minutes, et un échec au dernier critère
     * annulerait les quatre-vingt-onze analyses précédentes.
     */
    public void executer(UUID auditId) {
        List<UUID> critereIds = criteresAAnalyser(auditId).stream().map(AuditCritere::getId).toList();
        int total = critereIds.size();
        int analyses = 0;
        int sansElement = 0;
        var enEchec = new ArrayList<UUID>();

        for (int i = 0; i < total; i++) {
            var issue = analyserUnCritere(auditId, critereIds.get(i));
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
            LOG.infof("Clôture %s : nouvelle tentative sur %d critère(s) en échec", auditId, enEchec.size());
            patienter(delaiAvantSecondeTentativeMs);
            var echecsDefinitifs = new ArrayList<UUID>();
            for (UUID critereId : enEchec) {
                if (analyserUnCritere(auditId, critereId) == Issue.ANALYSE) {
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

        cloturer(auditId);
        avancements.put(auditId,
                new Avancement(auditId, total, total, analyses, sansElement, enEchec.size(), true));
        LOG.infof("Clôture de la mission %s : %d analysés, %d sans élément, %d échecs",
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

    private enum Issue { ANALYSE, RIEN, ECHEC }

    @Transactional
    Issue analyserUnCritere(UUID auditId, UUID auditCritereId) {
        Audit audit = auditRepository.findById(auditId);
        AuditCritere auditCritere = auditCritereRepository.findById(auditCritereId);
        if (audit == null || auditCritere == null) {
            return Issue.ECHEC;
        }
        var resultat = analyseCritereService.analyser(audit, auditCritere);
        if (resultat instanceof AnalyseCritereService.Resultat.Analyse) {
            return Issue.ANALYSE;
        }
        if (resultat instanceof AnalyseCritereService.Resultat.RienAAnalyser) {
            return Issue.RIEN;
        }
        return Issue.ECHEC;
    }

    @Transactional
    void cloturer(UUID auditId) {
        Audit audit = auditRepository.findById(auditId);
        if (audit != null) {
            audit.setStatut(StatutAudit.TERMINE);
        }
    }

    /** Vue de lecture seule des clôtures suivies, pour les diagnostics. */
    public Map<UUID, Avancement> tousLesAvancements() {
        return Collections.unmodifiableMap(avancements);
    }
}
