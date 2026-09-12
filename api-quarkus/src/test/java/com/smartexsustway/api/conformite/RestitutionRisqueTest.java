package com.smartexsustway.api.conformite;

import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.enums.SourceEvaluation;
import com.smartexsustway.api.domain.enums.StatutEvaluation;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.EvaluationRepository;
import com.smartexsustway.api.domain.repository.NonConformeRepository;
import com.smartexsustway.api.domain.rules.ScoringEngine;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Le risque déterministe RG26, calculé à la lecture.
 *
 * <p>Ce que ces tests protègent avant tout : que la valeur restituée soit
 * <strong>exactement</strong> celle du moteur métier, et non une
 * approximation recalculée ailleurs. Une seconde implémentation de la
 * formule, même identique aujourd'hui, divergerait au premier ajustement
 * des seuils — et rien ne signalerait laquelle fait foi.
 *
 * <p>Les valeurs attendues sont donc comparées à
 * {@link ScoringEngine} lui-même, pas à des constantes recopiées.
 */
@QuarkusTest
class RestitutionRisqueTest {

    @Inject RestitutionRisqueService restitutionRisqueService;
    @Inject NonConformiteService nonConformiteService;
    @Inject EvaluationRepository evaluationRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject NonConformeRepository nonConformeRepository;
    @Inject EntityManager entityManager;

    /** Une mission portant un critère de criticité choisie. */
    @Transactional
    UUID critereAvecCriticite(String codeCriticite) {
        UUID entrepriseId = (UUID) entityManager.createNativeQuery(
                        "INSERT INTO entreprise (raison_sociale, identifiant_legal, statut) "
                                + "VALUES (?1, ?2, 'ACTIF') RETURNING id")
                .setParameter(1, "Entreprise Risque " + codeCriticite)
                .setParameter(2, "RCCM-RIS-" + UUID.randomUUID())
                .getSingleResult();

        Object[] version = (Object[]) entityManager.createNativeQuery(
                        "SELECT rv.id, rv.referentiel_id FROM referentiel_version rv "
                                + "WHERE rv.statut = 'PUBLIEE' ORDER BY rv.publiee_le DESC LIMIT 1")
                .getSingleResult();

        UUID auditId = (UUID) entityManager.createNativeQuery(
                        "INSERT INTO audit (entreprise_id, referentiel_id, referentiel_version_id, nom, "
                                + "date_debut, statut) VALUES (?1, ?2, ?3, ?4, ?5, 'EN_COURS') RETURNING id")
                .setParameter(1, entrepriseId).setParameter(2, version[1]).setParameter(3, version[0])
                .setParameter(4, "Mission risque").setParameter(5, LocalDate.now())
                .getSingleResult();

        Object[] critere = (Object[]) entityManager.createNativeQuery(
                        "SELECT c.id, c.coefficient_ponderation FROM critere c "
                                + "WHERE c.referentiel_version_id = ?1 AND c.actif = true "
                                + "ORDER BY c.code LIMIT 1")
                .setParameter(1, version[0]).getSingleResult();

        // `code` est un type énuméré PostgreSQL : la comparaison directe
        // avec un paramètre varchar est refusée par la base.
        UUID criticiteId = (UUID) entityManager.createNativeQuery(
                        "SELECT id FROM criticite WHERE code::text = ?1")
                .setParameter(1, codeCriticite).getSingleResult();

        return (UUID) entityManager.createNativeQuery(
                        "INSERT INTO audit_critere (audit_id, critere_id, actif, applicable, "
                                + "coefficient_ponderation, criticite_id, statut) "
                                + "VALUES (?1, ?2, true, true, ?3, ?4, 'A_EVALUER') RETURNING id")
                .setParameter(1, auditId).setParameter(2, critere[0])
                .setParameter(3, critere[1]).setParameter(4, criticiteId)
                .getSingleResult();
    }

    /** Un critère sans criticité résolue (RG37). */
    @Transactional
    UUID critereSansCriticite() {
        UUID avec = critereAvecCriticite("MOYENNE");
        entityManager.createNativeQuery("UPDATE audit_critere SET criticite_id = NULL WHERE id = ?1")
                .setParameter(1, avec).executeUpdate();
        return avec;
    }

    @Transactional
    UUID poserEvaluation(UUID auditCritereId, String probabilite, boolean avecSignalIa,
                         String confianceRisque) {
        AuditCritere auditCritere = auditCritereRepository.findById(auditCritereId);
        BigDecimal p = new BigDecimal(probabilite).setScale(4, RoundingMode.HALF_UP);
        int note = ScoringEngine.niveauEngagement(p);

        Evaluation evaluation = new Evaluation(auditCritere, p, (short) note);
        evaluation.setSource(SourceEvaluation.IA);
        evaluation.setStatut(StatutEvaluation.EN_REVUE);
        evaluation.setContratVersion("2.0");
        evaluation.setJustification("Évaluation posée pour éprouver la restitution du risque.");
        if (avecSignalIa) {
            evaluation.setSignalRisque(true);
            evaluation.setCategorieRisque("INFORMATION_MANQUANTE");
            evaluation.setJustificationRisque("Ni date ni validation par la direction.");
            if (confianceRisque != null) {
                evaluation.setConfianceRisque(new BigDecimal(confianceRisque));
            }
        }
        evaluationRepository.persistAndFlush(evaluation);
        return evaluation.getId();
    }

    @Transactional
    RestitutionRisqueService.RisqueMetier calculer(UUID evaluationId) {
        return restitutionRisqueService.calculer(evaluationRepository.findById(evaluationId));
    }

    @Transactional
    BigDecimal poidsDe(UUID auditCritereId) {
        return auditCritereRepository.findById(auditCritereId).getCriticite().getPoids();
    }

    // === Le calcul, comparé au moteur ======================================

    @Test
    void leRisqueDUnCritereNonConformeEstCeluiDuMoteur() {
        UUID critereId = critereAvecCriticite("ELEVEE");
        UUID evaluationId = poserEvaluation(critereId, "0.5000", false, null);

        var risque = calculer(evaluationId);

        // La valeur attendue vient du moteur, pas d'une constante recopiée :
        // si les seuils changent, ce test suit sans être réécrit.
        BigDecimal attendu = ScoringEngine.risqueAttendu(
                new BigDecimal("0.5000"), poidsDe(critereId));
        assertEquals(0, attendu.compareTo(risque.risqueAttendu()));
        assertEquals(ScoringEngine.prioriteNonConformite(attendu).name(), risque.niveau());
    }

    @Test
    void laValeurExacteEstRestituee() {
        // (1 − 0,50) × 3,00 = 1,50 → MODEREE (seuil 1,0)
        UUID critereId = critereAvecCriticite("ELEVEE");
        UUID evaluationId = poserEvaluation(critereId, "0.5000", false, null);

        var risque = calculer(evaluationId);

        assertEquals(0, new BigDecimal("1.5000").compareTo(risque.risqueAttendu()));
        assertEquals("MODEREE", risque.niveau());
        assertEquals(0, new BigDecimal("3.00").compareTo(risque.criticitePoids()));
        assertEquals("ELEVEE", risque.criticiteCode());
    }

    @Test
    void leCalculEstMontreEnToutesLettres() {
        // Ce qui distingue un résultat déterministe d'un avis : il montre
        // d'où il vient.
        UUID critereId = critereAvecCriticite("ELEVEE");
        UUID evaluationId = poserEvaluation(critereId, "0.5000", false, null);

        assertEquals("(1 − 0.5) × 3 = 1.5", calculer(evaluationId).explication());
    }

    @Test
    void laSourceEstIdentifieeCommeRG26() {
        UUID critereId = critereAvecCriticite("MOYENNE");
        UUID evaluationId = poserEvaluation(critereId, "0.4000", false, null);

        assertEquals("RG26", calculer(evaluationId).source());
    }

    // === Le critère conforme — le trou structurel ==========================

    @Test
    void unCritereConformeARisqueCalculeEtNiveauDuMoteur() {
        // Le cas que NonConformiteService n'atteint jamais : il sort avant
        // le calcul dès que la note vaut 5.
        UUID critereId = critereAvecCriticite("CRITIQUE");
        UUID evaluationId = poserEvaluation(critereId, "0.9500", false, null);

        var risque = calculer(evaluationId);

        // (1 − 0,95) × 4,00 = 0,20 → MINEURE, résultat officiel du moteur
        // et non un niveau inventé pour l'occasion.
        BigDecimal attendu = ScoringEngine.risqueAttendu(
                new BigDecimal("0.9500"), poidsDe(critereId));
        assertEquals(0, attendu.compareTo(risque.risqueAttendu()));
        assertEquals(ScoringEngine.prioriteNonConformite(attendu).name(), risque.niveau());
        assertEquals("MINEURE", risque.niveau());
    }

    @Test
    void unCritereConformeNeCreeAucuneNonConformite() {
        // Le risque est restitué sans qu'aucune non-conformité artificielle
        // n'ait été fabriquée pour rendre le calcul possible.
        UUID critereId = critereAvecCriticite("CRITIQUE");
        UUID evaluationId = poserEvaluation(critereId, "0.9500", false, null);

        calculer(evaluationId);

        assertEquals(0, compterNc(critereId), "aucune non-conformité ne doit apparaître");
        var risque = calculer(evaluationId);
        assertFalse(risque.fige(), "aucune valeur figée en l'absence de non-conformité");
        assertNull(risque.risqueFigeNonConformite());
    }

    @Transactional
    long compterNc(UUID auditCritereId) {
        return nonConformeRepository.count("auditCritere.id = ?1", auditCritereId);
    }

    @Test
    void sansCriticiteLeRisqueEstDeclareIndeterminable() {
        // RG37 : on ne substitue pas un zéro, qui se lirait « aucun
        // risque » — une autre affirmation que « risque non calculable ».
        UUID critereId = critereSansCriticite();
        UUID evaluationId = poserEvaluation(critereId, "0.4000", false, null);

        var risque = calculer(evaluationId);

        assertNull(risque.risqueAttendu());
        assertNull(risque.niveau());
        assertNull(risque.criticitePoids());
        // Le motif est dit, pas seulement l'absence de valeur : « pas
        // calculable » et « aucun risque » ne se lisent pas de la même façon.
        assertTrue(risque.explication().contains("pas calculable"),
                "l'explication doit dire pourquoi le risque est absent : " + risque.explication());
    }

    // === Valeur figée par la non-conformité ================================

    @Test
    void laValeurFigeeApparaitUneFoisLaNonConformiteCreee() {
        UUID critereId = critereAvecCriticite("ELEVEE");
        UUID evaluationId = poserEvaluation(critereId, "0.5000", false, null);

        assertFalse(calculer(evaluationId).fige(), "rien n'est figé avant la validation");

        genererNc(evaluationId);

        var risque = calculer(evaluationId);
        assertTrue(risque.fige());
        assertNotNull(risque.risqueFigeNonConformite());
        assertEquals("MODEREE", risque.niveauFigeNonConformite());
        // Le recalcul et la valeur figée coïncident tant que la
        // probabilité n'a pas changé.
        assertEquals(0, risque.risqueAttendu().compareTo(risque.risqueFigeNonConformite()));
    }

    @Transactional
    void genererNc(UUID evaluationId) {
        nonConformiteService.genererSiNecessaire(evaluationRepository.findById(evaluationId));
    }

    // === Le signal IA reste distinct =======================================

    @Test
    void leRisqueMetierNeContientAucuneDonneeDeLIa() {
        UUID critereId = critereAvecCriticite("MOYENNE");
        UUID evaluationId = poserEvaluation(critereId, "0.3000", true, "0.9000");

        var risque = calculer(evaluationId);

        // Le bloc déterministe ne porte ni catégorie, ni justification, ni
        // confiance : ce sont trois champs de l'autre bloc.
        assertEquals("RG26", risque.source());
        assertNotNull(risque.risqueAttendu());
        assertNotNull(risque.explication());
    }

    @Test
    void leNiveauRG26NeDependQueDuCalculJamaisDeLaCategorieIa() {
        // Deux classifications qui n'ont ni le même vocabulaire ni la même
        // autorité. Les faire correspondre donnerait à une opinion le poids
        // d'un calcul.
        //
        // Ce cas est instructif : un signal IA très affirmatif (confiance
        // 0,90, catégorie INFORMATION_MANQUANTE) sur un critère de
        // criticité FAIBLE et de probabilité très basse. L'intuition dirait
        // « risque élevé » ; le moteur dit MINEURE, parce qu'un poids de
        // 1,00 plafonne le risque attendu à 1,00 — strictement sous le
        // seuil MODEREE. C'est le moteur qui tranche, pas le signal.
        UUID critereId = critereAvecCriticite("FAIBLE");
        UUID evaluationId = poserEvaluation(critereId, "0.1000", true, "0.9000");

        var risque = calculer(evaluationId);

        BigDecimal attendu = ScoringEngine.risqueAttendu(
                new BigDecimal("0.1000"), poidsDe(critereId));
        assertEquals(0, new BigDecimal("0.9000").compareTo(attendu));
        assertEquals(ScoringEngine.prioriteNonConformite(attendu).name(), risque.niveau());
        assertEquals("MINEURE", risque.niveau());
    }

    // === Lecture seule =====================================================

    @Test
    void leCalculNecritRien() {
        UUID critereId = critereAvecCriticite("ELEVEE");
        UUID evaluationId = poserEvaluation(critereId, "0.5000", true, "0.8000");

        long ncAvant = compterNc(critereId);
        long evalAvant = compterEvaluations(critereId);
        String empreinteAvant = empreinteEvaluation(evaluationId);

        calculer(evaluationId);
        calculer(evaluationId);
        calculer(evaluationId);

        assertEquals(ncAvant, compterNc(critereId));
        assertEquals(evalAvant, compterEvaluations(critereId));
        assertEquals(empreinteAvant, empreinteEvaluation(evaluationId),
                "consulter un risque ne doit rien modifier");
    }

    @Transactional
    long compterEvaluations(UUID auditCritereId) {
        return evaluationRepository.count("auditCritere.id = ?1", auditCritereId);
    }

    @Transactional
    String empreinteEvaluation(UUID evaluationId) {
        Evaluation e = evaluationRepository.findById(evaluationId);
        return e.getStatut() + "|" + e.getProbabiliteConforme() + "|" + e.getNote()
                + "|" + e.getSignalRisque() + "|" + e.getCategorieRisque();
    }

    // === La bonne évaluation ===============================================

    @Test
    void leRisqueSuitLEvaluationConsulteeEtNonLaDerniere() {
        // Une ré-analyse produit une autre probabilité, donc un autre
        // risque. Afficher celui de la dernière évaluation en marge d'une
        // évaluation antérieure donnerait un chiffre qui ne correspond à
        // rien de ce qui est à l'écran.
        UUID critereId = critereAvecCriticite("ELEVEE");
        UUID ancienne = poserEvaluation(critereId, "0.2000", false, null);
        UUID recente = poserEvaluation(critereId, "0.8000", false, null);

        var risqueAncienne = calculer(ancienne);
        var risqueRecente = calculer(recente);

        // (1 − 0,20) × 3 = 2,40   ≠   (1 − 0,80) × 3 = 0,60
        assertEquals(0, new BigDecimal("2.4000").compareTo(risqueAncienne.risqueAttendu()));
        assertEquals(0, new BigDecimal("0.6000").compareTo(risqueRecente.risqueAttendu()));
        assertEquals("MAJEURE", risqueAncienne.niveau());
        assertEquals("MINEURE", risqueRecente.niveau());
    }
}
