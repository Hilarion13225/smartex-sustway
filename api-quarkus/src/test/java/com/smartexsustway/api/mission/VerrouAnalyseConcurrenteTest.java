package com.smartexsustway.api.mission;

import com.smartexsustway.api.domain.entity.AnalyseIa;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.enums.FormulePipeline;
import com.smartexsustway.api.domain.enums.StatutPipeline;
import com.smartexsustway.api.domain.repository.AnalyseIaRepository;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Le verrou qui empêche deux analyses simultanées sur le même critère.
 *
 * <p>Le risque corrigé : un double clic, ou deux onglets, lançaient deux
 * passes complètes. Chacune appelait Gemini quatre fois, consommait du
 * quota, et écrivait sa propre évaluation. Rien dans le schéma ne s'y
 * opposait — les deux passes étaient légitimes.
 *
 * <p>Ce que ces tests éprouvent n'est pas qu'un contrôle existe, mais qu'il
 * <strong>résiste à la concurrence réelle</strong>. Un contrôle qui lit
 * puis écrit sans verrou passerait tous les tests séquentiels et échouerait
 * en production : les deux lectures verraient « libre » avant que l'une des
 * deux n'écrive.
 *
 * <p>Les threads sont relâchés ensemble par une {@link CountDownLatch} ;
 * sans cela ils s'exécuteraient l'un après l'autre et ne prouveraient rien.
 */
@QuarkusTest
class VerrouAnalyseConcurrenteTest {

    @Inject AnalyseIaRepository analyseIaRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject AuditRepository auditRepository;
    @Inject EntityManager entityManager;

    /** Une mission et deux critères, dans une entreprise neuve. */
    private record Terrain(UUID auditId, UUID critereA, UUID critereB) {
    }

    @Transactional
    Terrain terrain(String raisonSociale) {
        UUID entrepriseId = (UUID) entityManager.createNativeQuery(
                        "INSERT INTO entreprise (raison_sociale, identifiant_legal, statut) "
                                + "VALUES (?1, ?2, 'ACTIF') RETURNING id")
                .setParameter(1, raisonSociale)
                .setParameter(2, "RCCM-VER-" + UUID.randomUUID())
                .getSingleResult();
        return terrainSurEntreprise(entrepriseId);
    }

    Terrain terrainSurEntreprise(UUID entrepriseId) {
        // La version est choisie sur le nombre de critères qu'elle porte, et
        // non sur sa date de publication : les tests de cette base créent des
        // référentiels d'un seul critère, et le plus récent serait souvent
        // l'un d'eux. Il en faut deux pour éprouver la granularité du verrou.
        Object[] version = (Object[]) entityManager.createNativeQuery(
                        "SELECT rv.id, rv.referentiel_id FROM referentiel_version rv "
                                + "JOIN critere c ON c.referentiel_version_id = rv.id AND c.actif "
                                + "WHERE rv.statut = 'PUBLIEE' "
                                + "GROUP BY rv.id, rv.referentiel_id "
                                + "HAVING count(c.id) >= 2 "
                                + "ORDER BY count(c.id) DESC LIMIT 1")
                .getSingleResult();

        UUID auditId = (UUID) entityManager.createNativeQuery(
                        "INSERT INTO audit (entreprise_id, referentiel_id, referentiel_version_id, nom, "
                                + "date_debut, statut) VALUES (?1, ?2, ?3, ?4, ?5, 'EN_COURS') RETURNING id")
                .setParameter(1, entrepriseId).setParameter(2, version[1]).setParameter(3, version[0])
                .setParameter(4, "Mission verrou").setParameter(5, LocalDate.now())
                .getSingleResult();

        @SuppressWarnings("unchecked")
        List<Object[]> criteres = entityManager.createNativeQuery(
                        "SELECT c.id, c.coefficient_ponderation FROM critere c "
                                + "WHERE c.referentiel_version_id = ?1 AND c.actif = true "
                                + "ORDER BY c.code LIMIT 2")
                .setParameter(1, version[0]).getResultList();

        UUID a = rattacherCritere(auditId, criteres.get(0));
        UUID b = rattacherCritere(auditId, criteres.get(1));
        return new Terrain(auditId, a, b);
    }

    private UUID rattacherCritere(UUID auditId, Object[] critere) {
        return (UUID) entityManager.createNativeQuery(
                        "INSERT INTO audit_critere (audit_id, critere_id, actif, applicable, "
                                + "coefficient_ponderation, statut, scenario) "
                                + "VALUES (?1, ?2, true, true, ?3, 'A_EVALUER', ?4) RETURNING id")
                .setParameter(1, auditId).setParameter(2, critere[0]).setParameter(3, critere[1])
                // Un scénario suffit à rendre le critère analysable : les
                // pièces exigeraient le stockage objet, hors sujet ici.
                .setParameter(4, "Scénario de test pour éprouver le verrou.")
                .getSingleResult();
    }

    /**
     * Reproduit exactement la réservation du service, sans l'appel Gemini.
     *
     * <p>Le test porte sur le verrou, pas sur le pipeline : appeler le
     * fournisseur consommerait du quota et rendrait le test dépendant du
     * réseau, sans rien prouver de plus sur l'atomicité.
     */
    boolean reserver(UUID auditId, UUID auditCritereId) {
        try {
            QuarkusTransaction.requiringNew().run(() -> {
                AuditCritere critere = auditCritereRepository.verrouiller(auditCritereId).orElseThrow();
                if (analyseIaRepository.enCoursSurCritere(auditCritereId).isPresent()) {
                    throw new IllegalStateException("déjà en cours");
                }
                Audit audit = auditRepository.findById(auditId);
                analyseIaRepository.persistAndFlush(
                        new AnalyseIa(audit, critere, FormulePipeline.STANDARD));
            });
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** Lance deux réservations vraiment simultanées et compte les succès. */
    private int[] deuxReservationsSimultanees(UUID auditId, UUID critereA, UUID critereB)
            throws Exception {
        CountDownLatch depart = new CountDownLatch(1);
        AtomicInteger succes = new AtomicInteger();
        AtomicInteger refus = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Callable<Void> essaiA = () -> {
                depart.await();
                if (reserver(auditId, critereA)) succes.incrementAndGet(); else refus.incrementAndGet();
                return null;
            };
            Callable<Void> essaiB = () -> {
                depart.await();
                if (reserver(auditId, critereB)) succes.incrementAndGet(); else refus.incrementAndGet();
                return null;
            };
            Future<Void> a = pool.submit(essaiA);
            Future<Void> b = pool.submit(essaiB);
            depart.countDown();
            a.get(30, TimeUnit.SECONDS);
            b.get(30, TimeUnit.SECONDS);
            return new int[]{succes.get(), refus.get()};
        } finally {
            pool.shutdownNow();
        }
    }

    @Transactional
    long compterPasses(UUID auditCritereId) {
        return analyseIaRepository.count("auditCritere.id = ?1", auditCritereId);
    }

    @Transactional
    long compterEnCours(UUID auditCritereId) {
        return analyseIaRepository.count("auditCritere.id = ?1 and statut = ?2",
                auditCritereId, StatutPipeline.EN_COURS);
    }

    @Transactional
    void cloreDerniere(UUID auditCritereId, boolean succes) {
        AnalyseIa passe = analyseIaRepository
                .find("auditCritere.id = ?1 and statut = ?2", auditCritereId, StatutPipeline.EN_COURS)
                .firstResult();
        if (succes) {
            passe.terminer();
        } else {
            passe.echouer("INTERNE", "Échec simulé pour éprouver la libération du verrou.");
        }
    }

    // === Le cas nominal ====================================================

    @Test
    void deuxDemandesSimultaneesSurLeMemeCritere_uneSeuleAboutit() throws Exception {
        Terrain t = terrain("Entreprise Verrou Nominal");

        int[] issues = deuxReservationsSimultanees(t.auditId(), t.critereA(), t.critereA());

        assertEquals(1, issues[0], "exactement une réservation doit aboutir");
        assertEquals(1, issues[1], "exactement une réservation doit être refusée");
        assertEquals(1, compterPasses(t.critereA()),
                "la demande refusée ne doit créer aucune passe");
        assertEquals(1, compterEnCours(t.critereA()),
                "un seul verrou logique pendant l'exécution");
    }

    @Test
    void laDemandeRefuseeNeCreeNiPasseNiTrace() throws Exception {
        Terrain t = terrain("Entreprise Verrou Sans Trace");

        deuxReservationsSimultanees(t.auditId(), t.critereA(), t.critereA());

        // Une seule passe, donc un seul contexte construit, un seul appel au
        // fournisseur, une seule évaluation. C'est tout l'intérêt : la
        // seconde demande est arrêtée AVANT de rien coûter.
        assertEquals(1, compterPasses(t.critereA()));
        assertEquals(0, compterExecutions(t.critereA()),
                "aucun appel fournisseur n'a eu lieu dans ce test");
        assertEquals(0, compterEvaluations(t.critereA()),
                "la demande refusée ne crée aucune évaluation");
    }

    @Transactional
    long compterExecutions(UUID auditCritereId) {
        return ((Number) entityManager.createNativeQuery(
                        "SELECT count(*) FROM execution_agent ea "
                                + "JOIN analyse_ia ai ON ai.id = ea.analyse_ia_id "
                                + "WHERE ai.audit_critere_id = ?1")
                .setParameter(1, auditCritereId).getSingleResult()).longValue();
    }

    @Transactional
    long compterEvaluations(UUID auditCritereId) {
        return ((Number) entityManager.createNativeQuery(
                        "SELECT count(*) FROM evaluation WHERE audit_critere_id = ?1")
                .setParameter(1, auditCritereId).getSingleResult()).longValue();
    }

    // === La granularité du verrou ==========================================

    @Test
    void deuxCriteresDifferentsDeLaMemeMissionPeuventDemarrerEnsemble() throws Exception {
        Terrain t = terrain("Entreprise Verrou Deux Criteres");

        int[] issues = deuxReservationsSimultanees(t.auditId(), t.critereA(), t.critereB());

        // Le verrou est par critère de mission, pas par mission : verrouiller
        // la mission entière sérialiserait l'analyse d'un référentiel de 92
        // critères.
        assertEquals(2, issues[0], "deux critères distincts doivent pouvoir démarrer");
        assertEquals(0, issues[1]);
    }

    @Test
    void leMemeCritereDeReferentielDansDeuxMissionsNeSeBloquePas() throws Exception {
        Terrain premiere = terrain("Entreprise Verrou Mission A");
        Terrain seconde = terrain("Entreprise Verrou Mission B");

        // `critereA` des deux terrains porte le même `critere_id` de
        // référentiel, mais deux `audit_critere_id` distincts. Verrouiller
        // sur le critère du référentiel bloquerait tous les clients entre
        // eux — c'est le piège que ce test ferme.
        CountDownLatch depart = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Callable<Boolean> a = () -> {
                depart.await();
                return reserver(premiere.auditId(), premiere.critereA());
            };
            Callable<Boolean> b = () -> {
                depart.await();
                return reserver(seconde.auditId(), seconde.critereA());
            };
            Future<Boolean> fa = pool.submit(a);
            Future<Boolean> fb = pool.submit(b);
            depart.countDown();
            assertTrue(fa.get(30, TimeUnit.SECONDS), "la mission A doit démarrer");
            assertTrue(fb.get(30, TimeUnit.SECONDS), "la mission B doit démarrer");
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void deuxEntreprisesDistinctesNeSeBloquentPas() throws Exception {
        // Même vérification que la précédente, énoncée du point de vue du
        // tenant : aucune entreprise ne doit pouvoir retarder l'analyse
        // d'une autre, ni constater son verrou.
        Terrain a = terrain("Entreprise Verrou Tenant A");
        Terrain b = terrain("Entreprise Verrou Tenant B");

        assertTrue(reserver(a.auditId(), a.critereA()));
        assertTrue(reserver(b.auditId(), b.critereA()),
                "le verrou d'une entreprise ne doit pas atteindre une autre");
    }

    // === La libération du verrou ===========================================

    @Test
    void unePasseTermineeLibereLeCritere() {
        Terrain t = terrain("Entreprise Verrou Termine");
        assertTrue(reserver(t.auditId(), t.critereA()));
        assertEquals(1, compterEnCours(t.critereA()));

        cloreDerniere(t.critereA(), true);

        assertEquals(0, compterEnCours(t.critereA()), "TERMINE ne verrouille plus");
        // Une ré-analyse volontaire reste possible : le verrou traite la
        // simultanéité, pas la répétition.
        assertTrue(reserver(t.auditId(), t.critereA()),
                "une nouvelle analyse doit être possible après la précédente");
        assertEquals(2, compterPasses(t.critereA()));
    }

    @Test
    void unePasseEnErreurLibereLeCritere() {
        Terrain t = terrain("Entreprise Verrou Erreur");
        assertTrue(reserver(t.auditId(), t.critereA()));

        cloreDerniere(t.critereA(), false);

        assertEquals(0, compterEnCours(t.critereA()), "ERREUR ne verrouille plus");
        assertTrue(reserver(t.auditId(), t.critereA()),
                "un échec ne doit pas condamner le critère");
    }

    @Test
    void deuxDemandesSuccessivesApresCloture_creentDeuxPasses() {
        Terrain t = terrain("Entreprise Verrou Successives");

        assertTrue(reserver(t.auditId(), t.critereA()));
        cloreDerniere(t.critereA(), true);
        assertTrue(reserver(t.auditId(), t.critereA()));
        cloreDerniere(t.critereA(), true);

        // Une demande explicite après la fin de la précédente n'est pas un
        // doublon : c'est une ré-analyse, et elle est légitime.
        assertEquals(2, compterPasses(t.critereA()));
        assertEquals(0, compterEnCours(t.critereA()));
    }

    // === Le verrou n'est pas en mémoire ====================================

    @Test
    void leVerrouReposeSurLaBaseEtNonSurLaMemoireDuProcessus() {
        Terrain t = terrain("Entreprise Verrou Base");
        assertTrue(reserver(t.auditId(), t.critereA()));

        // La réservation est une LIGNE, visible par toute connexion — donc
        // par toute instance de l'application. Une variable Java, un
        // `synchronized` ou un cache local ne seraient visibles que du
        // processus qui les héberge, et deux instances derrière un
        // répartiteur de charge lanceraient deux passes.
        long visibleHorsSession = ((Number) entityManager.createNativeQuery(
                        "SELECT count(*) FROM analyse_ia WHERE audit_critere_id = ?1 "
                                + "AND statut = 'EN_COURS'")
                .setParameter(1, t.critereA()).getSingleResult()).longValue();

        assertEquals(1, visibleHorsSession,
                "la réservation doit être un fait de la base, pas de la JVM");
    }
}
