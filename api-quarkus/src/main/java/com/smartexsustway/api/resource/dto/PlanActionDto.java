package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.ActionPlan;
import com.smartexsustway.api.domain.entity.AxeAmelioration;
import com.smartexsustway.api.planification.PlanActionService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Un plan de mission et ses actions.
 *
 * <p>Ce DTO ne porte aucun champ de raisonnement IA — ni justification, ni
 * trace d'exécution, ni élément de prompt. Un plan est un objet
 * organisationnel : il dit qui fait quoi et pour quand. Le raisonnement qui a
 * conduit l'IA à proposer l'axe sous-jacent reste sur l'évaluation, où D1 le
 * réserve à l'administration.
 */
public record PlanActionDto(
        UUID id,
        UUID auditId,
        String titre,
        String description,
        String statut,
        UUID responsableId,
        /**
         * « Prénom Nom » du responsable, pour que l'interface n'ait jamais à
         * afficher un identifiant technique. Même résolution que
         * {@code ActionCorrectiveDto}, qui la portait déjà.
         */
        String responsableNom,
        LocalDate dateEcheance,
        String origine,
        OffsetDateTime creeLe,

        /**
         * Avancement en pourcentage, <strong>dérivé des actions</strong> et
         * jamais stocké. Une valeur persistée diverge de ses actions dès la
         * première mise à jour oubliée, et l'on ne sait plus laquelle dit vrai.
         */
        int progression,

        /** Échéance dépassée sur un plan encore ouvert. Signal, jamais un statut. */
        boolean enRetard,

        /** Vrai lorsque le plan est clôturé ou archivé : il n'accepte plus rien. */
        boolean gele,

        /** Pourquoi le plan a été gelé, et par qui. Nuls tant qu'il ne l'est pas. */
        String motifCloture,
        UUID cloturePar,
        OffsetDateTime clotureLe,

        List<ActionDto> actions) {

    public static PlanActionDto depuis(com.smartexsustway.api.domain.entity.PlanAction plan,
                                       List<ActionPlan> actions) {
        return new PlanActionDto(
                plan.getId(),
                plan.getAudit().getId(),
                plan.getTitre(),
                plan.getDescription(),
                plan.getStatut().name(),
                plan.getResponsable() == null ? null : plan.getResponsable().getId(),
                nomComplet(plan.getResponsable()),
                plan.getDateEcheance(),
                plan.getOrigine().name(),
                plan.getCreeLe(),
                PlanActionService.progression(actions),
                PlanActionService.planEnRetard(plan.getDateEcheance(), plan.getStatut()),
                plan.estGele(),
                plan.getMotifCloture(),
                plan.getCloturePar() == null ? null : plan.getCloturePar().getId(),
                plan.getClotureLe(),
                actions.stream().map(ActionDto::depuis).toList());
    }

    /**
     * Une action et les axes qu'elle traite.
     *
     * <p>{@code axeIds} est une liste, et non un identifiant : une même
     * action — « formaliser et diffuser la politique RSE » — répond
     * couramment à trois axes distincts. Les représenter par un champ
     * unique obligerait à dupliquer l'action, et chaque copie porterait
     * alors son propre responsable et sa propre échéance sans que rien ne
     * dise qu'il s'agit du même travail.
     */
    public record ActionDto(
            UUID id,
            UUID planId,
            String titre,
            String description,
            UUID responsableId,
            /** « Prénom Nom » du responsable ; nul si l'action n'est affectée à personne. */
            String responsableNom,
            LocalDate dateEcheance,
            String statut,
            String priorite,
            int ordre,
            /** Échéance dépassée sur une action non faite. Signal, jamais un statut. */
            boolean enRetard,
            List<UUID> axeIds) {

        public static ActionDto depuis(ActionPlan action) {
            return new ActionDto(
                    action.getId(),
                    action.getPlan().getId(),
                    action.getTitre(),
                    action.getDescription(),
                    action.getResponsable() == null ? null : action.getResponsable().getId(),
                    nomComplet(action.getResponsable()),
                    action.getDateEcheance(),
                    action.getStatut().name(),
                    action.getPriorite().name(),
                    action.getOrdre(),
                    PlanActionService.enRetard(action.getDateEcheance(), action.getStatut()),
                    action.getAxes().stream().map(AxeAmelioration::getId).toList());
        }
    }

    /**
     * « Prénom Nom », ou {@code null} si personne n'est désigné.
     *
     * <p>Reprise de la résolution déjà employée par
     * {@code ActionCorrectiveDto} : une seule façon de nommer une personne
     * dans l'application, plutôt que deux formats à réconcilier à l'écran.
     */
    private static String nomComplet(com.smartexsustway.api.domain.entity.Utilisateur utilisateur) {
        return utilisateur == null ? null : utilisateur.getPrenom() + " " + utilisateur.getNom();
    }

    public record CreationDto(
            @NotBlank(message = "Le titre est obligatoire")
            @Size(max = 255, message = "Le titre ne peut dépasser 255 caractères")
            String titre,
            String description,
            LocalDate dateEcheance,
            UUID responsableId) {
    }

    public record StatutDto(
            @NotBlank(message = "Le statut est obligatoire")
            String statut) {
    }

    /**
     * Clôture d'un plan. Le motif est exigé ici comme il l'est en base : un
     * plan clôturé sans motif ne se relit pas six mois plus tard.
     */
    public record ClotureDto(
            @NotBlank(message = "La clôture d'un plan doit être motivée")
            String motif) {
    }

    /** Archivage d'un plan. Le motif est utile, mais pas exigé. */
    public record ArchivageDto(String motif) {
    }

    /** Création d'une action, avec les axes qu'elle traite. */
    public record CreationActionDto(
            @NotBlank(message = "Le titre est obligatoire")
            @Size(max = 255, message = "Le titre ne peut dépasser 255 caractères")
            String titre,
            String description,
            LocalDate dateEcheance,
            UUID responsableId,
            String priorite,
            List<UUID> axeIds) {
    }

    /**
     * Modification d'une action. Ne porte ni statut ni responsable : ces deux
     * gestes ont leur propre route, parce qu'ils n'obéissent pas aux mêmes
     * droits — un collaborateur avance son travail sans pouvoir le réaffecter.
     */
    public record ModificationActionDto(
            @NotBlank(message = "Le titre est obligatoire")
            @Size(max = 255, message = "Le titre ne peut dépasser 255 caractères")
            String titre,
            String description,
            LocalDate dateEcheance,
            String priorite) {
    }

    public record StatutActionDto(
            @NotBlank(message = "Le statut est obligatoire")
            String statut) {
    }

    /**
     * Réaffectation. {@code responsableId} nul vaut désaffectation explicite —
     * un champ absent et un champ nul disent ici la même chose, et c'est
     * volontaire : retirer un responsable est un geste légitime.
     */
    public record ResponsableActionDto(UUID responsableId) {
    }

    /**
     * Les axes qu'une action traite désormais.
     *
     * <p>La liste remplace l'ensemble : une liste vide détache tout, ce qui
     * est un geste légitime. Un corps absent vaut liste vide.
     */
    public record AxesActionDto(List<UUID> axeIds) {
    }
}
