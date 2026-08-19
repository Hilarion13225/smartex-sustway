package com.smartexsustway.api.domain.rules;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ScoringEngineTest {

    // --- RG27 / §11.1 : grille probabilité -> niveau d'engagement --------------

    @ParameterizedTest(name = "probabilité {0} -> niveau {1}")
    @CsvSource({
            "1.00, 5",
            "0.90, 5",
            "0.89, 4",
            "0.75, 4",
            "0.74, 3",
            "0.50, 3",
            "0.49, 2",
            "0.25, 2",
            "0.24, 1",
            "0.00, 1",
    })
    void niveauEngagement_respecteLaGrilleDuCdc(String probabilite, int niveauAttendu) {
        assertEquals(niveauAttendu, ScoringEngine.niveauEngagement(new BigDecimal(probabilite)));
    }

    @Test
    void niveauEngagement_rejetteProbabiliteHorsBornes() {
        assertThrows(IllegalArgumentException.class,
                () -> ScoringEngine.niveauEngagement(new BigDecimal("1.01")));
        assertThrows(IllegalArgumentException.class,
                () -> ScoringEngine.niveauEngagement(new BigDecimal("-0.01")));
    }

    // --- RG31 / §11.2 : note obtenue = niveau x coefficient ---------------------

    @Test
    void noteObtenue_multiplieNiveauParCoefficient() {
        assertEquals(new BigDecimal("6.0"), ScoringEngine.noteObtenue(3, new BigDecimal("2.0")));
        assertEquals(new BigDecimal("5.0"), ScoringEngine.noteObtenue(5, new BigDecimal("1.0")));
    }

    @Test
    void noteObtenue_rejetteNiveauHorsBornes() {
        assertThrows(IllegalArgumentException.class,
                () -> ScoringEngine.noteObtenue(0, BigDecimal.ONE));
        assertThrows(IllegalArgumentException.class,
                () -> ScoringEngine.noteObtenue(6, BigDecimal.ONE));
    }

    @Test
    void noteObtenue_rejetteCoefficientNulOuNegatif() {
        assertThrows(IllegalArgumentException.class,
                () -> ScoringEngine.noteObtenue(3, BigDecimal.ZERO));
        assertThrows(IllegalArgumentException.class,
                () -> ScoringEngine.noteObtenue(3, new BigDecimal("-1")));
    }

    // --- RG32 : score pondéré (domaine / global) --------------------------------

    @Test
    void scorePondere_calculeLaMoyennePondereeSelonRG32() {
        // Critère A : probabilité 0.90 -> niveau 5, coefficient 2  => note 10
        // Critère B : probabilité 0.60 -> niveau 3, coefficient 1  => note 3
        // Score = (10 + 3) / (2 + 1) = 13 / 3 = 4.3333
        var criteres = List.of(
                new ScoringEngine.CritereEvalue(new BigDecimal("0.90"), new BigDecimal("2")),
                new ScoringEngine.CritereEvalue(new BigDecimal("0.60"), new BigDecimal("1"))
        );
        assertEquals(new BigDecimal("4.3333"), ScoringEngine.scorePondere(criteres));
    }

    @Test
    void scorePondere_retourneZeroSiAucunCritereActif() {
        assertEquals(BigDecimal.ZERO, ScoringEngine.scorePondere(List.of()));
        assertEquals(BigDecimal.ZERO, ScoringEngine.scorePondere(null));
    }

    @Test
    void scorePondere_neFausseJamaisLeResultatParUnTotalFige_RG35() {
        // Un audit avec 3 critères dont un désactivé : le critère désactivé
        // ne doit apparaître ni au numérateur ni au dénominateur (RG35).
        // Ici on simule cela simplement en ne le transmettant pas à la méthode.
        var avecTroisCriteres = List.of(
                new ScoringEngine.CritereEvalue(new BigDecimal("1.00"), new BigDecimal("1")),
                new ScoringEngine.CritereEvalue(new BigDecimal("1.00"), new BigDecimal("1")),
                new ScoringEngine.CritereEvalue(new BigDecimal("0.00"), new BigDecimal("1"))
        );
        var sansLeCritereDesactive = List.of(
                new ScoringEngine.CritereEvalue(new BigDecimal("1.00"), new BigDecimal("1")),
                new ScoringEngine.CritereEvalue(new BigDecimal("1.00"), new BigDecimal("1"))
        );
        assertEquals(new BigDecimal("5.0000"), ScoringEngine.scorePondere(sansLeCritereDesactive));
        assertNotEquals(
                ScoringEngine.scorePondere(sansLeCritereDesactive),
                ScoringEngine.scorePondere(avecTroisCriteres)
        );
    }

    // --- RG26 / §11.3 : risque attendu ------------------------------------------

    @Test
    void risqueAttendu_calculeSelonRG26() {
        // (1 - 0.30) x poids 4 (criticité CRITIQUE) = 0.70 x 4 = 2.8000
        assertEquals(new BigDecimal("2.8000"),
                ScoringEngine.risqueAttendu(new BigDecimal("0.30"), new BigDecimal("4")));
        // Conformité totale -> risque nul quel que soit le poids de criticité
        assertEquals(new BigDecimal("0.0000"),
                ScoringEngine.risqueAttendu(BigDecimal.ONE, new BigDecimal("4")));
    }

    @Test
    void risqueAttendu_rejettePoidsCriticiteNegatif() {
        assertThrows(IllegalArgumentException.class,
                () -> ScoringEngine.risqueAttendu(new BigDecimal("0.5"), new BigDecimal("-1")));
    }

    // --- §11.3 : priorité de non-conformité dérivée du risque -------------------

    @ParameterizedTest(name = "risque {0} -> priorité {1}")
    @CsvSource({
            "3.5, CRITIQUE",
            "3.0, CRITIQUE",
            "2.5, MAJEURE",
            "2.0, MAJEURE",
            "1.5, MODEREE",
            "1.0, MODEREE",
            "0.5, MINEURE",
            "0.0, MINEURE",
    })
    void prioriteNonConformite_deriveDuRisqueAttendu(String risque, String prioriteAttendue) {
        assertEquals(
                ScoringEngine.NiveauPriorite.valueOf(prioriteAttendue),
                ScoringEngine.prioriteNonConformite(new BigDecimal(risque))
        );
    }
}
