package com.smartexsustway.api.mission;

import com.smartexsustway.api.conformite.NonConformiteService;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.enums.StatutAudit;
import com.smartexsustway.api.domain.enums.StatutEvaluation;
import com.smartexsustway.api.scoring.ScoreHistoriqueService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

/**
 * Le geste humain qui transforme un résultat de machine en verdict.
 *
 * <p>Jusqu'ici l'analyse écrivait {@code VALIDEE} elle-même, au titre de
 * RG16 : une sortie d'IA entrait donc immédiatement dans le score officiel
 * et déclenchait la génération d'une non-conformité opposable, sans que
 * personne ne l'ait relue. Les 44 évaluations de la base sont toutes dans
 * cet état, aucune ne portant de validateur.
 *
 * <p>Le pipeline V2 produit désormais des évaluations {@code EN_REVUE}, que
 * {@code AuditScoreService} exclut déjà du score — ce mécanisme existait
 * depuis toujours et n'avait jamais servi. Ce service est le seul chemin
 * vers {@code VALIDEE}, et il est gardé par une permission distincte de
 * celle qui lance l'analyse : produire un résultat n'est pas l'accepter.
 *
 * <p>Trois effets, dans cet ordre et dans une seule transaction — l'appelant
 * en est responsable :
 *
 * <ol>
 *   <li>l'évaluation passe à {@code VALIDEE} et porte son validateur ;
 *   <li>la non-conformité du critère est créée ou actualisée ;
 *   <li>le score de la mission est ré-instantané.
 * </ol>
 *
 * <p>Aucun état partiel n'est acceptable : une évaluation validée dont la
 * non-conformité n'aurait pas suivi laisserait la mission avec un écart
 * invisible.
 */
@ApplicationScoped
public class ValidationEvaluationService {

    private static final Logger LOG = Logger.getLogger(ValidationEvaluationService.class);

    @Inject NonConformiteService nonConformiteService;
    @Inject ScoreHistoriqueService scoreHistoriqueService;

    /** Issue de la validation, pour que l'appelant réponde sans interpréter d'exception. */
    public sealed interface Resultat {
        record Validee(Evaluation evaluation) implements Resultat {}

        /** L'évaluation n'était pas dans un état d'où l'on peut valider. */
        record EtatIncompatible(StatutEvaluation statutActuel, String message) implements Resultat {}
    }

    /**
     * Fait passer une évaluation de {@code EN_REVUE} à {@code VALIDEE}.
     *
     * <p>Une évaluation déjà {@code VALIDEE} est refusée plutôt que traitée
     * comme un succès silencieux : revalider signifierait ré-instantaner le
     * score et réactualiser la non-conformité sans qu'aucune décision
     * nouvelle n'ait été prise. Le refus est explicite, et l'appelant en
     * informe l'utilisateur.
     */
    public Resultat valider(Evaluation evaluation, Utilisateur validateur) {
        // Une mission close est un résultat figé : y valider une évaluation
        // ferait bouger son score et pourrait y faire naître une
        // non-conformité après coup. La garde est ici, et non dans la
        // ressource, parce que c'est une règle du métier et non du transport
        // — tout appelant futur de ce service doit s'y heurter.
        //
        // Une mission encore en brouillon n'a rien à valider non plus : le
        // cycle de vie la fait passer à EN_COURS dès la première évaluation
        // (voir CycleVieMissionService), donc s'y trouver signale une
        // incohérence plutôt qu'un cas d'usage.
        StatutAudit statutMission = evaluation.getAuditCritere().getAudit().getStatut();
        if (statutMission != StatutAudit.EN_COURS) {
            return new Resultat.EtatIncompatible(evaluation.getStatut(),
                    statutMission == StatutAudit.TERMINE
                            ? "Cette mission est clôturée : son résultat est figé"
                            : "Cette mission n'est pas en cours : aucune évaluation ne peut y être validée");
        }

        if (evaluation.getStatut() == StatutEvaluation.VALIDEE) {
            return new Resultat.EtatIncompatible(StatutEvaluation.VALIDEE,
                    "Cette évaluation est déjà validée");
        }
        if (evaluation.getStatut() != StatutEvaluation.EN_REVUE) {
            return new Resultat.EtatIncompatible(evaluation.getStatut(),
                    "Seule une évaluation en revue peut être validée");
        }

        evaluation.validerPar(validateur);

        // La non-conformité naît ici, et non à l'analyse : un écart n'est
        // opposable qu'une fois le résultat accepté par une personne.
        nonConformiteService.genererSiNecessaire(evaluation);

        // Le score officiel vient de changer : l'évaluation vient d'y
        // entrer. L'instantané suit, sans quoi l'historique montrerait un
        // score antérieur à la validation.
        scoreHistoriqueService.enregistrer(evaluation.getAuditCritere().getAudit());

        LOG.debugf("Évaluation %s validée par %s", evaluation.getId(), validateur.getId());
        return new Resultat.Validee(evaluation);
    }
}
