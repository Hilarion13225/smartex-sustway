package com.smartexsustway.api.conformite;

import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Criticite;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.entity.NonConforme;
import com.smartexsustway.api.domain.enums.NiveauNonConformite;
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
 * appelé après qu'une évaluation IA passe directement en VALIDEE
 * (EvaluationResource, pas de revue requise) ou après qu'une revue
 * experte est traitée (RevueExperteResource). Un critère jugé pleinement
 * conforme (niveau d'engagement 5) ne génère aucune non-conformité —
 * seuls les écarts (niveaux 1 à 4) sont tracés, avec une priorité qui
 * reflète leur gravité réelle plutôt qu'un simple seuil binaire
 * conforme/non-conforme.
 */
@ApplicationScoped
public class NonConformiteService {

    private static final int NIVEAU_ENGAGEMENT_MAXIMAL = 5;
    private static final int TITRE_MAX_LENGTH = 255;

    @Inject NonConformeRepository nonConformeRepository;

    public Optional<NonConforme> genererSiNecessaire(Evaluation evaluation) {
        if (evaluation.getNote() >= NIVEAU_ENGAGEMENT_MAXIMAL) {
            return Optional.empty();
        }

        AuditCritere auditCritere = evaluation.getAuditCritere();
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

        String titre = titre(auditCritere);
        String description = description(evaluation);

        NonConforme nonConforme = new NonConforme(evaluation, titre, description, niveau, risqueAttendu);
        nonConformeRepository.persist(nonConforme);
        return Optional.of(nonConforme);
    }

    private static String titre(AuditCritere auditCritere) {
        String titre = "Non-conformité — " + auditCritere.getCritere().getCode() + " " + auditCritere.getCritere().getLibelle();
        return titre.length() > TITRE_MAX_LENGTH ? titre.substring(0, TITRE_MAX_LENGTH) : titre;
    }

    private static String description(Evaluation evaluation) {
        StringBuilder description = new StringBuilder();
        if (evaluation.getJustification() != null) {
            description.append(evaluation.getJustification());
        }
        if (evaluation.getPistesAmelioration() != null && !evaluation.getPistesAmelioration().isBlank()) {
            if (!description.isEmpty()) {
                description.append("\n\n");
            }
            description.append("Pistes d'amélioration : ").append(evaluation.getPistesAmelioration());
        }
        return description.isEmpty() ? null : description.toString();
    }
}
