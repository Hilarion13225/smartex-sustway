package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.conformite.RestitutionRisqueService;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.EvaluationDocumentAnalyseRepository;
import com.smartexsustway.api.domain.repository.AnalyseDocumentConstatRepository;
import com.smartexsustway.api.domain.repository.EvaluationConstatRepository;
import com.smartexsustway.api.domain.repository.EvaluationPreuveRepository;
import com.smartexsustway.api.domain.repository.EvaluationRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.mission.AnalyseCritereService;
import com.smartexsustway.api.mission.AnalyseCritereV2Service;
import com.smartexsustway.api.mission.ValidationEvaluationService;
import com.smartexsustway.api.resource.dto.DetailEvaluationV2Dto;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.EvaluationDto;
import com.smartexsustway.api.security.AutorisationService;
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

    /**
     * Exécuter le pipeline d'agents. Distincte de `preuve:deposer` : le
     * collaborateur fournit la matière, il ne déclenche pas l'évaluation.
     */
    private static final String PERMISSION_ANALYSE = "analyse:executer";

    /**
     * Accepter le résultat. Distincte de `analyse:executer` : produire un
     * résultat n'est pas l'accepter, sans quoi celui qui lance l'analyse
     * validerait sa propre sortie et la revue humaine ne serait qu'une
     * formalité automatique.
     */
    private static final String PERMISSION_VALIDATION = "evaluation:valider";

    @Inject AuditRepository auditRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject EvaluationRepository evaluationRepository;
    @Inject EvaluationDocumentAnalyseRepository documentAnalyseRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EvaluationPreuveRepository evaluationPreuveRepository;
    @Inject EvaluationConstatRepository evaluationConstatRepository;
    @Inject AnalyseDocumentConstatRepository analyseDocumentConstatRepository;
    @Inject RestitutionRisqueService restitutionRisqueService;
    @Inject AnalyseCritereService analyseCritereService;
    @Inject AnalyseCritereV2Service analyseCritereV2Service;
    @Inject ValidationEvaluationService validationEvaluationService;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @GET
    public Response lister(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId,
                            @PathParam("auditCritereId") UUID auditCritereId) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        trouverAuditCritereDeLaMission(entrepriseId, auditId, auditCritereId);

        // L'accès à la liste n'est pas en cause : tout membre de
        // l'entreprise consulte les résultats de ses audits. C'est le
        // contenu qui varie — les justifications internes de l'IA sont
        // réservées à l'administration de l'audit.
        boolean avecJustifications = peutLireLesJustifications(utilisateurId, entrepriseId);

        var evaluations = evaluationRepository.parAuditCritere(auditCritereId).stream()
                .map(e -> dto(e, avecJustifications))
                .toList();
        return Response.ok(evaluations).build();
    }

    /**
     * Les justifications produites par l'IA relèvent de la relecture.
     *
     * <p>Elles disent <em>pourquoi</em> un jugement a été rendu : elles
     * nomment ce qui manque et citent ce qui a été observé. Le
     * collaborateur, qui fournit la matière de l'audit, a besoin de savoir
     * où en est un critère et ce qu'il doit déposer — pas de lire le
     * raisonnement qui a conduit au verdict.
     *
     * <p>Même jeu de rôles que l'endpoint de détail, et pour la même
     * raison : la frontière ne passe pas entre deux ressources mais entre
     * le résultat et son explication.
     */
    private boolean peutLireLesJustifications(UUID utilisateurId, UUID entrepriseId) {
        return autorisationService.possedeRoleSurEntreprise(
                utilisateurId, entrepriseId, AutorisationService.ROLES_ADMINISTRATION_ENTREPRISE);
    }

    private EvaluationDto dto(Evaluation evaluation, boolean avecJustifications) {
        var documents = documentAnalyseRepository.parEvaluation(evaluation.getId());
        return avecJustifications
                ? EvaluationDto.depuis(evaluation, documents)
                : EvaluationDto.sansJustificationsInternes(evaluation, documents);
    }

    @POST
    @Transactional
    public Response evaluer(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId,
                             @PathParam("auditCritereId") UUID auditCritereId) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);

        Audit audit = trouverAudit(entrepriseId, auditId);
        // Permission dédiée, et non `preuve:deposer` comme auparavant :
        // déposer une pièce est le travail quotidien d'un collaborateur,
        // déclencher le pipeline engage un coût et écrit des résultats dans
        // la mission. Partager la même permission laissait un collaborateur
        // lancer une analyse par simple appel d'URL.
        String formuleCode = audit.getFormuleAbonnement() == null ? null : audit.getFormuleAbonnement().getCode();
        autorisationService.exigerPermission(utilisateurId, entrepriseId, formuleCode, PERMISSION_ANALYSE);
        AuditCritere auditCritere = trouverAuditCritereDeLaMission(entrepriseId, auditId, auditCritereId);

        var resultat = analyseCritereService.analyser(audit, auditCritere);
        if (resultat instanceof AnalyseCritereService.Resultat.HorsPerimetre horsPerimetre) {
            // RG35 : conflit d'état, comme une mission clôturée — le critère
            // existe mais n'appartient plus au périmètre évaluable.
            return erreur(409, horsPerimetre.message());
        }
        if (resultat instanceof AnalyseCritereService.Resultat.RienAAnalyser) {
            return erreur(400, "Aucune preuve, réponse au questionnaire ni scénario sur ce critère "
                    + "— impossible de lancer l'analyse IA");
        }
        if (resultat instanceof AnalyseCritereService.Resultat.Echec echec) {
            return erreur(503, echec.message());
        }
        Evaluation evaluation = ((AnalyseCritereService.Resultat.Analyse) resultat).evaluation();

        auditLogService.journaliser(utilisateurId, entrepriseId, "EVALUATION_IA_CREEE", "evaluation", evaluation.getId());

        return Response.status(Response.Status.CREATED)
                .entity(dto(evaluation, peutLireLesJustifications(utilisateurId, entrepriseId)))
                .build();
    }

    /**
     * Le raisonnement détaillé d'une évaluation V2, en lecture seule.
     *
     * <p>Trois structures persistées depuis la phase 5.7-C et qu'aucune API
     * ne rendait : l'avis attente par attente, les remarques rattachées, et
     * ce que chaque pièce dit de chaque attente. Rien n'est produit ici —
     * tout est relu.
     *
     * <p><strong>Accès restreint à l'administration de l'entreprise.</strong>
     * Le raisonnement de l'IA est plus détaillé que son résultat : il nomme
     * ce qui manque, cite ce qui a été observé, et signale les
     * contradictions entre pièces. La question de savoir si un
     * collaborateur doit y accéder est une décision métier ouverte (D1 de
     * la cartographie 5.8), et elle n'est pas tranchée ici : à défaut de
     * décision, l'accès n'est pas élargi. Le contrôle réutilise
     * {@code ROLES_ADMINISTRATION_ENTREPRISE}, déjà employé pour le journal
     * d'audit — une lecture sensible de même nature.
     *
     * <p>L'évaluation est résolue par son identifiant <em>et</em> son
     * critère : un UUID valide appartenant à une autre mission ne suffit
     * pas à l'atteindre, et les trois listes sont filtrées sur cette
     * évaluation, jamais sur un identifiant fourni par l'appelant.
     */
    @GET
    @Path("/{evaluationId}/detail")
    public Response detail(@PathParam("entrepriseId") UUID entrepriseId,
                           @PathParam("auditId") UUID auditId,
                           @PathParam("auditCritereId") UUID auditCritereId,
                           @PathParam("evaluationId") UUID evaluationId) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        autorisationService.exigerRoleSurEntreprise(utilisateurId, entrepriseId,
                AutorisationService.ROLES_ADMINISTRATION_ENTREPRISE);
        trouverAuditCritereDeLaMission(entrepriseId, auditId, auditCritereId);

        Evaluation evaluation = trouverEvaluationDuCritere(auditCritereId, evaluationId);

        // Le risque est calculé depuis l'évaluation CONSULTÉE, et non
        // depuis la dernière du critère : une ré-analyse produit une autre
        // probabilité, donc un autre risque, et afficher celui d'une autre
        // évaluation donnerait un chiffre qui ne correspond à rien de ce
        // qui est à l'écran.
        //
        // Lecture seule : `calculer` n'écrit rien.
        return Response.ok(DetailEvaluationV2Dto.depuis(
                        evaluation,
                        restitutionRisqueService.calculer(evaluation),
                        evaluationPreuveRepository.detailParEvaluation(evaluationId),
                        evaluationConstatRepository.detailParEvaluation(evaluationId),
                        analyseDocumentConstatRepository.detailParEvaluation(evaluationId)))
                .build();
    }

    /**
     * Lancer le pipeline V2 : le résultat naît {@code EN_REVUE}.
     *
     * <p>Route distincte du POST V1, qui reste la voie de production tant
     * que le V2 n'est pas éprouvé. Les deux ne se remplacent pas l'une
     * l'autre à ce stade : l'une écrit {@code VALIDEE} (RG16), l'autre
     * attend une relecture humaine.
     */
    @POST
    @Path("/v2")
    public Response evaluerV2(@PathParam("entrepriseId") UUID entrepriseId,
                              @PathParam("auditId") UUID auditId,
                              @PathParam("auditCritereId") UUID auditCritereId) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);

        Audit audit = trouverAudit(entrepriseId, auditId);
        String formuleCode = audit.getFormuleAbonnement() == null ? null : audit.getFormuleAbonnement().getCode();
        autorisationService.exigerPermission(utilisateurId, entrepriseId, formuleCode, PERMISSION_ANALYSE);
        AuditCritere auditCritere = trouverAuditCritereDeLaMission(entrepriseId, auditId, auditCritereId);
        // RG35 : refusé avant tout appel, pour qu'un critère exclu ne
        // réserve aucune passe ni ne sollicite le service d'agents.
        if (!auditCritere.isActif() || !auditCritere.isApplicable()) {
            return erreur(409, AnalyseCritereService.messageHorsPerimetre(auditCritere));
        }

        // Le service gère lui-même son découpage transactionnel : la
        // ressource n'est donc pas @Transactional — sans quoi l'appel au
        // service d'agents se ferait transaction ouverte.
        var resultat = analyseCritereV2Service.analyser(auditId, auditCritereId, utilisateurId);

        if (resultat instanceof AnalyseCritereV2Service.Resultat.RienAAnalyser) {
            return erreur(400, "Aucune preuve ni scénario sur ce critère — impossible de lancer l'analyse IA");
        }
        if (resultat instanceof AnalyseCritereV2Service.Resultat.DejaEnCours) {
            // 409 et non 429 : ce n'est pas une limite de débit, c'est un
            // conflit d'état — le critère est déjà occupé. Le message est
            // constant et ne dit rien de l'analyse en cours : ni son
            // identifiant, ni qui l'a lancée, ni depuis quand. Un double clic
            // ne doit pas devenir un canal d'observation.
            auditLogService.journaliser(utilisateurId, entrepriseId,
                    "ANALYSE_IA_REFUSEE_CONCURRENCE", "audit_critere", auditCritereId);
            return erreur(409, "Une analyse est déjà en cours pour ce critère.");
        }
        if (resultat instanceof AnalyseCritereV2Service.Resultat.HorsPerimetre horsPerimetre) {
            // RG35-HARDENING : exclu pendant l'appel aux agents — même réponse
            // que la garde d'entrée ci-dessus.
            return erreur(409, horsPerimetre.message());
        }
        if (resultat instanceof AnalyseCritereV2Service.Resultat.Echec echec) {
            return erreur(503, echec.message());
        }

        var analyse = (AnalyseCritereV2Service.Resultat.Analyse) resultat;
        auditLogService.journaliser(utilisateurId, entrepriseId,
                "ANALYSE_IA_TERMINEE", "analyse_ia", analyse.analyseIaId());

        Evaluation evaluation = evaluationRepository.findById(analyse.evaluationId());
        auditLogService.journaliser(utilisateurId, entrepriseId,
                "EVALUATION_CREEE_EN_REVUE", "evaluation", evaluation.getId());

        return Response.status(Response.Status.CREATED)
                .entity(dto(evaluation, peutLireLesJustifications(utilisateurId, entrepriseId)))
                .build();
    }

    /**
     * Accepter une évaluation produite par le pipeline.
     *
     * <p>Le résultat entre alors dans le score officiel et l'écart éventuel
     * devient opposable. C'est pourquoi la permission est distincte de
     * celle qui lance l'analyse, et pourquoi elle n'est pas accordée au
     * responsable de l'entreprise auditée : on ne peut pas être à la fois
     * le sujet de l'évaluation et celui qui l'entérine.
     *
     * <p>Transactionnel : validation, non-conformité et instantané de score
     * réussissent ou échouent ensemble.
     */
    @POST
    @Path("/{evaluationId}/validation")
    @Transactional
    public Response valider(@PathParam("entrepriseId") UUID entrepriseId, @PathParam("auditId") UUID auditId,
                            @PathParam("auditCritereId") UUID auditCritereId,
                            @PathParam("evaluationId") UUID evaluationId) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);

        Audit audit = trouverAudit(entrepriseId, auditId);
        String formuleCode = audit.getFormuleAbonnement() == null ? null : audit.getFormuleAbonnement().getCode();
        autorisationService.exigerPermission(utilisateurId, entrepriseId, formuleCode, PERMISSION_VALIDATION);
        AuditCritere auditCritere = trouverAuditCritereDeLaMission(entrepriseId, auditId, auditCritereId);

        Evaluation evaluation = trouverEvaluationDuCritere(auditCritereId, evaluationId);

        // RG35 : valider ferait entrer l'évaluation dans le score officiel et
        // pourrait faire naître une non-conformité sur un critère exclu. Elle
        // reste dans l'historique, telle quelle.
        if (!auditCritere.isActif() || !auditCritere.isApplicable()) {
            return erreur(409, AnalyseCritereService.messageHorsPerimetre(auditCritere));
        }

        var resultat = validationEvaluationService.valider(evaluation, utilisateurRepository.findById(utilisateurId));
        if (resultat instanceof ValidationEvaluationService.Resultat.EtatIncompatible refus) {
            return erreur(409, refus.message());
        }

        auditLogService.journaliser(utilisateurId, entrepriseId, "EVALUATION_VALIDEE", "evaluation", evaluation.getId());

        return Response.ok(dto(evaluation, peutLireLesJustifications(utilisateurId, entrepriseId)))
                .build();
    }

    private Audit trouverAudit(UUID entrepriseId, UUID auditId) {
        Audit audit = auditRepository.findById(auditId);
        if (audit == null || !audit.getEntreprise().getId().equals(entrepriseId)) {
            throw new NotFoundException("Audit introuvable pour cette entreprise");
        }
        return audit;
    }

    /**
     * L'évaluation, résolue par son identifiant <strong>et</strong> son critère.
     *
     * <p>Un identifiant seul ne suffit jamais : c'est ce qui empêche
     * d'atteindre l'évaluation d'une autre mission — ou d'une autre
     * entreprise — en substituant un UUID dans l'URL.
     */
    private Evaluation trouverEvaluationDuCritere(UUID auditCritereId, UUID evaluationId) {
        Evaluation evaluation = evaluationRepository.findById(evaluationId);
        if (evaluation == null || !evaluation.getAuditCritere().getId().equals(auditCritereId)) {
            throw new NotFoundException("Évaluation introuvable pour ce critère");
        }
        return evaluation;
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
