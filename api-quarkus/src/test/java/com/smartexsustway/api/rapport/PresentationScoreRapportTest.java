package com.smartexsustway.api.rapport;

import com.smartexsustway.api.domain.rules.ScoringEngine;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.awt.Color;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * V74-C3 — un score imprimé dans un rapport est coloré d'après le nombre
 * imprimé.
 *
 * <p>Ce que ces tests protègent : {@code couleurNiveau} comparait la valeur
 * brute à quatre décimales, {@code formaterScore} imprimait deux décimales.
 * Un score de 3,9950 s'imprimait « 4.00 » en bleu, et le même nombre sortait
 * vert dans l'indice, déjà arrondi à deux décimales par
 * IndicePreparationService.
 *
 * <p>Les deux méthodes sont privées : elles sont éprouvées telles quelles,
 * par réflexion, plutôt que d'élargir leur visibilité pour le test. La
 * couleur effectivement écrite dans un PDF généré est éprouvée par
 * CouleurScoreRapportPdfTest.
 */
class PresentationScoreRapportTest {

    private static final Method COULEUR_NIVEAU = methode("couleurNiveau");
    private static final Method FORMATER_SCORE = methode("formaterScore");

    private static Method methode(String nom) {
        try {
            Method m = RapportGenerationService.class.getDeclaredMethod(nom, BigDecimal.class);
            m.setAccessible(true);
            return m;
        } catch (NoSuchMethodException e) {
            throw new IllegalStateException(e);
        }
    }

    private static Color constante(String nom) throws Exception {
        Field champ = RapportGenerationService.class.getDeclaredField(nom);
        champ.setAccessible(true);
        return (Color) champ.get(null);
    }

    private static Color couleur(String score) throws Exception {
        return (Color) COULEUR_NIVEAU.invoke(null, new BigDecimal(score));
    }

    private static String affiche(String score) throws Exception {
        return (String) FORMATER_SCORE.invoke(null, new BigDecimal(score));
    }

    /**
     * Chaque score reçoit la couleur du nombre qu'il imprime. Les lignes
     * marquées « ancien » changent de couleur avec V74-C3 ; les autres
     * bornent le changement.
     */
    @ParameterizedTest(name = "{0} s''imprime {1} et reçoit la couleur {2}")
    @CsvSource({
            "3.9950, 4.00, BRAND",   // ancien : BLEU
            "3.9949, 3.99, BLEU",
            "4.0000, 4.00, BRAND",
            "2.9950, 3.00, BLEU",    // ancien : AMBRE
            "2.9949, 2.99, AMBRE",
            "1.9950, 2.00, AMBRE",   // ancien : ROUGE
            "1.9949, 1.99, ROUGE",
            "2.4955, 2.50, AMBRE",
            "3.0050, 3.01, BLEU",
            "1.0050, 1.01, ROUGE",
            "4.7550, 4.76, BRAND",
            "0, 0.00, ROUGE",
    })
    void unScore_estColoreDApresLeNombreImprime(String score, String imprime, String couleurAttendue) throws Exception {
        assertEquals(imprime, affiche(score), "chiffre imprimé");
        assertEquals(constante(couleurAttendue), couleur(score), "couleur de " + score);
        assertEquals(couleur(imprime), couleur(score), "même couleur que le nombre imprimé");
    }

    /**
     * 2,4955 s'imprime « 2.50 ». Le seuil 2,5 de la pastille n'existe qu'à
     * l'écran (VoletPlanAction) ; côté rapport, la cohérence attendue est que
     * 2,4955 soit traité exactement comme 2,50.
     */
    @Test
    void deuxVirguleQuatreNeufCinqCinq_estTraiteCommeDeuxVirguleCinquante() throws Exception {
        assertEquals("2.50", affiche("2.4955"));
        assertEquals(couleur("2.50"), couleur("2.4955"));
        assertEquals(constante("AMBRE"), couleur("2.4955"));
    }

    /**
     * Même calcul, deux restitutions : le score global garde les quatre
     * décimales du moteur, l'indice les arrondit à deux avant de les stocker
     * (IndicePreparationService, inchangé). Tous deux s'impriment « 4.00 » et
     * doivent recevoir la même couleur.
     *
     * <p>Le décor est un vrai calcul ScoringEngine : un critère de niveau 3 au
     * coefficient 1,1, un de niveau 5 au coefficient 1,0 et six de niveau 4 au
     * coefficient 3,0 — 80,3 / 20,1 = 3,9950.
     */
    @Test
    void scoreGlobalEtIndice_deMemeValeurAffichee_ontLaMemeCouleur() throws Exception {
        List<ScoringEngine.CritereEvalue> criteres = new ArrayList<>();
        criteres.add(new ScoringEngine.CritereEvalue(new BigDecimal("0.6000"), new BigDecimal("1.1")));
        criteres.add(new ScoringEngine.CritereEvalue(new BigDecimal("0.9500"), new BigDecimal("1.0")));
        for (int i = 0; i < 6; i++) {
            criteres.add(new ScoringEngine.CritereEvalue(new BigDecimal("0.8000"), new BigDecimal("3.0")));
        }
        BigDecimal scoreGlobal = ScoringEngine.scorePondere(criteres);
        BigDecimal indice = ScoringEngine.scorePondere(criteres).setScale(2, RoundingMode.HALF_UP);
        assertEquals(new BigDecimal("3.9950"), scoreGlobal, "valeur du moteur");
        assertEquals(new BigDecimal("4.00"), indice, "valeur stockée de l'indice");

        String imprimeScore = (String) FORMATER_SCORE.invoke(null, scoreGlobal);
        String imprimeIndice = (String) FORMATER_SCORE.invoke(null, indice);
        assertEquals("4.00", imprimeScore);
        assertEquals(imprimeScore, imprimeIndice);
        assertEquals(COULEUR_NIVEAU.invoke(null, indice), COULEUR_NIVEAU.invoke(null, scoreGlobal),
                "même nombre imprimé, même couleur");
        assertEquals(constante("BRAND"), COULEUR_NIVEAU.invoke(null, scoreGlobal));
    }
}
