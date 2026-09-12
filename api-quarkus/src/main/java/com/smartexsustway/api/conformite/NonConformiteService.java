package com.smartexsustway.api.conformite;

import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Criticite;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.entity.NonConforme;
import com.smartexsustway.api.domain.enums.NiveauNonConformite;
import com.smartexsustway.api.domain.enums.StatutNonConformite;
import com.smartexsustway.api.domain.repository.NonConformeRepository;
import com.smartexsustway.api.domain.rules.ScoringEngine;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * RG17 : génère automatiquement une non-conformité lorsqu'une évaluation
 * devient définitive (statut VALIDEE) et n'atteint pas le niveau
 * d'engagement maximal (5/5 — RG27). RG26 : le risque attendu et la
 * priorité de la non-conformité sont dérivés via ScoringEngine, jamais
 * fixés directement — même discipline que la note (RG27) et la revue
 * experte (RG16).
 *
 * Seul point de création de {@link NonConforme} dans l'application —
 * appelé après qu'une évaluation IA passe en VALIDEE (EvaluationResource).
 * Un critère jugé pleinement
 * conforme (niveau d'engagement 5) ne génère aucune non-conformité —
 * seuls les écarts (niveaux 1 à 4) sont tracés, avec une priorité qui
 * reflète leur gravité réelle plutôt qu'un simple seuil binaire
 * conforme/non-conforme.
 *
 * <p><strong>Une ré-analyse n'ajoute plus de ligne.</strong> Ce service
 * persistait auparavant sans condition, et aucune contrainte d'unicité ne
 * l'en empêchait : chaque ré-analyse d'un critère non conforme créait une
 * non-conformité de plus, avec le même titre — celui-ci étant dérivé du
 * seul code du critère. La base en portait 39 pour 22 critères.
 *
 * <p>L'identité d'un écart est désormais son critère. Trois issues, et
 * trois seulement :
 *
 * <ul>
 *   <li>aucun écart courant et le critère n'est pas conforme → création ;
 *   <li>un écart courant existe → <em>actualisation</em>, statut métier
 *       préservé ;
 *   <li>le critère est devenu conforme → l'écart courant est clôturé, pas
 *       supprimé.
 * </ul>
 */
@ApplicationScoped
public class NonConformiteService {

    private static final int NIVEAU_ENGAGEMENT_MAXIMAL = 5;
    private static final int TITRE_MAX_LENGTH = 255;

    @Inject NonConformeRepository nonConformeRepository;

    public Optional<NonConforme> genererSiNecessaire(Evaluation evaluation) {
        AuditCritere auditCritere = evaluation.getAuditCritere();
        Optional<NonConforme> courante =
                nonConformeRepository.couranteParAuditCritere(auditCritere.getId());

        if (evaluation.getNote() >= NIVEAU_ENGAGEMENT_MAXIMAL) {
            // Le critère est désormais pleinement conforme. L'écart
            // constaté auparavant ne disparaît pas de l'historique : il est
            // clôturé, ce qui est vrai, plutôt que supprimé, ce qui
            // effacerait la trace du travail accompli pour le résorber.
            courante.ifPresent(nc -> nc.setStatut(StatutNonConformite.CLOTUREE));
            return Optional.empty();
        }

        Criticite criticite = auditCritere.getCriticite();
        if (criticite == null) {
            // Pas de poids de criticité résolu pour ce critère (RG37) :
            // impossible de calculer un risque attendu, donc impossible de
            // prioriser correctement la non-conformité (RG26) — on ne trace
            // rien plutôt que d'inventer un niveau arbitraire.
            return Optional.empty();
        }

        BigDecimal risqueAttendu = ScoringEngine.risqueAttendu(evaluation.getProbabiliteConforme(), criticite.getPoids());
        NiveauNonConformite niveau = NiveauNonConformite.valueOf(
                ScoringEngine.prioriteNonConformite(risqueAttendu).name());
        String description = description(evaluation);

        // Ré-analyse d'un critère déjà en écart : le même écart reste le
        // même écart. On actualise sa gravité et sa description au vu de la
        // dernière analyse, au lieu d'en créer un second qui porterait le
        // même titre — c'est ainsi que la base en est arrivée à 39 lignes
        // pour 22 critères.
        //
        // Le statut métier n'est pas touché : une non-conformité en cours
        // de traitement, avec ses actions correctives rattachées, ne doit
        // pas être ramenée à l'état ouvert parce qu'une analyse a été
        // relancée.
        if (courante.isPresent()) {
            NonConforme existante = courante.get();
            existante.actualiserDepuis(evaluation, description, niveau, risqueAttendu);
            return Optional.of(existante);
        }

        NonConforme nonConforme = new NonConforme(
                evaluation, titre(auditCritere), description, niveau, risqueAttendu);
        nonConformeRepository.persist(nonConforme);
        return Optional.of(nonConforme);
    }

    private static String titre(AuditCritere auditCritere) {
        String titre = "Non-conformité — " + auditCritere.getCritere().getCode() + " " + auditCritere.getCritere().getLibelle();
        return titre.length() > TITRE_MAX_LENGTH ? titre.substring(0, TITRE_MAX_LENGTH) : titre;
    }

    /**
     * Le constat opérationnel porté par la non-conformité — et lui seul.
     *
     * <p>Ce champ contenait auparavant {@code evaluation.getJustification()},
     * concaténée aux pistes d'amélioration. C'était une fuite : la
     * justification est le <em>raisonnement</em> de l'IA, que D1 réserve à
     * l'administration de l'audit, alors que la non-conformité est lisible
     * par tout membre de l'entreprise. Le masquage posé sur
     * {@code EvaluationDto} ne servait donc à rien tant que le même texte
     * ressortait par la route des non-conformités.
     *
     * <p>Ce qui reste : les pistes d'amélioration. La ligne de partage est
     * exactement celle que D1 trace déjà sur l'évaluation — les pistes
     * disent <em>quoi faire</em> et sont opérationnelles ; la justification
     * dit <em>pourquoi le jugement a été rendu</em> et relève de la
     * relecture. Reprendre cette frontière plutôt qu'en inventer une
     * seconde évite que les deux surfaces divergent à nouveau.
     *
     * <p>Aucun texte n'est fabriqué ici : si l'analyse n'a produit aucune
     * piste, la description est nulle. Un constat inventé serait pire qu'un
     * champ vide — il aurait l'air d'un constat.
     */
    private static String description(Evaluation evaluation) {
        String pistes = evaluation.getPistesAmelioration();
        if (pistes == null || pistes.isBlank()) {
            return null;
        }
        return "Pistes d'amélioration : " + pistes;
    }
}
