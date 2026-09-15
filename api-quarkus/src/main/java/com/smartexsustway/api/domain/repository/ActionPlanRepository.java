package com.smartexsustway.api.domain.repository;

import com.smartexsustway.api.domain.entity.ActionPlan;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Actions d'un plan, et leur rattachement aux axes. */
@ApplicationScoped
public class ActionPlanRepository implements PanacheRepositoryBase<ActionPlan, UUID> {

    public List<ActionPlan> parPlan(UUID planId) {
        return list("plan.id = ?1 order by ordre asc, id asc", planId);
    }

    /**
     * Même liste, axes chargés.
     *
     * <p>Le DTO lit {@code getAxes()} sur chaque action : sans ce
     * {@code join fetch}, une liste de N actions déclenche N requêtes de plus,
     * la relation étant {@code LAZY}.
     */
    public List<ActionPlan> parPlanAvecAxes(UUID planId) {
        return list("""
                select distinct a from ActionPlan a
                left join fetch a.axes
                where a.plan.id = ?1
                order by a.ordre asc, a.id asc
                """, planId);
    }

    /**
     * Actions traitant un axe donné.
     *
     * <p>Le sens inverse de la relation : un axe peut être traité par
     * plusieurs actions, ou par aucune s'il a été proposé sans être repris.
     */
    public List<ActionPlan> traitantLAxe(UUID axeId) {
        return list("select a from ActionPlan a join a.axes x where x.id = ?1 order by a.ordre asc", axeId);
    }

    /**
     * Isolation multi-tenant : remonte jusqu'à la mission par le plan.
     *
     * <p>L'action ne porte pas `audit_id` en propre — contrairement au plan
     * et à l'axe — parce qu'elle vit en CASCADE sous un parent qui, lui, le
     * porte. Le contrôle d'accès passe donc explicitement par ce chemin.
     */
    public Optional<ActionPlan> parIdEtAudit(UUID id, UUID auditId) {
        return find("id = ?1 and plan.audit.id = ?2", id, auditId).firstResultOptional();
    }

    /**
     * Les actions dont une personne est responsable, dans une entreprise.
     *
     * <p>Le filtre est posé <strong>en base</strong>, sur les deux critères à
     * la fois. Charger toutes les actions pour les trier ensuite reviendrait à
     * les avoir transmises : ce qui n'est pas rendu ici ne quitte jamais le
     * serveur.
     *
     * <p>L'identifiant de l'utilisateur vient du jeton, jamais d'un paramètre
     * de requête — c'est la raison pour laquelle cette méthode ne sert qu'un
     * appelant qui a déjà résolu l'identité.
     *
     * <p>Les plans gelés restent rendus : une action terminée sur un plan clos
     * fait partie du travail accompli, et la masquer donnerait l'impression
     * qu'elle n'a jamais existé.
     */
    public List<ActionPlan> parResponsableDansEntreprise(UUID utilisateurId, UUID entrepriseId) {
        return list("""
                select distinct a from ActionPlan a
                join fetch a.plan p
                join fetch p.audit aud
                left join fetch a.axes
                where a.responsable.id = ?1
                  and aud.entreprise.id = ?2
                order by a.dateEcheance asc nulls last, a.ordre asc, a.id asc
                """, utilisateurId, entrepriseId);
    }
}
