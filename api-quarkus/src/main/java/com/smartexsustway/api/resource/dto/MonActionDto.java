package com.smartexsustway.api.resource.dto;

import com.smartexsustway.api.domain.entity.ActionPlan;
import com.smartexsustway.api.domain.entity.AxeAmelioration;
import com.smartexsustway.api.planification.PlanActionService;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Une action dont l'utilisateur courant est responsable, avec le contexte
 * minimal qui la rend compréhensible hors de son plan.
 *
 * <p>Sans le titre du plan et le nom de la mission, une liste transverse
 * n'afficherait qu'une suite de tâches sans rattachement — l'utilisateur
 * devrait ouvrir chacune pour savoir d'où elle vient. Ce contexte est donc la
 * raison d'être de ce DTO, et sa seule addition.
 *
 * <p>Ce qu'il ne porte pas : aucune justification, aucun raisonnement,
 * aucune trace d'exécution. Une action est une tâche à faire ; le
 * raisonnement qui a conduit l'IA à proposer l'axe sous-jacent reste sur
 * l'évaluation, où D1 le réserve à l'administration.
 */
public record MonActionDto(
        UUID id,
        String titre,
        String description,
        String statut,
        String priorite,
        LocalDate dateEcheance,
        /** Signal serveur : échéance dépassée sur une action non faite. */
        boolean enRetard,

        // --- Contexte, pour situer l'action sans ouvrir le plan ----------
        UUID planId,
        String planTitre,
        String planStatut,
        /** Vrai si le plan est clôturé ou archivé : l'action ne bouge plus. */
        boolean planGele,
        UUID auditId,
        String auditNom,

        /** Libellés des axes traités, pour dire à quoi sert cette tâche. */
        List<String> axes
) {
    public static MonActionDto depuis(ActionPlan action) {
        var plan = action.getPlan();
        var audit = plan.getAudit();
        return new MonActionDto(
                action.getId(),
                action.getTitre(),
                action.getDescription(),
                action.getStatut().name(),
                action.getPriorite().name(),
                action.getDateEcheance(),
                PlanActionService.enRetard(action.getDateEcheance(), action.getStatut()),
                plan.getId(),
                plan.getTitre(),
                plan.getStatut().name(),
                plan.estGele(),
                audit.getId(),
                audit.getNom(),
                action.getAxes().stream().map(AxeAmelioration::getLibelle).toList());
    }
}
