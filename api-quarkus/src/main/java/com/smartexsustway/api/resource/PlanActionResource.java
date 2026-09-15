package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.ActionPlan;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AxeAmelioration;
import com.smartexsustway.api.domain.entity.PlanAction;
import com.smartexsustway.api.domain.enums.PrioriteAction;
import com.smartexsustway.api.domain.enums.StatutActionCorrective;
import com.smartexsustway.api.domain.enums.StatutAxe;
import com.smartexsustway.api.domain.enums.StatutPlan;
import com.smartexsustway.api.planification.PlanActionService;
import com.smartexsustway.api.domain.repository.ActionPlanRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.AxeAmeliorationRepository;
import com.smartexsustway.api.domain.repository.PlanActionRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.dto.ErreurDto;
import com.smartexsustway.api.resource.dto.PlanActionDto;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.tenant.TenantContext;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.UUID;

/**
 * Les plans d'action d'une mission.
 *
 * <p>Le plan appartient à la mission, non à un axe : un plan regroupe
 * plusieurs axes, et une action en traite souvent plusieurs à la fois.
 * C'est cette double multiplicité qui impose la table de liaison
 * {@code action_axe}, et c'est pourquoi une action reçoit ici une
 * <em>liste</em> d'axes.
 *
 * <p>Distincte d'{@code ActionCorrectiveResource}, qui traite les actions
 * répondant à une non-conformité constatée. Les deux ne sont pas
 * interchangeables : une action corrective exige une non-conformité, et y
 * loger une action issue d'un axe obligerait à fabriquer un écart fictif.
 *
 * <p>Permission {@code audit:modifier}, déjà décrite comme « Modifier une
 * mission (plan d'actions, non-conformités) ». Aucune permission nouvelle.
 */
@Path("/api/v1/entreprises/{entrepriseId}/audits/{auditId}/plans-action")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class PlanActionResource {

    private static final String PERMISSION_MODIFIER = "audit:modifier";

    @Inject AuditRepository auditRepository;
    @Inject PlanActionRepository planRepository;
    @Inject ActionPlanRepository actionRepository;
    @Inject AxeAmeliorationRepository axeRepository;
    @Inject PlanActionService planService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;
    @Inject TenantContext tenantContext;

    @GET
    public Response lister(@PathParam("entrepriseId") UUID entrepriseId,
                           @PathParam("auditId") UUID auditId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);
        trouverAuditDeLEntreprise(entrepriseId, auditId);

        var plans = planRepository.parAudit(auditId).stream()
                .map(p -> PlanActionDto.depuis(p, actionRepository.parPlan(p.getId())))
                .toList();
        return Response.ok(plans).build();
    }

    @GET
    @Path("/{planId}")
    public Response consulter(@PathParam("entrepriseId") UUID entrepriseId,
                              @PathParam("auditId") UUID auditId,
                              @PathParam("planId") UUID planId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);
        trouverAuditDeLEntreprise(entrepriseId, auditId);

        PlanAction plan = trouverPlan(auditId, planId);
        return Response.ok(PlanActionDto.depuis(plan, actionRepository.parPlan(planId))).build();
    }

    @POST
    @Transactional
    public Response creer(@PathParam("entrepriseId") UUID entrepriseId,
                          @PathParam("auditId") UUID auditId,
                          @Valid PlanActionDto.CreationDto corps) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);
        exigerModification(utilisateurId, entrepriseId, audit);

        PlanAction plan = new PlanAction(audit, corps.titre());
        plan.setDescription(corps.description());
        plan.setDateEcheance(corps.dateEcheance());
        plan.setCreePar(utilisateurRepository.findById(utilisateurId));
        // Le responsable est retraduit et confronté au rattachement : un
        // identifiant fourni par le client ne fait jamais foi.
        plan.setResponsable(planService.responsableDeLEntreprise(corps.responsableId(), entrepriseId));
        planRepository.persistAndFlush(plan);

        auditLogService.journaliser(utilisateurId, entrepriseId,
                "PLAN_ACTION_CREE", "plan_action", plan.getId());
        return Response.status(Response.Status.CREATED)
                .entity(PlanActionDto.depuis(plan, List.of())).build();
    }

    @PUT
    @Path("/{planId}")
    @Transactional
    public Response modifier(@PathParam("entrepriseId") UUID entrepriseId,
                             @PathParam("auditId") UUID auditId,
                             @PathParam("planId") UUID planId,
                             @Valid PlanActionDto.CreationDto corps) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);
        exigerModification(utilisateurId, entrepriseId, audit);

        PlanAction plan = trouverPlan(auditId, planId);
        // Un plan clôturé ou archivé est gelé (D25).
        planService.exigerPlanModifiable(plan);

        plan.setTitre(corps.titre());
        plan.setDescription(corps.description());
        plan.setDateEcheance(corps.dateEcheance());
        // Le responsable passe par le service : aucun identifiant venu du
        // client n'est tenu pour fiable.
        plan.setResponsable(planService.responsableDeLEntreprise(corps.responsableId(), entrepriseId));

        auditLogService.journaliser(utilisateurId, entrepriseId,
                "PLAN_ACTION_MODIFIE", "plan_action", planId);
        return Response.ok(PlanActionDto.depuis(plan, actionRepository.parPlan(planId))).build();
    }

    @PUT
    @Path("/{planId}/statut")
    @Transactional
    public Response changerStatut(@PathParam("entrepriseId") UUID entrepriseId,
                                  @PathParam("auditId") UUID auditId,
                                  @PathParam("planId") UUID planId,
                                  @Valid PlanActionDto.StatutDto corps) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);
        exigerModification(utilisateurId, entrepriseId, audit);

        PlanAction plan = trouverPlan(auditId, planId);
        StatutPlan cible;
        try {
            cible = StatutPlan.valueOf(corps.statut());
        } catch (IllegalArgumentException e) {
            return erreur(400, "Statut inconnu : " + corps.statut());
        }
        planService.changerStatutPlan(plan, cible, utilisateurId, entrepriseId);
        return Response.ok(PlanActionDto.depuis(plan, actionRepository.parPlan(planId))).build();
    }

    /**
     * Clôturer le plan : il est arrivé à son terme, et se fige.
     *
     * <p>Route distincte du simple changement de statut parce que le geste
     * n'est pas le même : il exige un motif, nomme son décideur et ne se
     * reprend pas.
     */
    @POST
    @Path("/{planId}/cloture")
    @Transactional
    public Response cloturer(@PathParam("entrepriseId") UUID entrepriseId,
                             @PathParam("auditId") UUID auditId,
                             @PathParam("planId") UUID planId,
                             @Valid PlanActionDto.ClotureDto corps) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);
        exigerModification(utilisateurId, entrepriseId, audit);

        PlanAction plan = trouverPlan(auditId, planId);
        planService.cloturer(plan, utilisateurRepository.findById(utilisateurId),
                corps.motif(), utilisateurId, entrepriseId);
        return Response.ok(PlanActionDto.depuis(plan, actionRepository.parPlan(planId))).build();
    }

    /**
     * Archiver le plan : il est retiré sans avoir été mené à terme.
     *
     * <p>C'est ce qui tient lieu de suppression. Effacer le plan emporterait
     * ses actions en cascade, et la trace du travail engagé avec elles.
     */
    @POST
    @Path("/{planId}/archivage")
    @Transactional
    public Response archiver(@PathParam("entrepriseId") UUID entrepriseId,
                             @PathParam("auditId") UUID auditId,
                             @PathParam("planId") UUID planId,
                             PlanActionDto.ArchivageDto corps) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);
        exigerModification(utilisateurId, entrepriseId, audit);

        PlanAction plan = trouverPlan(auditId, planId);
        planService.archiver(plan, utilisateurRepository.findById(utilisateurId),
                corps == null ? null : corps.motif(), utilisateurId, entrepriseId);
        return Response.ok(PlanActionDto.depuis(plan, actionRepository.parPlan(planId))).build();
    }

    // --- Actions du plan ---------------------------------------------------

    /**
     * Ajouter une action, rattachée à un ou plusieurs axes.
     *
     * <p>Seuls des axes <strong>validés</strong> peuvent être rattachés :
     * un axe encore proposé n'a pas été accepté, un axe rejeté a été
     * écarté. Planifier l'un ou l'autre reviendrait à engager du travail
     * sur une décision qui n'a pas été prise.
     */
    @POST
    @Path("/{planId}/actions")
    @Transactional
    public Response ajouterAction(@PathParam("entrepriseId") UUID entrepriseId,
                                  @PathParam("auditId") UUID auditId,
                                  @PathParam("planId") UUID planId,
                                  @Valid PlanActionDto.CreationActionDto corps) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);
        exigerModification(utilisateurId, entrepriseId, audit);

        PlanAction plan = trouverPlan(auditId, planId);
        planService.exigerPlanModifiable(plan);
        int ordre = actionRepository.parPlan(planId).size();

        ActionPlan action = new ActionPlan(plan, corps.titre(), ordre);
        action.setDescription(corps.description());
        action.setDateEcheance(corps.dateEcheance());
        // Garde de rattachement : le responsable doit pouvoir accéder à la
        // mission, sans quoi l'action serait affectée à quelqu'un qui ne peut
        // pas la traiter.
        action.setResponsable(planService.responsableDeLEntreprise(corps.responsableId(), entrepriseId));
        if (corps.priorite() != null) {
            try {
                action.setPriorite(PrioriteAction.valueOf(corps.priorite()));
            } catch (IllegalArgumentException e) {
                return erreur(400, "Priorité inconnue : " + corps.priorite());
            }
        }

        List<UUID> axeIds = corps.axeIds() == null ? List.of() : corps.axeIds();
        for (UUID axeId : axeIds) {
            // Résolu par (id, audit) : un axe d'une autre mission n'est pas
            // atteignable, même avec son identifiant exact.
            AxeAmelioration axe = axeRepository.parIdEtAudit(axeId, auditId)
                    .orElseThrow(() -> new NotFoundException("Axe introuvable pour cette mission"));
            if (axe.getStatut() != StatutAxe.VALIDE) {
                return erreur(409, "L'axe « " + axe.getLibelle()
                        + " » n'est pas validé : il ne peut pas être planifié");
            }
            action.rattacher(axe);
        }

        actionRepository.persistAndFlush(action);
        auditLogService.journaliser(utilisateurId, entrepriseId,
                "ACTION_PLAN_CREEE", "action_plan", action.getId());

        return Response.status(Response.Status.CREATED)
                .entity(PlanActionDto.ActionDto.depuis(action)).build();
    }

    /**
     * Les actions d'un plan.
     *
     * <p>Lisible par tout membre de l'entreprise, collaborateur compris : un
     * plan est un objet collectif, et n'en montrer qu'une partie rendrait sa
     * progression incompréhensible. C'est l'écriture qui est restreinte, pas
     * la lecture.
     */
    @GET
    @Path("/{planId}/actions")
    public Response listerActions(@PathParam("entrepriseId") UUID entrepriseId,
                                  @PathParam("auditId") UUID auditId,
                                  @PathParam("planId") UUID planId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);
        trouverAuditDeLEntreprise(entrepriseId, auditId);
        trouverPlan(auditId, planId);

        var actions = actionRepository.parPlanAvecAxes(planId).stream()
                .map(PlanActionDto.ActionDto::depuis)
                .toList();
        return Response.ok(actions).build();
    }

    @GET
    @Path("/{planId}/actions/{actionId}")
    public Response consulterAction(@PathParam("entrepriseId") UUID entrepriseId,
                                    @PathParam("auditId") UUID auditId,
                                    @PathParam("planId") UUID planId,
                                    @PathParam("actionId") UUID actionId) {
        autorisationService.exigerAccesEntreprise(tenantContext.utilisateurCourantId(), entrepriseId);
        trouverAuditDeLEntreprise(entrepriseId, auditId);

        return Response.ok(PlanActionDto.ActionDto.depuis(trouverAction(auditId, planId, actionId)))
                .build();
    }

    /**
     * Modifier le contenu d'une action — sans toucher ni au statut ni au
     * responsable, qui relèvent de gestes et de droits distincts.
     */
    @PUT
    @Path("/{planId}/actions/{actionId}")
    @Transactional
    public Response modifierAction(@PathParam("entrepriseId") UUID entrepriseId,
                                   @PathParam("auditId") UUID auditId,
                                   @PathParam("planId") UUID planId,
                                   @PathParam("actionId") UUID actionId,
                                   @Valid PlanActionDto.ModificationActionDto corps) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);

        ActionPlan action = trouverAction(auditId, planId, actionId);
        // Modifier le contenu d'une action demande soit l'administration de la
        // mission, soit d'en être le responsable.
        if (!planService.estAdministrateurDeLaMission(utilisateurId, entrepriseId)) {
            planService.exigerDroitSurLAction(action, utilisateurId, entrepriseId);
        } else {
            exigerModification(utilisateurId, entrepriseId, audit);
        }

        planService.exigerPlanModifiable(action.getPlan());

        action.setTitre(corps.titre());
        action.setDescription(corps.description());
        action.setDateEcheance(corps.dateEcheance());
        if (corps.priorite() != null && !corps.priorite().isBlank()) {
            try {
                action.setPriorite(PrioriteAction.valueOf(corps.priorite()));
            } catch (IllegalArgumentException e) {
                return erreur(400, "Priorité inconnue : " + corps.priorite());
            }
        }

        auditLogService.journaliser(utilisateurId, entrepriseId,
                "ACTION_PLAN_MODIFIEE", "action_plan", actionId);
        return Response.ok(PlanActionDto.ActionDto.depuis(action)).build();
    }

    /**
     * Faire avancer une action.
     *
     * <p>Le collaborateur avance <strong>ses</strong> actions jusqu'à
     * {@code TERMINEE}. {@code VALIDEE} appartient à l'administration de la
     * mission : celui qui fait n'atteste pas de son propre travail.
     */
    @PUT
    @Path("/{planId}/actions/{actionId}/statut")
    @Transactional
    public Response changerStatutAction(@PathParam("entrepriseId") UUID entrepriseId,
                                        @PathParam("auditId") UUID auditId,
                                        @PathParam("planId") UUID planId,
                                        @PathParam("actionId") UUID actionId,
                                        @Valid PlanActionDto.StatutActionDto corps) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        trouverAuditDeLEntreprise(entrepriseId, auditId);

        ActionPlan action = trouverAction(auditId, planId, actionId);
        planService.exigerDroitSurLAction(action, utilisateurId, entrepriseId);

        StatutActionCorrective cible;
        try {
            cible = StatutActionCorrective.valueOf(corps.statut());
        } catch (IllegalArgumentException e) {
            return erreur(400, "Statut d'action inconnu : " + corps.statut());
        }

        planService.changerStatutAction(action, cible, utilisateurId, entrepriseId,
                planService.estAdministrateurDeLaMission(utilisateurId, entrepriseId));
        return Response.ok(PlanActionDto.ActionDto.depuis(action)).build();
    }

    /**
     * Remplacer les axes traités par une action.
     *
     * <p>Remplacement de l'ensemble, et non ajout unitaire : l'appelant envoie
     * la liste qu'il veut voir. Sans cela, l'interface devrait calculer une
     * différence contre l'état courant, et deux onglets ouverts en
     * produiraient deux, contradictoires.
     *
     * <p>Mêmes droits que la modification du contenu : l'administration de la
     * mission, ou le responsable de l'action.
     */
    @PUT
    @Path("/{planId}/actions/{actionId}/axes")
    @Transactional
    public Response remplacerAxesAction(@PathParam("entrepriseId") UUID entrepriseId,
                                        @PathParam("auditId") UUID auditId,
                                        @PathParam("planId") UUID planId,
                                        @PathParam("actionId") UUID actionId,
                                        PlanActionDto.AxesActionDto corps) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);

        ActionPlan action = trouverAction(auditId, planId, actionId);
        if (!planService.estAdministrateurDeLaMission(utilisateurId, entrepriseId)) {
            planService.exigerDroitSurLAction(action, utilisateurId, entrepriseId);
        } else {
            exigerModification(utilisateurId, entrepriseId, audit);
        }

        planService.remplacerAxes(action, corps == null ? List.of() : corps.axeIds(),
                auditId, utilisateurId, entrepriseId);
        return Response.ok(PlanActionDto.ActionDto.depuis(action)).build();
    }

    /**
     * Affecter ou réaffecter une action.
     *
     * <p>Réservé à l'administration de la mission : avancer son travail est
     * une chose, décider qui le fait en est une autre. La réaffectation est
     * journalisée avec l'ancien et le nouveau responsable.
     */
    @PUT
    @Path("/{planId}/actions/{actionId}/responsable")
    @Transactional
    public Response changerResponsableAction(@PathParam("entrepriseId") UUID entrepriseId,
                                             @PathParam("auditId") UUID auditId,
                                             @PathParam("planId") UUID planId,
                                             @PathParam("actionId") UUID actionId,
                                             PlanActionDto.ResponsableActionDto corps) {
        UUID utilisateurId = tenantContext.utilisateurCourantId();
        autorisationService.exigerAccesEntreprise(utilisateurId, entrepriseId);
        Audit audit = trouverAuditDeLEntreprise(entrepriseId, auditId);
        exigerModification(utilisateurId, entrepriseId, audit);

        ActionPlan action = trouverAction(auditId, planId, actionId);
        planService.reaffecter(action, corps == null ? null : corps.responsableId(),
                utilisateurId, entrepriseId);
        return Response.ok(PlanActionDto.ActionDto.depuis(action)).build();
    }

    // --- Contrôles partagés ------------------------------------------------

    /**
     * Isolation multi-tenant : l'action n'est rendue que si elle appartient
     * au plan désigné, lui-même appartenant à cette mission. Les trois
     * identifiants doivent être cohérents entre eux — l'un d'eux seul ne
     * suffit jamais.
     */
    private ActionPlan trouverAction(UUID auditId, UUID planId, UUID actionId) {
        PlanAction plan = trouverPlan(auditId, planId);
        ActionPlan action = actionRepository.findById(actionId);
        if (action == null || !action.getPlan().getId().equals(plan.getId())) {
            throw new NotFoundException("Action introuvable pour ce plan");
        }
        return action;
    }

    private void exigerModification(UUID utilisateurId, UUID entrepriseId, Audit audit) {
        String formuleCode = audit.getFormuleAbonnement() == null
                ? null : audit.getFormuleAbonnement().getCode();
        autorisationService.exigerPermission(utilisateurId, entrepriseId, formuleCode, PERMISSION_MODIFIER);
    }

    private Audit trouverAuditDeLEntreprise(UUID entrepriseId, UUID auditId) {
        Audit audit = auditRepository.findById(auditId);
        if (audit == null || !audit.getEntreprise().getId().equals(entrepriseId)) {
            throw new NotFoundException("Audit introuvable pour cette entreprise");
        }
        return audit;
    }

    /** Isolation multi-tenant : le plan n'est rendu que s'il appartient à cette mission. */
    private PlanAction trouverPlan(UUID auditId, UUID planId) {
        return planRepository.parIdEtAudit(planId, auditId)
                .orElseThrow(() -> new NotFoundException("Plan introuvable pour cette mission"));
    }

    private static Response erreur(int statut, String message) {
        return Response.status(statut).entity(new ErreurDto(message)).build();
    }
}
