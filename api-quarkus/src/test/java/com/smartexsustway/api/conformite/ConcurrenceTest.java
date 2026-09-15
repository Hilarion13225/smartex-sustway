package com.smartexsustway.api.conformite;

import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.enums.SourceEvaluation;
import com.smartexsustway.api.domain.enums.StatutEvaluation;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.EvaluationRepository;
import com.smartexsustway.api.domain.repository.NonConformeRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.mission.ValidationEvaluationService;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Ce qui se passe quand deux requêtes arrivent en même temps.
 *
 * <p>Deux invariants de cette phase ne tiennent qu'à condition de résister
 * à la concurrence, et aucun code applicatif ne peut les garantir seul : une
 * vérification suivie d'une écriture laisse toujours une fenêtre entre les
 * deux. Ce sont la base et la transaction qui ferment cette fenêtre, et ces
 * tests le vérifient plutôt que de le supposer.
 *
 * <p>Les threads sont synchronisés sur une {@link CountDownLatch} pour
 * qu'ils atteignent le point critique ensemble : sans cela, ils
 * s'exécuteraient l'un après l'autre et le test passerait sans rien
 * éprouver.
 */
@QuarkusTest
class ConcurrenceTest {

    @Inject NonConformiteService nonConformiteService;
    @Inject ValidationEvaluationService validationEvaluationService;
    @Inject NonConformeRepository nonConformeRepository;
    @Inject EvaluationRepository evaluationRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntityManager entityManager;

    /** Une mission minimale portant un critère de criticité résolue. */
    @Transactional
    UUID critereDeTest() {
        UUID entrepriseId = (UUID) entityManager.createNativeQuery(
                        "INSERT INTO entreprise (raison_sociale, identifiant_legal, statut) "
                                + "VALUES (?1, ?2, 'ACTIF') RETURNING id")
                .setParameter(1, "Entreprise Concurrence")
                .setParameter(2, "RCCM-CONC-" + UUID.randomUUID())
                .getSingleResult();

        Object[] version = (Object[]) entityManager.createNativeQuery(
                        "SELECT rv.id, rv.referentiel_id FROM referentiel_version rv "
                                + "WHERE rv.statut = 'PUBLIEE' ORDER BY rv.publiee_le DESC LIMIT 1")
                .getSingleResult();

        UUID auditId = (UUID) entityManager.createNativeQuery(
                        "INSERT INTO audit (entreprise_id, referentiel_id, referentiel_version_id, nom, "
                                + "date_debut, statut) VALUES (?1, ?2, ?3, ?4, ?5, 'EN_COURS') RETURNING id")
                .setParameter(1, entrepriseId).setParameter(2, version[1]).setParameter(3, version[0])
                .setParameter(4, "Mission concurrence").setParameter(5, LocalDate.now())
                .getSingleResult();

        Object[] critere = (Object[]) entityManager.createNativeQuery(
                        "SELECT c.id, c.coefficient_ponderation FROM critere c "
                                + "WHERE c.referentiel_version_id = ?1 AND c.actif = true "
                                + "ORDER BY c.code LIMIT 1")
                .setParameter(1, version[0]).getSingleResult();

        UUID criticiteId = (UUID) entityManager.createNativeQuery(
                        "SELECT id FROM criticite ORDER BY poids DESC LIMIT 1").getSingleResult();

        return (UUID) entityManager.createNativeQuery(
                        "INSERT INTO audit_critere (audit_id, critere_id, actif, applicable, "
                                + "coefficient_ponderation, criticite_id, statut) "
                                + "VALUES (?1, ?2, true, true, ?3, ?4, 'A_EVALUER') RETURNING id")
                .setParameter(1, auditId).setParameter(2, critere[0])
                .setParameter(3, critere[1]).setParameter(4, criticiteId)
                .getSingleResult();
    }

    /**
     * Pose une évaluation V2 dans l'état voulu.
     *
     * <p>Une évaluation V2 déjà {@code VALIDEE} reçoit son validateur : la
     * base l'exige, et à raison — une validation dont personne ne répond
     * n'en est pas une. Ce détail a été découvert en écrivant ce test, la
     * contrainte ayant refusé le premier fixture.
     */
    @Transactional
    UUID poserEvaluation(UUID auditCritereId, StatutEvaluation statut, int note) {
        AuditCritere auditCritere = auditCritereRepository.findById(auditCritereId);
        BigDecimal probabilite = BigDecimal.valueOf(note)
                .divide(BigDecimal.valueOf(5), 4, RoundingMode.HALF_UP);
        Evaluation evaluation = new Evaluation(auditCritere, probabilite, (short) note);
        evaluation.setSource(SourceEvaluation.IA);
        evaluation.setContratVersion("2.0");
        evaluation.setJustification("Évaluation posée pour éprouver la concurrence.");
        if (statut == StatutEvaluation.VALIDEE) {
            evaluation.validerPar(utilisateurRepository.findById(unUtilisateurId()));
        } else {
            evaluation.setStatut(statut);
        }
        evaluationRepository.persistAndFlush(evaluation);
        return evaluation.getId();
    }

    /** Sans transaction propre : appelée depuis une méthode qui en a une. */
    UUID unUtilisateurId() {
        return (UUID) entityManager.createNativeQuery(
                        "SELECT id FROM utilisateur WHERE statut = 'ACTIF' LIMIT 1")
                .getSingleResult();
    }

    @Transactional
    UUID unUtilisateur() {
        return unUtilisateurId();
    }

    /**
     * Lance deux tâches simultanément et rend leurs issues.
     *
     * <p>Chacune ouvre sa propre transaction : c'est la condition pour que
     * la seconde voie l'état que la première a laissé, et non le sien.
     */
    private List<Boolean> enParallele(Runnable tache) throws Exception {
        CountDownLatch depart = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Callable<Boolean> essai = () -> {
                depart.await();
                try {
                    QuarkusTransaction.requiringNew().run(tache);
                    return true;
                } catch (Exception e) {
                    return false;
                }
            };
            Future<Boolean> a = pool.submit(essai);
            Future<Boolean> b = pool.submit(essai);
            depart.countDown();
            return List.of(a.get(30, TimeUnit.SECONDS), b.get(30, TimeUnit.SECONDS));
        } finally {
            pool.shutdownNow();
        }
    }

    @Transactional
    long compterCourantes(UUID auditCritereId) {
        return nonConformeRepository.count("auditCritere.id = ?1 and courante = true", auditCritereId);
    }

    @Transactional
    long compterToutes(UUID auditCritereId) {
        return nonConformeRepository.count("auditCritere.id = ?1", auditCritereId);
    }

    @Transactional
    StatutEvaluation statutDe(UUID evaluationId) {
        return evaluationRepository.findById(evaluationId).getStatut();
    }

    // === Non-conformité =====================================================

    @Test
    void deuxReanalysesSimultaneesNeCreentQuUneSeuleNonConformiteCourante() throws Exception {
        UUID critereId = critereDeTest();
        UUID evaluationA = poserEvaluation(critereId, StatutEvaluation.VALIDEE, 2);
        UUID evaluationB = poserEvaluation(critereId, StatutEvaluation.VALIDEE, 2);

        // Les deux tâches lisent « aucune non-conformité courante » puis
        // décident d'en créer une. Sans l'index unique partiel, les deux
        // écritures passeraient et le critère porterait deux écarts courants.
        List<Boolean> issues = enParallele(() -> {
            Evaluation e = evaluationRepository.findById(
                    Thread.currentThread().getId() % 2 == 0 ? evaluationA : evaluationB);
            nonConformiteService.genererSiNecessaire(e);
        });

        assertEquals(1, compterCourantes(critereId),
                "un critère ne peut porter qu'une non-conformité courante");
        assertTrue(issues.contains(Boolean.TRUE), "au moins une des deux tentatives doit aboutir");
    }

    @Test
    void uneReanalyseSequentielleNAjouteAucuneLigne() {
        UUID critereId = critereDeTest();
        UUID premiere = poserEvaluation(critereId, StatutEvaluation.VALIDEE, 2);
        UUID seconde = poserEvaluation(critereId, StatutEvaluation.VALIDEE, 2);

        genererPour(premiere);
        genererPour(seconde);

        assertEquals(1, compterToutes(critereId));
        assertEquals(1, compterCourantes(critereId));
    }

    @Transactional
    void genererPour(UUID evaluationId) {
        nonConformiteService.genererSiNecessaire(evaluationRepository.findById(evaluationId));
    }

    // === Validation =========================================================

    @Test
    void deuxValidationsSimultaneesNeProduisentQuUneTransition() throws Exception {
        UUID critereId = critereDeTest();
        UUID evaluationId = poserEvaluation(critereId, StatutEvaluation.EN_REVUE, 2);
        UUID validateurId = unUtilisateur();

        List<Boolean> issues = enParallele(() -> {
            Evaluation evaluation = evaluationRepository.findById(evaluationId);
            Utilisateur validateur = utilisateurRepository.findById(validateurId);
            var resultat = validationEvaluationService.valider(evaluation, validateur);
            if (resultat instanceof ValidationEvaluationService.Resultat.EtatIncompatible) {
                // Refus explicite : la seconde tentative a vu l'évaluation
                // déjà validée. C'est le comportement voulu, pas une panne.
                throw new IllegalStateException("déjà validée");
            }
        });

        assertEquals(StatutEvaluation.VALIDEE, statutDe(evaluationId));

        // Une seule transition effective. Que la seconde ait été refusée par
        // l'état ou par un conflit d'écriture, elle ne doit pas avoir produit
        // un second écart.
        assertEquals(1, compterCourantes(critereId));
        assertTrue(issues.contains(Boolean.TRUE), "une des deux validations doit aboutir");
    }

    @Test
    void unCritereConformeNeLaissePasDEcartCourantApresConcurrence() throws Exception {
        UUID critereId = critereDeTest();
        UUID enEcart = poserEvaluation(critereId, StatutEvaluation.VALIDEE, 2);
        genererPour(enEcart);
        assertEquals(1, compterCourantes(critereId));

        UUID conforme = poserEvaluation(critereId, StatutEvaluation.VALIDEE, 5);
        genererPour(conforme);

        // L'écart est clôturé, pas supprimé : la ligne reste courante mais
        // son statut métier dit qu'elle est résolue.
        assertEquals(1, compterToutes(critereId), "aucune ligne n'est supprimée");
    }
}
