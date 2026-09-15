package com.smartexsustway.api.mission;

import com.smartexsustway.api.domain.entity.AnalyseIa;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Document;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.entity.EvaluationDocumentAnalyse;
import com.smartexsustway.api.domain.entity.Preuve;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.enums.FormulePipeline;
import com.smartexsustway.api.domain.enums.SourceEvaluation;
import com.smartexsustway.api.domain.enums.StatutEvaluation;
import com.smartexsustway.api.domain.repository.AnalyseIaRepository;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.PreuveRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.domain.rules.ScoringEngine;
import com.smartexsustway.api.ia.IaEvaluationClientV2;
import com.smartexsustway.api.ia.contrat.ConstructionContexteIa;
import com.smartexsustway.api.ia.contrat.EnveloppeV2Dto;
import com.smartexsustway.api.ia.contrat.EvaluerCritereRequestV2;
import com.smartexsustway.api.stockage.StorageService;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

/**
 * Le parcours V2 : construire le contexte, appeler les agents, persister.
 *
 * <p>Trois différences de fond avec le parcours V1, et chacune répond à un
 * défaut constaté :
 *
 * <ol>
 *   <li><strong>L'évaluation naît {@code EN_REVUE}.</strong> Le V1 écrit
 *       {@code VALIDEE} (RG16), ce qui fait entrer une sortie de modèle dans
 *       le score officiel et génère une non-conformité opposable sans
 *       qu'aucun humain n'ait relu. Ici, la validation est un geste séparé,
 *       et la non-conformité naît avec elle.</li>
 *   <li><strong>L'exécution est tracée.</strong> {@code analyse_ia} et
 *       {@code execution_agent} sont alimentées à partir de ce que le
 *       service d'agents rapporte réellement — dont le modèle servi, seul
 *       témoin fiable de ce qui a répondu.</li>
 *   <li><strong>Le détail est conservé.</strong> Le V1 aplatit tout en un
 *       chiffre et un texte ; le V2 conserve l'avis par preuve attendue,
 *       les constats par document, les signaux de risque et les
 *       recommandations rattachées.</li>
 * </ol>
 *
 * <h2>Découpage transactionnel</h2>
 *
 * Trois temps, et jamais une transaction ouverte pendant l'appel réseau :
 *
 * <pre>
 *   T1  ouvrir analyse_ia (EN_COURS)      transaction courte, refermée
 *   --  appel au service d'agents         HORS transaction
 *   T2  persister le résultat             transaction unique
 * </pre>
 *
 * Tenir une transaction ouverte pendant un appel qui dure des dizaines de
 * secondes immobiliserait une connexion et un verrou pour rien.
 *
 * <h2>La table de références</h2>
 *
 * {@link ConstructionContexteIa.Contexte} porte le payload <em>et</em> la
 * table qui permet de relire ses références. Les deux ne valent qu'ensemble :
 * une référence lue dans une réponse ne se résout que contre la table du
 * payload qui l'a produite, et celle-ci n'est persistée nulle part. La
 * résolution doit donc avoir lieu ici, dans le même appel — un traitement
 * différé la rendrait impossible.
 */
@ApplicationScoped
public class AnalyseCritereV2Service {

    private static final Logger LOG = Logger.getLogger(AnalyseCritereV2Service.class);
    private static final String FORMULE_AVANCEES = "AVANCEES";

    @Inject PreuveRepository preuveRepository;
    @Inject AuditRepository auditRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject AnalyseIaRepository analyseIaRepository;
    @Inject ConstructionContexteIa constructionContexteIa;
    @Inject PersistanceResultatV2Service persistance;
    @Inject StorageService storageService;

    @Inject
    @RestClient
    IaEvaluationClientV2 iaEvaluationClientV2;

    /** Issue d'une passe V2. Les échecs sont des valeurs, non des exceptions. */
    public sealed interface Resultat {
        /** Le critère porte une évaluation en revue, prête à être relue. */
        record Analyse(UUID evaluationId, UUID analyseIaId, List<String> agentsExecutes)
                implements Resultat {}

        record RienAAnalyser() implements Resultat {}

        /**
         * Une analyse est déjà en cours sur ce critère.
         *
         * <p>Cas distinct d'un échec : rien ne s'est mal passé, la demande
         * arrive simplement trop tôt. L'appelant en fait un 409.
         */
        record DejaEnCours() implements Resultat {}

        /** Le message est destiné à l'appelant : jamais d'exception brute. */
        record Echec(String message) implements Resultat {}

        /** RG35 : critère exclu pendant l'analyse ; passe close en erreur, rien d'écrit. L'appelant en fait un 409. */
        record HorsPerimetre(String message) implements Resultat {}
    }

    public Resultat analyser(UUID auditId, UUID auditCritereId, UUID declencheParId) {
        // --- T0 : réservation atomique -----------------------------------
        //
        // Courte et volontairement pauvre : elle prend le verrou, vérifie,
        // écrit la réservation, et rend la main. Tout ce qui coûte —
        // téléchargement des pièces, construction du contexte — se fait
        // après, verrou libéré.
        UUID analyseIaId;
        try {
            analyseIaId = QuarkusTransaction.requiringNew().call(
                    () -> reserver(auditId, auditCritereId, declencheParId));
        } catch (RienAAnalyserException e) {
            return new Resultat.RienAAnalyser();
        } catch (DejaEnCoursException e) {
            // Aucune réservation n'a été prise : rien à libérer.
            LOG.infof("Analyse V2 refusée : une passe est déjà en cours sur le critère %s",
                    auditCritereId);
            return new Resultat.DejaEnCours();
        } catch (Exception e) {
            LOG.warnf(e, "Réservation de l'analyse V2 impossible pour le critère %s", auditCritereId);
            return new Resultat.Echec("Préparation de l'analyse impossible");
        }

        // À partir d'ici la réservation existe : tout chemin de sortie doit
        // la refermer, sans quoi le critère resterait bloqué.
        ContexteEtPasse prepare;
        try {
            prepare = QuarkusTransaction.requiringNew().call(
                    () -> construireContexte(auditId, auditCritereId, analyseIaId));
        } catch (Exception e) {
            LOG.warnf(e, "Construction du contexte V2 impossible pour le critère %s", auditCritereId);
            clore(analyseIaId, "INTERNE", "Construction du contexte impossible");
            return new Resultat.Echec("Préparation de l'analyse impossible");
        }

        // --- Appel, hors de toute transaction ----------------------------
        EnveloppeV2Dto enveloppe;
        try {
            enveloppe = iaEvaluationClientV2.executerCritere(prepare.payload());
        } catch (Exception e) {
            // Le texte de l'exception ne franchit pas la frontière : il peut
            // porter un fragment d'URL ou de requête. La passe est close en
            // erreur pour que l'échec laisse une trace consultable — et pour
            // que le critère redevienne analysable.
            LOG.warnf(e, "Pipeline V2 en échec pour le critère %s", auditCritereId);
            clore(analyseIaId, "INTERNE",
                    "Appel au service d'agents en échec (" + e.getClass().getSimpleName() + ")");
            return new Resultat.Echec("Échec du pipeline d'agents IA — réessayez plus tard");
        }

        // --- T2 : persistance -------------------------------------------
        try {
            return QuarkusTransaction.requiringNew().call(
                    () -> persister(prepare, enveloppe));
        } catch (Exception e) {
            LOG.errorf(e, "Persistance du résultat V2 impossible pour le critère %s", auditCritereId);
            clore(analyseIaId, "INTERNE", "Persistance du résultat impossible");
            return new Resultat.Echec("Le résultat n'a pas pu être enregistré");
        }
    }

    /** Le contexte construit et la passe ouverte, transmis d'un temps à l'autre. */
    private record ContexteEtPasse(UUID auditId, UUID auditCritereId, UUID analyseIaId,
                                   EvaluerCritereRequestV2 payload,
                                   ConstructionContexteIa.Contexte contexte) {
    }

    private static final class RienAAnalyserException extends RuntimeException {
        RienAAnalyserException() {
            super(null, null, false, false);
        }
    }

    private static final class DejaEnCoursException extends RuntimeException {
        DejaEnCoursException() {
            super(null, null, false, false);
        }
    }

    /**
     * Réserve le critère, ou refuse.
     *
     * <p>Le verrou de ligne sur {@code audit_critere} rend la séquence
     * atomique : deux requêtes concurrentes ne peuvent pas lire toutes les
     * deux « aucune analyse en cours » avant que l'une n'écrive. La seconde
     * attend le commit de la première, puis voit la réservation et refuse.
     *
     * <p>Le verrou est tenu par PostgreSQL. C'est ce qui le rend valable
     * entre deux instances de l'application, là où un verrou en mémoire ne
     * protégerait que son propre processus.
     *
     * <p>L'ordre des contrôles compte : on refuse « rien à analyser »
     * <em>avant</em> de réserver, sans quoi une demande vide poserait une
     * réservation qu'il faudrait ensuite défaire.
     */
    private UUID reserver(UUID auditId, UUID auditCritereId, UUID declencheParId) {
        AuditCritere auditCritere = auditCritereRepository.verrouiller(auditCritereId)
                .orElseThrow(() -> new IllegalStateException("Critère introuvable"));
        Audit audit = auditRepository.findById(auditId);

        List<Preuve> preuves = preuveRepository.parAuditCritere(auditCritereId);
        if (preuves.isEmpty() && auditCritere.getScenario() == null) {
            throw new RienAAnalyserException();
        }

        if (analyseIaRepository.enCoursSurCritere(auditCritereId).isPresent()) {
            throw new DejaEnCoursException();
        }

        boolean avancees = estFormuleAvancees(audit);
        AnalyseIa passe = new AnalyseIa(audit, auditCritere,
                avancees ? FormulePipeline.AVANCEES : FormulePipeline.STANDARD);
        passe.setContratVersion(EvaluerCritereRequestV2.VERSION);
        if (declencheParId != null) {
            passe.setDeclenchePar(utilisateurRepository.findById(declencheParId));
        }
        analyseIaRepository.persistAndFlush(passe);
        return passe.getId();
    }

    /**
     * Télécharge les pièces et construit le contexte soumis aux agents.
     *
     * <p>Hors du verrou : ces opérations touchent le stockage objet et
     * peuvent durer. Les tenir sous verrou sérialiserait des
     * téléchargements qui n'ont aucune raison de l'être.
     */
    private ContexteEtPasse construireContexte(UUID auditId, UUID auditCritereId, UUID analyseIaId) {
        Audit audit = auditRepository.findById(auditId);
        AuditCritere auditCritere = auditCritereRepository.findById(auditCritereId);

        List<ConstructionContexteIa.PieceSource> pieces = new ArrayList<>();
        for (Preuve preuve : preuveRepository.parAuditCritere(auditCritereId)) {
            Document document = preuve.getDocument();
            byte[] contenu = storageService.telecharger(document.getCheminStockage());
            pieces.add(new ConstructionContexteIa.PieceSource(
                    document.getNomOriginal(), document.getTypeMime(),
                    document.getTaille(), Base64.getEncoder().encodeToString(contenu)));
        }

        var contexte = constructionContexteIa.construire(audit, auditCritere, pieces);
        return new ContexteEtPasse(auditId, auditCritereId, analyseIaId,
                contexte.payload(), contexte);
    }

    private Resultat persister(ContexteEtPasse prepare, EnveloppeV2Dto enveloppe) {
        // RG35-HARDENING : verrou pris en premier, avant tout chargement qui
        // placerait le critère dans le contexte de persistance — l'état relu
        // est donc celui de la base, exclusion concurrente comprise.
        AuditCritere auditCritere = auditCritereRepository.verrouiller(prepare.auditCritereId())
                .orElseThrow(() -> new IllegalStateException("Critère introuvable"));
        AnalyseIa passe = analyseIaRepository.findById(prepare.analyseIaId());
        if (!auditCritere.isActif() || !auditCritere.isApplicable()) {
            // Exclu pendant l'appel aux agents : rien n'est écrit, ni évaluation
            // en revue ni axe. La passe est close par le mécanisme d'échec
            // existant, dans la même transaction, pour qu'aucune passe EN_COURS
            // ne reste derrière elle.
            passe.echouer("INTERNE", "Critère exclu du périmètre pendant l'analyse");
            return new Resultat.HorsPerimetre(AnalyseCritereService.messageHorsPerimetre(auditCritere));
        }
        Audit audit = auditRepository.findById(prepare.auditId());

        Evaluation evaluation = persistance.persister(
                audit, auditCritere, passe, prepare.contexte(), enveloppe);

        List<String> agents = enveloppe.execution() == null || enveloppe.execution().agents_executes() == null
                ? List.of()
                : enveloppe.execution().agents_executes();

        return new Resultat.Analyse(evaluation.getId(), passe.getId(), agents);
    }

    /** Clôt une passe en erreur, dans sa propre transaction. */
    private void clore(UUID analyseIaId, String type, String messageAssaini) {
        try {
            QuarkusTransaction.requiringNew().run(() -> {
                AnalyseIa passe = analyseIaRepository.findById(analyseIaId);
                if (passe != null) {
                    passe.echouer(type, messageAssaini);
                }
            });
        } catch (Exception e) {
            // Ne jamais masquer l'échec d'origine par celui de sa trace.
            LOG.warnf(e, "Clôture en erreur de la passe %s impossible", analyseIaId);
        }
    }

    private boolean estFormuleAvancees(Audit audit) {
        return audit.getFormuleAbonnement() != null
                && FORMULE_AVANCEES.equalsIgnoreCase(audit.getFormuleAbonnement().getCode());
    }
}
