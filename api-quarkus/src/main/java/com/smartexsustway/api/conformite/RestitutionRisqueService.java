package com.smartexsustway.api.conformite;

import com.smartexsustway.api.domain.entity.Criticite;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.entity.NonConforme;
import com.smartexsustway.api.domain.repository.NonConformeRepository;
import com.smartexsustway.api.domain.rules.ScoringEngine;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * Le risque déterministe d'une évaluation, calculé à la lecture.
 *
 * <p>RG26 n'était jusqu'ici calculé qu'à un seul endroit —
 * {@link NonConformiteService} — et seulement pour un critère en écart. Un
 * critère conforme n'avait donc aucun risque, ni calculé ni consultable :
 * non pas parce qu'il n'en a pas, mais parce que le seul chemin qui mène au
 * calcul passe par la création d'une non-conformité.
 *
 * <p>Ce service ouvre un second chemin, en <strong>lecture seule</strong>.
 * Il n'écrit rien, ne crée aucune non-conformité, et ne modifie pas le
 * comportement de {@link NonConformiteService} — c'eût été corriger un
 * défaut d'affichage en changeant une règle métier.
 *
 * <p><strong>Aucune formule n'est recopiée.</strong> Le calcul passe
 * exclusivement par {@link ScoringEngine}, seul dépositaire de RG26. Une
 * seconde implémentation, même identique aujourd'hui, divergerait au
 * premier ajustement des seuils — et rien ne signalerait laquelle fait foi.
 *
 * <h2>Calculé, ou figé</h2>
 *
 * Deux valeurs peuvent coexister pour un même critère :
 *
 * <ul>
 *   <li>celle <em>recalculée</em> depuis l'évaluation consultée — toujours
 *       cohérente avec sa probabilité ;
 *   <li>celle <em>figée</em> sur la non-conformité au moment de la
 *       validation — celle qui a servi à prioriser.
 * </ul>
 *
 * Les deux sont rendues, et le champ {@code fige} dit laquelle existe.
 * Les confondre ferait passer un écart entre l'avant et l'après-validation
 * pour une incohérence.
 */
@ApplicationScoped
public class RestitutionRisqueService {

    @Inject NonConformeRepository nonConformeRepository;

    /**
     * Le risque déterministe d'une évaluation.
     *
     * <p>{@code criticitePoids} est nul si le critère n'a pas de criticité
     * résolue (RG37) : le risque est alors indéterminable, et c'est dit
     * plutôt que comblé par une valeur arbitraire.
     */
    public record RisqueMetier(
            String source,
            BigDecimal probabiliteConformite,
            BigDecimal criticitePoids,
            String criticiteCode,
            BigDecimal risqueAttendu,
            String niveau,
            String explication,
            boolean fige,
            BigDecimal risqueFigeNonConformite,
            String niveauFigeNonConformite) {
    }

    /** Identifie sans ambiguïté l'origine du calcul, face au signal de l'IA. */
    public static final String SOURCE = "RG26";

    /**
     * Calcule — sans rien écrire — le risque déterministe de l'évaluation
     * <strong>consultée</strong>, et non de la dernière du critère.
     *
     * <p>Cette précision n'est pas théorique : une ré-analyse produit une
     * nouvelle probabilité, donc un nouveau risque. Afficher celui de la
     * dernière évaluation en marge d'une évaluation antérieure donnerait un
     * chiffre qui ne correspond à rien de ce qui est à l'écran.
     */
    public RisqueMetier calculer(Evaluation evaluation) {
        BigDecimal probabilite = evaluation.getProbabiliteConforme();
        Criticite criticite = evaluation.getAuditCritere().getCriticite();

        Optional<NonConforme> courante = nonConformeRepository
                .couranteParAuditCritere(evaluation.getAuditCritere().getId());
        BigDecimal risqueFige = courante.map(NonConforme::getRisqueAttendu).orElse(null);
        String niveauFige = courante.map(nc -> nc.getNiveau().name()).orElse(null);

        if (criticite == null) {
            // RG37 : sans poids de criticité, le risque n'est pas
            // calculable. On ne substitue pas une valeur neutre — un zéro
            // se lirait comme « aucun risque », ce qui est une autre
            // affirmation que « risque indéterminable ».
            return new RisqueMetier(SOURCE, probabilite, null, null, null, null,
                    "Criticité non résolue pour ce critère : le risque attendu n'est pas calculable.",
                    risqueFige != null, risqueFige, niveauFige);
        }

        BigDecimal poids = criticite.getPoids();
        BigDecimal risque = ScoringEngine.risqueAttendu(probabilite, poids);
        ScoringEngine.NiveauPriorite niveau = ScoringEngine.prioriteNonConformite(risque);

        return new RisqueMetier(
                SOURCE,
                probabilite,
                poids,
                criticite.getCode().name(),
                risque,
                niveau.name(),
                explication(probabilite, poids, risque),
                risqueFige != null,
                risqueFige,
                niveauFige);
    }

    /**
     * Le calcul, écrit en toutes lettres.
     *
     * <p>C'est ce qui distingue un résultat déterministe d'un avis : un
     * chiffre qui montre d'où il vient n'a pas besoin qu'on le croie sur
     * parole. Le signal de l'IA, lui, ne peut pas en faire autant — et
     * c'est précisément la différence que la restitution doit rendre
     * visible.
     */
    private static String explication(BigDecimal probabilite, BigDecimal poids, BigDecimal risque) {
        return "(1 − %s) × %s = %s".formatted(
                probabilite.stripTrailingZeros().toPlainString(),
                poids.stripTrailingZeros().toPlainString(),
                risque.stripTrailingZeros().toPlainString());
    }
}
