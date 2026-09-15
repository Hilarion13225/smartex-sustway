package com.smartexsustway.api.planification;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.ActionPlan;
import com.smartexsustway.api.domain.entity.AxeAmelioration;
import com.smartexsustway.api.domain.entity.PlanAction;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.enums.StatutActionCorrective;
import com.smartexsustway.api.domain.enums.StatutAxe;
import com.smartexsustway.api.domain.enums.StatutPlan;
import com.smartexsustway.api.domain.repository.ActionPlanRepository;
import com.smartexsustway.api.domain.repository.AxeAmeliorationRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.security.AutorisationService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;

import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Toutes les règles des plans d'action, en un seul endroit.
 *
 * <p>Avant ce service, la règle métier vivait dans la ressource REST — et
 * c'est là que la faille d'affectation a pu s'installer sans que rien ne la
 * signale. Les axes avaient reçu leur service en 5.8.4 ; les plans n'en
 * avaient aucun. Regrouper ici n'est pas une élégance : c'est ce qui rend une
 * règle vérifiable en un point plutôt que supposée en plusieurs.
 *
 * <p>Quatre principes gouvernent ce qui suit.
 *
 * <p><strong>Un responsable doit pouvoir accéder à la mission.</strong> Aucun
 * identifiant d'utilisateur venu du client n'est tenu pour fiable : chacun est
 * retraduit puis confronté au rattachement à l'entreprise. Affecter une action
 * à quelqu'un qui n'a pas accès à la mission produirait une action que
 * personne ne peut traiter — et exposerait au passage l'identité d'un
 * utilisateur d'une autre entreprise.
 *
 * <p><strong>Le collaborateur agit sur son propre travail.</strong> Il lit le
 * plan entier — masquer les actions des autres rendrait la progression
 * illisible — mais ne modifie que les actions qui lui sont affectées.
 *
 * <p><strong>Déclarer n'est pas constater.</strong> L'exécutant pose
 * {@code TERMINEE} ; seul un rôle d'administration pose {@code VALIDEE}, qui
 * est définitif. C'est la même séparation que {@code EN_REVUE} → {@code VALIDEE}
 * sur une évaluation, et {@code PROPOSE} → {@code VALIDE} sur un axe.
 *
 * <p><strong>Un plan gelé ne bouge plus.</strong> Ni clôturé, ni archivé, il
 * n'accepte aucune modification métier — et rien n'est jamais supprimé.
 */
@ApplicationScoped
public class PlanActionService {

    /**
     * Transitions autorisées pour un plan.
     *
     * <p>{@code CLOTURE} et {@code ARCHIVE} n'ont pas de successeur : le gel
     * est définitif. Un plan repris serait un plan dont on ne saurait plus
     * s'il a été mené à terme.
     */
    private static final Map<StatutPlan, List<StatutPlan>> TRANSITIONS_PLAN = Map.of(
            StatutPlan.BROUILLON, List.of(StatutPlan.ACTIF, StatutPlan.ARCHIVE),
            StatutPlan.ACTIF, List.of(StatutPlan.CLOTURE, StatutPlan.ARCHIVE),
            StatutPlan.CLOTURE, List.of(),
            StatutPlan.ARCHIVE, List.of());

    /**
     * Transitions autorisées pour une action.
     *
     * <p>Les retours en arrière restent possibles tant que l'action n'est pas
     * {@code VALIDEE} : une tâche déclarée terminée trop tôt doit pouvoir
     * repartir. {@code VALIDEE} n'a aucun successeur.
     */
    private static final Map<StatutActionCorrective, List<StatutActionCorrective>> TRANSITIONS_ACTION = Map.of(
            StatutActionCorrective.OUVERTE,
            List.of(StatutActionCorrective.EN_COURS, StatutActionCorrective.TERMINEE),
            StatutActionCorrective.EN_COURS,
            List.of(StatutActionCorrective.OUVERTE, StatutActionCorrective.TERMINEE),
            StatutActionCorrective.TERMINEE,
            List.of(StatutActionCorrective.OUVERTE, StatutActionCorrective.EN_COURS,
                    StatutActionCorrective.VALIDEE),
            StatutActionCorrective.VALIDEE, List.of());

    @Inject ActionPlanRepository actionRepository;
    @Inject AxeAmeliorationRepository axeRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject AutorisationService autorisationService;
    @Inject AuditLogService auditLogService;

    // === Affectation =====================================================

    /**
     * Résout un responsable, et refuse tout ce qui n'est pas un membre de
     * l'entreprise de la mission.
     *
     * <p>Trois issues, et trois seulement : {@code null} rend {@code null}
     * (désaffectation explicite) ; un identifiant qui ne désigne personne lève
     * un 400 plutôt que de poser silencieusement {@code null} ; un utilisateur
     * non rattaché lève un 403.
     *
     * <p>Le rattachement est exigé <strong>sans exception de rôle</strong>. Un
     * {@code SUPER_ADMIN} non rattaché n'est pas un responsable acceptable :
     * son accès global lui permet de voir la mission, pas d'être la personne
     * qui répond de la tâche. Et l'exception, si elle existait, serait
     * exactement la brèche que ce contrôle ferme.
     */
    public Utilisateur responsableDeLEntreprise(UUID responsableId, UUID entrepriseId) {
        if (responsableId == null) {
            return null;
        }
        Utilisateur candidat = utilisateurRepository.findById(responsableId);
        if (candidat == null) {
            throw new BadRequestException("Responsable introuvable : " + responsableId);
        }
        if (!utilisateurEntrepriseRepository.utilisateurRattacheAEntreprise(responsableId, entrepriseId)) {
            // Le message ne dit pas si l'utilisateur existe ailleurs : cette
            // route n'a pas à renseigner sur l'annuaire des autres
            // entreprises.
            throw new ForbiddenException(
                    "Le responsable désigné n'est pas rattaché à cette entreprise");
        }
        return candidat;
    }

    /**
     * Réaffecte une action, et consigne le mouvement.
     *
     * <p>L'ancien et le nouveau responsable sont écrits dans le journal :
     * savoir qu'une réaffectation a eu lieu sans savoir d'où vers où ne permet
     * de reconstituer aucune chaîne de responsabilité.
     */
    public void reaffecter(ActionPlan action, UUID nouveauResponsableId,
                           UUID utilisateurId, UUID entrepriseId) {
        exigerPlanModifiable(action.getPlan());
        Utilisateur nouveau = responsableDeLEntreprise(nouveauResponsableId, entrepriseId);
        Utilisateur ancien = action.getResponsable();

        action.setResponsable(nouveau);

        auditLogService.journaliserAvecDetails(utilisateurId, entrepriseId,
                "ACTION_PLAN_REAFFECTEE", "action_plan", action.getId(),
                """
                {"ancienResponsable":%s,"nouveauResponsable":%s}"""
                        .formatted(jsonId(ancien), jsonId(nouveau)));
    }

    private static String jsonId(Utilisateur utilisateur) {
        return utilisateur == null ? "null" : "\"" + utilisateur.getId() + "\"";
    }

    // === Axes traités par une action =====================================

    /**
     * Remplace l'ensemble des axes traités par une action.
     *
     * <p>Remplacement, et non ajout : l'appelant envoie la liste qu'il veut
     * voir, et c'est celle-là qu'il obtient. Composer des ajouts et des
     * retraits successifs obligerait l'interface à connaître l'état courant
     * pour calculer une différence — et deux onglets ouverts produiraient
     * alors deux différences contradictoires.
     *
     * <p>Chaque axe est résolu contre la mission et vérifié {@code VALIDE}.
     * Un axe encore proposé n'a pas été accepté ; le planifier engagerait du
     * travail sur une décision qui n'a pas été prise. C'est la même règle
     * qu'à la création d'une action, et elle est ici la même méthode.
     *
     * <p>Le statut des axes n'est jamais touché : un axe reste {@code VALIDE}
     * qu'il soit planifié, déplanifié, ou traité par trois plans à la fois.
     *
     * @return les axes effectivement rattachés.
     */
    public Set<AxeAmelioration> remplacerAxes(ActionPlan action, List<UUID> axeIds, UUID auditId,
                                              UUID utilisateurId, UUID entrepriseId) {
        exigerPlanModifiable(action.getPlan());

        Set<AxeAmelioration> cibles = new LinkedHashSet<>();
        for (UUID axeId : axeIds == null ? List.<UUID>of() : axeIds) {
            AxeAmelioration axe = axeRepository.parIdEtAudit(axeId, auditId)
                    .orElseThrow(() -> new NotFoundException("Axe introuvable pour cette mission"));
            if (axe.getStatut() != StatutAxe.VALIDE) {
                throw new OperationPlanRefusee("L'axe « " + axe.getLibelle()
                        + " » n'est pas validé : il ne peut pas être planifié");
            }
            cibles.add(axe);
        }

        // La collection portée par l'entité est la source : Hibernate en
        // déduit les lignes de `action_axe` à créer et à supprimer, dans la
        // transaction de l'appelant. Rien n'est effacé puis réécrit à la main.
        action.getAxes().clear();
        cibles.forEach(action::rattacher);

        auditLogService.journaliserAvecDetails(utilisateurId, entrepriseId,
                "ACTION_PLAN_AXES_MODIFIES", "action_plan", action.getId(),
                """
                {"nombreAxes":%d}""".formatted(cibles.size()));
        return cibles;
    }

    // === Transitions d'action ============================================

    /**
     * Fait passer une action d'un statut à un autre.
     *
     * <p>Deux contrôles se cumulent, et ils ne disent pas la même chose : la
     * transition doit être permise par le cycle de vie, et l'appelant doit
     * avoir le droit de la demander. Une transition valide demandée par
     * quelqu'un qui n'y a pas droit reste un refus.
     */
    public void changerStatutAction(ActionPlan action, StatutActionCorrective cible,
                                    UUID utilisateurId, UUID entrepriseId, boolean estAdministrateur) {
        exigerPlanModifiable(action.getPlan());

        StatutActionCorrective actuel = action.getStatut();
        if (actuel == cible) {
            throw new OperationPlanRefusee("Cette action est déjà « " + cible + " »");
        }
        if (!TRANSITIONS_ACTION.get(actuel).contains(cible)) {
            if (actuel == StatutActionCorrective.VALIDEE) {
                throw new OperationPlanRefusee(
                        "Cette action est validée : une validation ne se reprend pas.");
            }
            throw new OperationPlanRefusee(
                    "Transition refusée : « " + actuel + " » ne mène pas à « " + cible + " »");
        }

        // Déclarer n'est pas constater : l'exécutant termine, l'administration
        // valide. Sans cette barrière, la validation ne vaudrait rien —
        // celui qui fait attesterait de son propre travail.
        if (cible == StatutActionCorrective.VALIDEE && !estAdministrateur) {
            throw new ForbiddenException(
                    "Valider une action relève de l'administration de la mission");
        }

        action.setStatut(cible);
        auditLogService.journaliserAvecDetails(utilisateurId, entrepriseId,
                "ACTION_PLAN_STATUT_CHANGE", "action_plan", action.getId(),
                """
                {"ancienStatut":"%s","nouveauStatut":"%s"}""".formatted(actuel, cible));
    }

    /**
     * Qui peut toucher à cette action.
     *
     * <p>Un rôle d'administration agit sur toutes les actions de la mission.
     * Un collaborateur n'agit que sur celles qui lui sont affectées — c'est la
     * contrepartie de sa lecture complète : il voit tout le plan, il ne
     * modifie que son travail.
     */
    public void exigerDroitSurLAction(ActionPlan action, UUID utilisateurId, UUID entrepriseId) {
        if (estAdministrateurDeLaMission(utilisateurId, entrepriseId)) {
            return;
        }
        Utilisateur responsable = action.getResponsable();
        if (responsable == null || !responsable.getId().equals(utilisateurId)) {
            throw new ForbiddenException(
                    "Seul le responsable de cette action, ou l'administration de la mission, "
                            + "peut la modifier");
        }
    }

    public boolean estAdministrateurDeLaMission(UUID utilisateurId, UUID entrepriseId) {
        return autorisationService.possedeRoleSurEntreprise(
                utilisateurId, entrepriseId, AutorisationService.ROLES_ADMINISTRATION_ENTREPRISE);
    }

    // === Cycle de vie du plan ============================================

    /**
     * Change le statut du plan en respectant le cycle.
     *
     * <p>L'activation exige au moins une action : un plan vide déclaré actif
     * annoncerait un engagement que rien ne porte.
     */
    public void changerStatutPlan(PlanAction plan, StatutPlan cible,
                                  UUID utilisateurId, UUID entrepriseId) {
        StatutPlan actuel = plan.getStatut();
        if (actuel == cible) {
            throw new OperationPlanRefusee("Ce plan est déjà « " + cible + " »");
        }
        if (actuel.estGele()) {
            throw new OperationPlanRefusee(
                    "Ce plan est « " + actuel + " » : il est gelé et ne change plus d'état.");
        }
        if (!TRANSITIONS_PLAN.get(actuel).contains(cible)) {
            throw new OperationPlanRefusee(
                    "Transition refusée : « " + actuel + " » ne mène pas à « " + cible + " »");
        }
        if (cible == StatutPlan.CLOTURE || cible == StatutPlan.ARCHIVE) {
            throw new OperationPlanRefusee(
                    "Clôture et archivage passent par leur propre route, qui exige un motif.");
        }
        if (cible == StatutPlan.ACTIF && actionRepository.parPlan(plan.getId()).isEmpty()) {
            throw new OperationPlanRefusee(
                    "Un plan sans aucune action ne peut pas être activé");
        }

        plan.setStatut(cible);
        auditLogService.journaliserAvecDetails(utilisateurId, entrepriseId,
                "PLAN_ACTION_STATUT_CHANGE", "plan_action", plan.getId(),
                """
                {"ancienStatut":"%s","nouveauStatut":"%s"}""".formatted(actuel, cible));
    }

    /**
     * Clôture le plan : il est arrivé à son terme.
     *
     * <p>Le motif est exigé ici comme il l'est en base. Un plan clôturé sans
     * motif lisible ne se relit pas.
     */
    public void cloturer(PlanAction plan, Utilisateur decideur, String motif,
                         UUID utilisateurId, UUID entrepriseId) {
        exigerNonGele(plan);
        if (motif == null || motif.isBlank()) {
            throw new BadRequestException("La clôture d'un plan doit être motivée");
        }
        StatutPlan actuel = plan.getStatut();
        plan.cloturer(decideur, motif);
        auditLogService.journaliserAvecDetails(utilisateurId, entrepriseId,
                "PLAN_ACTION_CLOTURE", "plan_action", plan.getId(),
                """
                {"ancienStatut":"%s","nouveauStatut":"CLOTURE"}""".formatted(actuel));
    }

    /**
     * Archive le plan : il est retiré sans avoir été mené à terme.
     *
     * <p>C'est ce qui remplace la suppression. Effacer le plan emporterait ses
     * actions par cascade et la trace du travail engagé avec elles.
     */
    public void archiver(PlanAction plan, Utilisateur decideur, String motif,
                         UUID utilisateurId, UUID entrepriseId) {
        exigerNonGele(plan);
        StatutPlan actuel = plan.getStatut();
        plan.archiver(decideur, motif);
        auditLogService.journaliserAvecDetails(utilisateurId, entrepriseId,
                "PLAN_ACTION_ARCHIVE", "plan_action", plan.getId(),
                """
                {"ancienStatut":"%s","nouveauStatut":"ARCHIVE"}""".formatted(actuel));
    }

    /** Un plan gelé n'accepte plus aucune modification métier (D25). */
    public void exigerPlanModifiable(PlanAction plan) {
        exigerNonGele(plan);
    }

    private static void exigerNonGele(PlanAction plan) {
        if (plan.estGele()) {
            throw new OperationPlanRefusee(
                    "Ce plan est « " + plan.getStatut() + " » : il est gelé.");
        }
    }

    // === Progression, calculée et jamais stockée =========================

    /**
     * Avancement du plan, dérivé de ses actions.
     *
     * <p>Aucune colonne ne le porte, et c'est délibéré : une progression
     * saisie à la main diverge de ses actions dès la première mise à jour
     * oubliée, et l'on ne sait plus laquelle des deux dit vrai. Le même
     * raisonnement avait conduit à calculer le risque RG26 à la lecture.
     *
     * <p>{@code TERMINEE} et {@code VALIDEE} comptent toutes deux comme
     * faites : une action réalisée l'est, que le responsable l'ait déjà
     * constatée ou non.
     */
    public static int progression(List<ActionPlan> actions) {
        if (actions == null || actions.isEmpty()) {
            return 0;
        }
        long faites = actions.stream()
                .filter(a -> a.getStatut() == StatutActionCorrective.TERMINEE
                        || a.getStatut() == StatutActionCorrective.VALIDEE)
                .count();
        return (int) Math.round(faites * 100.0 / actions.size());
    }

    /**
     * Vrai lorsque l'échéance est dépassée sans que le travail soit fait.
     *
     * <p>Un simple signal : le statut n'est jamais changé automatiquement
     * (D20). Un statut qui bouge sans geste humain n'est plus opposable — et
     * une action en retard reste une action ouverte, pas une action annulée.
     */
    public static boolean enRetard(LocalDate echeance, StatutActionCorrective statut) {
        if (echeance == null) {
            return false;
        }
        if (statut == StatutActionCorrective.TERMINEE || statut == StatutActionCorrective.VALIDEE) {
            return false;
        }
        return echeance.isBefore(LocalDate.now());
    }

    /** Même signal, au niveau du plan. */
    public static boolean planEnRetard(LocalDate echeance, StatutPlan statut) {
        if (echeance == null || statut.estGele()) {
            return false;
        }
        return echeance.isBefore(LocalDate.now());
    }
}
