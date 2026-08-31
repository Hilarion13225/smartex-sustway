package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.conformite.NonConformiteService;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Document;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.entity.Preuve;
import com.smartexsustway.api.domain.entity.RevueExperte;
import com.smartexsustway.api.domain.enums.SourceEvaluation;
import com.smartexsustway.api.domain.enums.StatutEvaluation;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.EvaluationRepository;
import com.smartexsustway.api.domain.repository.PreuveRepository;
import com.smartexsustway.api.domain.repository.ReponseQuestionRepository;
import com.smartexsustway.api.domain.repository.RevueExperteRepository;
import com.smartexsustway.api.domain.rules.ScoringEngine;
import com.smartexsustway.api.ia.EvaluerCritereRequestDto;
import com.smartexsustway.api.ia.EvaluerCritereResponseDto;
import com.smartexsustway.api.ia.IaEvaluationClient;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.EvaluationDto;
import com.smartexsustway.api.scoring.ScoreHistoriqueService;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.stockage.StorageService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

/**
 * RG21/RG22/RG27/RG38 - evaluation IA d'un critere : orchestre le pipeline
 * d'agents Python (Document/Evidence/Compliance, voir services-ia-python)
 * puis convertit la probabilite renvoyee en niveau d'engagement via
 * ScoringEngine (deja teste, phase B) - jamais l'inverse : l'IA ne produit
 * jamais de note directement (RG27).
 *
 * RG22/RG38 : si la confiance IA est sous le seuil (0,80 par defaut) et
 * que la formule souscrite est Avancees, une RevueExperte est creee
 * automatiquement (file d'attente - le traitement de la revue elle-meme,
 * par un expert, est un lot ulterieur : ce lot ne fait que l'alimenter).
 */
@Path("/api/v1/entreprises/{entrepriseId}/audits/{auditId}/criteres/{auditCritereId}/evaluations")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class EvaluationResource {

    private static final Logger LOG = Logger.getLogger(EvaluationResource.class);
    private static final String FORMULE_AVANCEES = "AVANCEES";
    /** Reflète AuditCritere.statut par défaut ("A_EVALUER", voir AuditCritere.java). */
    private static final String STATUT_EVALUE = "EVALUE";

    @Inject AuditRepository auditRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject PreuveRepository preuveRepository;
    @Inject ReponseQuestionRepository reponseQuestionRepository;
    @Inject EvaluationRepository evaluationRepository;
    @Inject RevueExperteRepository revueExperteRepository;
    @Inject NonConformiteService nonConformiteService;
    @Inject ScoreHistoriqueService scoreHistoriqueService;
    @Inject StorageService storageService;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @Inject
    @RestClient
    IaEvaluationClient iaEvaluationClient;

    @ConfigProperty(name = "smartex.evaluation.seuil-confiance-revue-experte", defaultValue = "0.80")
    BigDecimal seuilConfianceRevueExperte;

    @GET
    public Response lister(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId,
                            @PathParam("auditCritereId") UUID auditCritereId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);
        trouverAuditCritereDeLaMission(entrepriseId, auditId, auditCritereId);

        var evaluations = evaluationRepository.parAuditCritere(auditCritereId).stream()
                .map(e -> EvaluationDto.depuis(e, e.getStatut() == StatutEvaluation.EN_REVUE))
                .toList();
        return Response.ok(evaluations).build();
    }

    @POST
    @Transactional
    public Response evaluer(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId,
                             @PathParam("auditCritereId") UUID auditCritereId) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);

        Audit audit = trouverAudit(entrepriseId, auditId);
        // Même permission que le dépôt de preuve/questionnaire (ReponseQuestionResource) :
        // lancer l'évaluation est la suite naturelle de la collecte, pas une action distincte.
        String formuleCode = audit.getFormuleAbonnement() == null ? null : audit.getFormuleAbonnement().getCode();
        autorisationService.exigerPermission(utilisateurId, entrepriseId, formuleCode, "preuve:deposer");
        AuditCritere auditCritere = trouverAuditCritereDeLaMission(entrepriseId, auditId, auditCritereId);

        List<Preuve> preuves = preuveRepository.parAuditCritere(auditCritereId);
        List<EvaluerCritereRequestDto.ReponseDeclareeDto> reponses = reponsesDeclarees(auditCritereId);
        String scenario = auditCritere.getScenario();

        // RG09 : la collecte déclarative (réponses au questionnaire, scénario
        // textuel) est une source d'analyse au même titre que les preuves
        // documentaires — l'évaluation reste refusée seulement si le critère
        // ne porte aucun élément, quel qu'il soit.
        if (preuves.isEmpty() && reponses.isEmpty() && scenario == null) {
            return erreur(400, "Aucune preuve, réponse au questionnaire ni scénario sur ce critère "
                    + "— impossible de lancer l'évaluation IA");
        }

        // RG21 : le pipeline d'agents IA dépend de la formule souscrite —
        // calculé une seule fois ici, réutilisé à la fois pour demander
        // (ou non) l'analyse du Risk Agent et pour la logique de revue
        // experte plus bas (déjà présente avant l'ajout du Risk Agent).
        boolean formuleAvancees = estFormuleAvancees(audit);

        List<EvaluerCritereRequestDto.DocumentPourEvaluationDto> documents = new ArrayList<>();
        for (Preuve preuve : preuves) {
            Document document = preuve.getDocument();
            byte[] contenu;
            try {
                contenu = storageService.telecharger(document.getCheminStockage());
            } catch (Exception e) {
                LOG.warnf(e, "Lecture du document %s impossible pour l'évaluation IA", document.getId());
                return erreur(503, "Impossible de lire le document '" + document.getNomOriginal() + "' depuis le stockage");
            }
            String contenuBase64 = Base64.getEncoder().encodeToString(contenu);
            documents.add(new EvaluerCritereRequestDto.DocumentPourEvaluationDto(
                    document.getNomOriginal(), document.getTypeMime(), contenuBase64));
        }

        EvaluerCritereRequestDto requete = new EvaluerCritereRequestDto(
                auditCritereId,
                auditCritere.getCritere().getCode(),
                auditCritere.getCritere().getLibelle(),
                auditCritere.getCritere().getDescription(),
                documents,
                scenario,
                reponses,
                formuleAvancees, // analyseRisque (Risk Agent)
                formuleAvancees  // genererRecommandation (Recommendation Agent) — même condition
                                 // aujourd'hui (RG21), champs distincts pour rester découplables
        );

        EvaluerCritereResponseDto reponse;
        try {
            reponse = iaEvaluationClient.evaluerCritere(requete);
        } catch (Exception e) {
            LOG.warnf(e, "Échec du pipeline d'agents IA pour le critère %s", auditCritere.getCritere().getCode());
            return erreur(503, "Échec du pipeline d'agents IA — réessayez plus tard");
        }

        BigDecimal probabilite = BigDecimal.valueOf(reponse.probabiliteConformite()).setScale(4, RoundingMode.HALF_UP);
        BigDecimal confiance = BigDecimal.valueOf(reponse.confianceIa()).setScale(4, RoundingMode.HALF_UP);

        // RG27 : conversion probabilité -> niveau d'engagement (1-5) exclusivement
        // via ScoringEngine — l'IA ne fournit jamais de note directement.
        int niveau = ScoringEngine.niveauEngagement(probabilite);

        Evaluation evaluation = new Evaluation(auditCritere, probabilite, (short) niveau);
        evaluation.setConfianceIa(confiance);
        evaluation.setJustification(reponse.justification());
        evaluation.setSource(SourceEvaluation.IA);
        evaluation.setSignalRisque(reponse.signalRisque());
        evaluation.setCategorieRisque(reponse.categorieRisque());
        evaluation.setJustificationRisque(reponse.justificationRisque());
        evaluation.setRecommandationNecessaire(reponse.recommandationNecessaire());
        evaluation.setPistesAmelioration(reponse.pistesAmelioration());
        // persistAndFlush (et non persist seul) : @CreationTimestamp n'est
        // renseigné par Hibernate qu'au flush, qui autrement n'aurait lieu
        // qu'à la fin de la transaction — sans ce flush explicite,
        // dateEvaluation reste null dans l'entité en mémoire au moment de
        // construire la réponse ci-dessous (RG14 : la date fait partie de
        // l'historique conservé, y compris dans la réponse renvoyée au client).
        evaluationRepository.persistAndFlush(evaluation);
        // Le critère a désormais une évaluation IA, qu'elle soit déjà validée
        // ou en attente de revue experte — il quitte donc l'onglet "Non
        // évalués" dans les deux cas (voir AuditDetail.jsx, onglets basés sur
        // ce statut).
        auditCritere.setStatut(STATUT_EVALUE);

        boolean revueDeclenchee = declencherRevueExperteSiNecessaire(audit, evaluation, probabilite, (short) niveau, confiance);
        scoreHistoriqueService.enregistrer(audit);

        auditLogService.journaliser(utilisateurId, entrepriseId, "EVALUATION_IA_CREEE", "evaluation", evaluation.getId());

        return Response.status(Response.Status.CREATED).entity(EvaluationDto.depuis(evaluation, revueDeclenchee)).build();
    }

    /**
     * RG22/RG38 : file de revue experte si confiance IA < seuil, formule
     * Avancées uniquement. RG16 : si aucune revue n'est requise, l'analyse
     * IA constitue déjà l'évaluation définitive — l'évaluation passe donc
     * directement à VALIDEE plutôt que de rester indéfiniment PROVISOIRE
     * (le seul autre chemin vers VALIDEE est le traitement d'une revue,
     * voir RevueExperteResource).
     */
    private boolean declencherRevueExperteSiNecessaire(Audit audit, Evaluation evaluation, BigDecimal probabilite,
                                                         short niveau, BigDecimal confiance) {
        if (!estFormuleAvancees(audit) || confiance == null || confiance.compareTo(seuilConfianceRevueExperte) >= 0) {
            evaluation.setStatut(StatutEvaluation.VALIDEE);
            nonConformiteService.genererSiNecessaire(evaluation);
            return false;
        }

        RevueExperte revue = new RevueExperte(evaluation, probabilite, niveau);
        revueExperteRepository.persist(revue);
        evaluation.setStatut(StatutEvaluation.EN_REVUE);
        return true;
    }

    /** RG09 : réponses déjà saisies sur le critère, transmises au pipeline avec les preuves. */
    private List<EvaluerCritereRequestDto.ReponseDeclareeDto> reponsesDeclarees(UUID auditCritereId) {
        return reponseQuestionRepository.parAuditCritere(auditCritereId).stream()
                .filter(r -> r.getValeur() != null || r.getCommentaire() != null)
                .map(r -> new EvaluerCritereRequestDto.ReponseDeclareeDto(
                        r.getAuditQuestion().getQuestion().getLibelle(),
                        r.getValeur() != null ? r.getValeur().name() : null,
                        r.getCommentaire()))
                .toList();
    }

    /** RG21 : le pipeline d'agents exécuté (et donc le Risk Agent) dépend de la formule souscrite. */
    private boolean estFormuleAvancees(Audit audit) {
        return audit.getFormuleAbonnement() != null
                && FORMULE_AVANCEES.equals(audit.getFormuleAbonnement().getCode());
    }

    private Audit trouverAudit(UUID entrepriseId, UUID auditId) {
        Audit audit = auditRepository.findById(auditId);
        if (audit == null || !audit.getEntreprise().getId().equals(entrepriseId)) {
            throw new NotFoundException("Audit introuvable pour cette entreprise");
        }
        return audit;
    }

    private AuditCritere trouverAuditCritereDeLaMission(UUID entrepriseId, UUID auditId, UUID auditCritereId) {
        trouverAudit(entrepriseId, auditId);
        AuditCritere auditCritere = auditCritereRepository.findById(auditCritereId);
        if (auditCritere == null || !auditCritere.getAudit().getId().equals(auditId)) {
            throw new NotFoundException("Critère introuvable pour cette mission");
        }
        return auditCritere;
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}
