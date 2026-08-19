package com.smartexsustway.api.domain.rules;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Moteur de règles Smartex Sustway — calculs de score et de risque.
 *
 * Implémente les règles de gestion du CDC v1.5/1.6, section 11 :
 *   - RG27/RG31 : conversion probabilité de conformité (IA) -> niveau d'engagement (1-5)
 *                 puis note obtenue (niveau x coefficient de pondération)
 *   - RG32      : score de domaine / score global = somme des notes obtenues
 *                 / somme des coefficients de pondération
 *   - RG26      : risque attendu = (1 - probabilité de conformité) x poids de criticité
 *
 * Classe volontairement dépourvue de toute dépendance à Quarkus/Hibernate :
 * logique métier pure, testable indépendamment de la couche de persistance
 * (entités JPA branchées dessus à partir de la phase D, quand AUDIT_CRITERE
 * et EVALUATION existeront en base).
 */
public final class ScoringEngine {

    private ScoringEngine() {
        // classe utilitaire, non instanciable
    }

    /**
     * RG27 / §11.1 — Conversion de la probabilité de conformité IA (0-1)
     * en niveau d'engagement (1 à 5), selon la grille de Likert Smartex.
     */
    public static int niveauEngagement(BigDecimal probabiliteConformite) {
        requireProbabilite(probabiliteConformite);
        if (probabiliteConformite.compareTo(new BigDecimal("0.90")) >= 0) return 5;
        if (probabiliteConformite.compareTo(new BigDecimal("0.75")) >= 0) return 4;
        if (probabiliteConformite.compareTo(new BigDecimal("0.50")) >= 0) return 3;
        if (probabiliteConformite.compareTo(new BigDecimal("0.25")) >= 0) return 2;
        return 1;
    }

    /**
     * RG31 / §11.2 — Note obtenue = niveau d'engagement (1-5) x coefficient
     * de pondération (1 à 3, choisi par l'entreprise cliente pour ce critère).
     */
    public static BigDecimal noteObtenue(int niveauEngagement, BigDecimal coefficientPonderation) {
        if (niveauEngagement < 1 || niveauEngagement > 5) {
            throw new IllegalArgumentException("Le niveau d'engagement doit être compris entre 1 et 5");
        }
        requireCoefficient(coefficientPonderation);
        return BigDecimal.valueOf(niveauEngagement).multiply(coefficientPonderation);
    }

    /**
     * RG32 — Score pondéré (domaine ou global) = somme des notes obtenues
     * / somme des coefficients de pondération, sur les seuls critères fournis
     * (RG35 : à l'appelant de ne transmettre que les critères actifs/applicables
     * de l'audit — numérateur et dénominateur restent ainsi cohérents entre eux).
     *
     * Retourne 0 si la liste est vide (aucun critère actif : score neutre,
     * plutôt qu'une division par zéro).
     */
    public static BigDecimal scorePondere(List<CritereEvalue> criteresActifs) {
        if (criteresActifs == null || criteresActifs.isEmpty()) {
            return BigDecimal.ZERO;
        }
        BigDecimal sommeNotes = BigDecimal.ZERO;
        BigDecimal sommeCoefficients = BigDecimal.ZERO;
        for (CritereEvalue c : criteresActifs) {
            int niveau = niveauEngagement(c.probabiliteConformite());
            sommeNotes = sommeNotes.add(noteObtenue(niveau, c.coefficientPonderation()));
            sommeCoefficients = sommeCoefficients.add(c.coefficientPonderation());
        }
        if (sommeCoefficients.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return sommeNotes.divide(sommeCoefficients, 4, RoundingMode.HALF_UP);
    }

    /**
     * RG26 / §11.3 — Risque attendu = (1 - probabilité de conformité) x poids
     * de criticité du critère (spécifique au secteur le cas échéant).
     * Ne participe jamais au score (RG33) : sert uniquement à prioriser
     * les non-conformités.
     */
    public static BigDecimal risqueAttendu(BigDecimal probabiliteConformite, BigDecimal poidsCriticite) {
        requireProbabilite(probabiliteConformite);
        if (poidsCriticite == null || poidsCriticite.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Le poids de criticité doit être positif ou nul");
        }
        return BigDecimal.ONE.subtract(probabiliteConformite)
                .multiply(poidsCriticite)
                .setScale(4, RoundingMode.HALF_UP);
    }

    /**
     * §11.3 — Niveau de priorité d'une non-conformité, dérivé du risque attendu continu.
     *
     * ATTENTION : seuils provisoires. Le CDC (§13, "point ouvert complémentaire")
     * indique explicitement que ce calibrage doit se faire de façon itérative avec
     * les experts métier Smartex, sur le même mode que l'ajustement des niveaux de
     * criticité des 87 critères. Ne pas considérer ces bornes comme définitives.
     */
    public static NiveauPriorite prioriteNonConformite(BigDecimal risqueAttendu) {
        if (risqueAttendu.compareTo(new BigDecimal("3.0")) >= 0) return NiveauPriorite.CRITIQUE;
        if (risqueAttendu.compareTo(new BigDecimal("2.0")) >= 0) return NiveauPriorite.MAJEURE;
        if (risqueAttendu.compareTo(new BigDecimal("1.0")) >= 0) return NiveauPriorite.MODEREE;
        return NiveauPriorite.MINEURE;
    }

    private static void requireProbabilite(BigDecimal p) {
        if (p == null || p.compareTo(BigDecimal.ZERO) < 0 || p.compareTo(BigDecimal.ONE) > 0) {
            throw new IllegalArgumentException("La probabilité de conformité doit être comprise entre 0 et 1");
        }
    }

    private static void requireCoefficient(BigDecimal c) {
        if (c == null || c.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Le coefficient de pondération doit être strictement positif");
        }
    }

    /** Couple (probabilité de conformité, coefficient de pondération) pour un critère évalué. */
    public record CritereEvalue(BigDecimal probabiliteConformite, BigDecimal coefficientPonderation) {
    }

    public enum NiveauPriorite { MINEURE, MODEREE, MAJEURE, CRITIQUE }
}
