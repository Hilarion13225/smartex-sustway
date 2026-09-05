package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.conformite.NonConformiteService;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Document;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.entity.Preuve;
import com.smartexsustway.api.domain.enums.SourceEvaluation;
import com.smartexsustway.api.domain.enums.StatutEvaluation;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.EvaluationRepository;
import com.smartexsustway.api.domain.repository.PreuveRepository;
import com.smartexsustway.api.domain.repository.ReponseQuestionRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.domain.rules.ScoringEngine;
import com.smartexsustway.api.ia.EvaluerCritereRequestDto;
import com.smartexsustway.api.ia.EvaluerCritereResponseDto;
import com.smartexsustway.api.ia.IaEvaluationClient;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.EvaluationDto;
import com.smartexsustway.api.resource.dto.EvaluationExperteRequestDto;
import com.smartexsustway.api.scoring.ScoreHistoriqueService;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.stockage.StorageService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

/**
 * RG21/RG27 - evaluation IA d'un critere : orchestre le pipeline d'agents
 * Python (Document/Evidence/Compliance, voir services-ia-python) puis
 * convertit la probabilite renvoyee en niveau d'engagement via ScoringEngine
 * (deja teste, phase B) - jamais l'inverse : l'IA ne produit jamais de note
 * directement (RG27). L'évaluation est validée immédiatement (RG16) — la
 * revue experte (supervision humaine des évaluations à faible confiance) a
 * été retirée du produit.
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
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EvaluationRepository evaluationRepository;
    @Inject NonConformiteService nonConformiteService;
    @Inject ScoreHistoriqueService scoreHistoriqueService;
    @Inject StorageService storageService;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @Inject
    @RestClient
    IaEvaluationClient iaEvaluationClient;

    @GET
    public Response lister(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId,
                            @PathParam("auditCritereId") UUID auditCritereId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);
        trouverAuditCritereDeLaMission(entrepriseId, auditId, auditCritereId);

        var evaluations = evaluationRepository.parAuditCritere(auditCritereId).stream()
                .map(EvaluationDto::depuis)
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
        // détermine si le Risk Agent et le Recommendation Agent sont exécutés.
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
        // Le critère a désormais une évaluation IA — il quitte donc l'onglet
        // "Non évalués" (voir AuditDetail.jsx, onglets basés sur ce statut).
        auditCritere.setStatut(STATUT_EVALUE);

        // RG16 : l'analyse IA constitue directement l'évaluation définitive
        // (la revue experte — supervision humaine des évaluations à faible
        // confiance — a été retirée du produit).
        evaluation.setStatut(StatutEvaluation.VALIDEE);
        nonConformiteService.genererSiNecessaire(evaluation);
        scoreHistoriqueService.enregistrer(audit);

        auditLogService.journaliser(utilisateurId, entrepriseId, "EVALUATION_IA_CREEE", "evaluation", evaluation.getId());

        return Response.status(Response.Status.CREATED).entity(EvaluationDto.depuis(evaluation)).build();
    }

    /**
     * Enregistre l'évaluation d'un critère saisie par un auditeur, sur
     * l'échelle de maturité en cinq niveaux.
     *
     * RG27 impose que {@code note} soit toujours dérivée d'une probabilité de
     * conformité via ScoringEngine, jamais posée telle quelle. Le niveau choisi
     * est donc converti en probabilité représentative de sa plage Likert
     * (voir {@link #probabiliteRepresentative}), puis reconverti en note par le
     * même ScoringEngine que le flux IA : la règle vaut aussi pour la saisie
     * humaine, et la note reste cohérente avec la probabilité stockée.
     *
     * Ré-évaluer un critère ajoute une évaluation sans supprimer les
     * précédentes : RG14 impose de conserver l'historique complet.
     */
    @PUT
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response enregistrerEvaluationExperte(@PathParam("entrepriseId") UUID entrepriseId,
                                                 @PathParam("auditId") UUID auditId,
                                                 @PathParam("auditCritereId") UUID auditCritereId,
                                                 @Valid EvaluationExperteRequestDto requete) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);

        Audit audit = trouverAudit(entrepriseId, auditId);
        // Même permission que le dépôt de preuve et le questionnaire : saisir
        // le niveau fait partie de la collecte, pas d'une action distincte.
        String formuleCode = audit.getFormuleAbonnement() == null ? null : audit.getFormuleAbonnement().getCode();
        autorisationService.exigerPermission(utilisateurId, entrepriseId, formuleCode, "preuve:deposer");
        AuditCritere auditCritere = trouverAuditCritereDeLaMission(entrepriseId, auditId, auditCritereId);

        BigDecimal probabilite = probabiliteRepresentative(requete.niveau());
        int niveau = ScoringEngine.niveauEngagement(probabilite);

        Evaluation evaluation = new Evaluation(auditCritere, probabilite, (short) niveau);
        evaluation.setSource(SourceEvaluation.EXPERT);
        evaluation.setJustification(requete.justification());
        evaluation.setAuteur(utilisateurRepository.findById(utilisateurId));
        // RG16 : l'évaluation est définitive dès son enregistrement, comme
        // pour le flux IA (la revue experte a été retirée du produit).
        evaluation.setStatut(StatutEvaluation.VALIDEE);
        evaluationRepository.persistAndFlush(evaluation);

        auditCritere.setStatut(STATUT_EVALUE);
        nonConformiteService.genererSiNecessaire(evaluation);
        scoreHistoriqueService.enregistrer(audit);

        auditLogService.journaliser(utilisateurId, entrepriseId, "EVALUATION_EXPERTE_ENREGISTREE", "evaluation",
                evaluation.getId());

        return Response.status(Response.Status.CREATED).entity(EvaluationDto.depuis(evaluation)).build();
    }

    /**
     * Probabilité de conformité représentative d'un niveau d'engagement : le
     * milieu de la plage Likert correspondante (voir ScoringEngine). Prendre le
     * milieu plutôt qu'une borne garantit que reconvertir cette probabilité
     * redonne exactement le niveau choisi, sans dépendre du sens des
     * comparaisons aux bornes.
     */
    private static BigDecimal probabiliteRepresentative(int niveau) {
        return switch (niveau) {
            case 5 -> new BigDecimal("0.9500");
            case 4 -> new BigDecimal("0.8250");
            case 3 -> new BigDecimal("0.6250");
            case 2 -> new BigDecimal("0.3750");
            default -> new BigDecimal("0.1250");
        };
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
