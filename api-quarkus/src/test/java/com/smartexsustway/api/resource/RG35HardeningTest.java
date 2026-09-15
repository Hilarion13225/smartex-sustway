package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.RoleRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.ia.EvaluerCritereResponseDto;
import com.smartexsustway.api.ia.IaEvaluationClient;
import com.smartexsustway.api.ia.IaEvaluationClientV2;
import com.smartexsustway.api.ia.contrat.EnveloppeV2Dto;
import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * RG35-HARDENING — une exclusion ne se contourne ni par le dépôt de preuve,
 * ni par une opération commencée avant elle.
 *
 * <p>H1 : {@code POST …/preuves} refuse (409) tout rattachement à un critère
 * non applicable ou retiré du périmètre, avant toute écriture.
 *
 * <p>H2 : une analyse IA (V1 ou V2) déjà engagée quand l'exclusion survient
 * ne crée ni évaluation, ni non-conformité, ni axe, et surtout ne réécrit pas
 * les drapeaux d'exclusion : Hibernate émet l'UPDATE complet de la ligne
 * AUDIT_CRITERE, et une copie lue avant l'exclusion la rétablissait (lost
 * update). Même garantie pour une saisie concurrente.
 *
 * <p>Les opérations concurrentes sont synchronisées par des
 * {@link CountDownLatch} (convention de VerrouAnalyseConcurrenteTest) : le
 * double IA se bloque dans l'appel, l'exclusion passe pendant ce temps, puis
 * l'appel est relâché. Aucun délai arbitraire ne décide de l'ordre.
 *
 * <p>Décor : base de test, mission Avancées sur SMARTEX_SUSTWAY, critères de
 * fin de catalogue (jamais D1-01 ni D1-02). Aucun bailleur.
 */
@QuarkusTest
class RG35HardeningTest {

    /** Borne de toute attente : au-delà, c'est un blocage, pas une lenteur. */
    private static final long ATTENTE_MAX_S = 60;

    @Inject JwtService jwtService;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntityManager entityManager;

    @InjectMock
    @RestClient
    IaEvaluationClient iaEvaluationClient;

    @InjectMock
    @RestClient
    IaEvaluationClientV2 iaEvaluationClientV2;

    private final ExecutorService executeur = Executors.newFixedThreadPool(4);

    @AfterEach
    void arreterExecuteur() {
        executeur.shutdownNow();
    }

    private record Contexte(String token, String entrepriseId, String auditId, String jetonAdmin) {
    }

    private record Critere(String auditCritereId, String code) {
    }

    /** Statut HTTP et corps d'un appel mené dans un autre thread. */
    private record Reponse(int statut, String corps) {
    }

    // --- Construction ---------------------------------------------------

    private Contexte contexte() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise RG35 Hardening",
                        "identifiantLegal", "RCCM-RG35H-" + UUID.randomUUID(),
                        "formuleCode", "AVANCEES"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201)
                .extract().path("entreprise.id");
        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of("fournisseur", "PI_SPI"))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/abonnement/paiements")
                .then().statusCode(201);
        String auditId = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "referentielCode", "SMARTEX_SUSTWAY",
                        "nom", "Audit RG35 Hardening",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201)
                .extract().path("id");
        String jetonAdmin = UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository, utilisateurEntrepriseRepository).token;
        return new Contexte(utilisateur.token, entrepriseId, auditId, jetonAdmin);
    }

    @SuppressWarnings("unchecked")
    private List<Critere> criteresDeFin(Contexte ctx, int n) {
        List<Critere> criteres = QuarkusTransaction.requiringNew().call(() ->
                ((List<Object[]>) entityManager.createNativeQuery(
                                "SELECT ac.id::text, c.code FROM audit_critere ac "
                                        + "JOIN critere c ON c.id = ac.critere_id JOIN domaine d ON d.id = c.domaine_id "
                                        + "WHERE ac.audit_id = CAST(?1 AS uuid) "
                                        + "ORDER BY d.ordre DESC, c.code DESC LIMIT " + n)
                        .setParameter(1, ctx.auditId())
                        .getResultList()).stream()
                        .map(l -> new Critere((String) l[0], (String) l[1]))
                        .toList());
        assertEquals(n, criteres.size());
        criteres.forEach(c -> assertFalse(List.of("D1-01", "D1-02").contains(c.code()), c.code()));
        return criteres;
    }

    private void executer(String sql, Object... parametres) {
        QuarkusTransaction.requiringNew().run(() -> {
            var requete = entityManager.createNativeQuery(sql);
            for (int i = 0; i < parametres.length; i++) {
                requete.setParameter(i + 1, parametres[i]);
            }
            requete.executeUpdate();
        });
    }

    private Object scalaire(String sql, Object... parametres) {
        return QuarkusTransaction.requiringNew().call(() -> {
            var requete = entityManager.createNativeQuery(sql);
            for (int i = 0; i < parametres.length; i++) {
                requete.setParameter(i + 1, parametres[i]);
            }
            return requete.getSingleResult();
        });
    }

    private long nombre(String sql, Object... parametres) {
        return ((Number) scalaire(sql, parametres)).longValue();
    }

    /** Critère renseigné, prêt à l'analyse : scénario, criticité, statut, mission en cours. */
    private void preparerPourAnalyse(Contexte ctx, Critere critere, String statut) {
        executer("UPDATE audit_critere SET scenario = 'Scénario RG35-HARDENING', statut = ?2, coefficient_ponderation = 3, "
                        + "criticite_id = coalesce(criticite_id, (SELECT id FROM criticite ORDER BY poids DESC LIMIT 1)) "
                        + "WHERE id = CAST(?1 AS uuid)",
                critere.auditCritereId(), statut);
        executer("UPDATE audit SET statut = 'EN_COURS' WHERE id = CAST(?1 AS uuid)", ctx.auditId());
    }

    /** Actif, applicable, statut et scénario de la ligne, relus en base. */
    private String etat(Critere critere) {
        Object[] l = (Object[]) scalaire(
                "SELECT actif, applicable, statut, coalesce(scenario, '') FROM audit_critere WHERE id = CAST(?1 AS uuid)",
                critere.auditCritereId());
        return l[0] + "|" + l[1] + "|" + l[2] + "|" + l[3];
    }

    private String drapeaux(Critere critere) {
        Object[] l = (Object[]) scalaire("SELECT actif, applicable FROM audit_critere WHERE id = CAST(?1 AS uuid)",
                critere.auditCritereId());
        return l[0] + "|" + l[1];
    }

    private long evaluations(Critere critere) {
        return nombre("SELECT count(*) FROM evaluation WHERE audit_critere_id = CAST(?1 AS uuid)", critere.auditCritereId());
    }

    private long nonConformites(Critere critere) {
        return nombre("SELECT count(*) FROM non_conforme nc JOIN evaluation e ON e.id = nc.evaluation_id "
                + "WHERE e.audit_critere_id = CAST(?1 AS uuid)", critere.auditCritereId());
    }

    private long axes(Critere critere) {
        return nombre("SELECT count(*) FROM axe_amelioration WHERE audit_critere_id = CAST(?1 AS uuid)", critere.auditCritereId());
    }

    private long reponses(Critere critere) {
        return nombre("SELECT count(*) FROM reponse_question r JOIN audit_question aq ON aq.id = r.audit_question_id "
                + "WHERE aq.audit_critere_id = CAST(?1 AS uuid)", critere.auditCritereId());
    }

    private String url(Contexte ctx) {
        return "/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId();
    }

    private Reponse exclure(Contexte ctx, Critere critere, boolean actif, boolean applicable) {
        var r = given()
                .header("Authorization", "Bearer " + ctx.jetonAdmin())
                .contentType(ContentType.JSON)
                .body(Map.of("actif", actif, "applicable", applicable, "motif", "Décision RG35-HARDENING"))
                .when().put(url(ctx) + "/criteres/" + critere.auditCritereId() + "/perimetre");
        return new Reponse(r.statusCode(), r.asString());
    }

    private Reponse analyserV1(Contexte ctx, Critere critere) {
        var r = given().header("Authorization", "Bearer " + ctx.jetonAdmin()).contentType(ContentType.JSON).body("{}")
                .when().post(url(ctx) + "/criteres/" + critere.auditCritereId() + "/evaluations");
        return new Reponse(r.statusCode(), r.asString());
    }

    private Reponse analyserV2(Contexte ctx, Critere critere) {
        var r = given().header("Authorization", "Bearer " + ctx.jetonAdmin()).contentType(ContentType.JSON).body("{}")
                .when().post(url(ctx) + "/criteres/" + critere.auditCritereId() + "/evaluations/v2");
        return new Reponse(r.statusCode(), r.asString());
    }

    private Reponse saisir(Contexte ctx, Critere critere, String auditQuestionId, String scenario) {
        var r = given().header("Authorization", "Bearer " + ctx.token()).contentType(ContentType.JSON)
                .body(Map.of("scenario", scenario,
                        "reponses", List.of(Map.of("auditQuestionId", auditQuestionId, "niveau", 2))))
                .when().put(url(ctx) + "/criteres/" + critere.auditCritereId() + "/questions");
        return new Reponse(r.statusCode(), r.asString());
    }

    private String premiereQuestion(Contexte ctx, Critere critere) {
        String id = given().header("Authorization", "Bearer " + ctx.token())
                .when().get(url(ctx) + "/criteres/" + critere.auditCritereId() + "/questions")
                .then().statusCode(200).extract().path("questions[0].auditQuestionId");
        assertTrue(id != null, "le critère porte au moins une question");
        return id;
    }

    private <T> Future<T> lancer(Callable<T> tache) {
        return executeur.submit(tache);
    }

    private static <T> T attendre(Future<T> futur, String quoi) throws Exception {
        try {
            return futur.get(ATTENTE_MAX_S, TimeUnit.SECONDS);
        } catch (java.util.concurrent.TimeoutException e) {
            fail(quoi + " : non terminé après " + ATTENTE_MAX_S + " s (blocage)");
            return null;
        }
    }

    private static void attendre(CountDownLatch latch, String quoi) throws InterruptedException {
        assertTrue(latch.await(ATTENTE_MAX_S, TimeUnit.SECONDS), quoi + " : non atteint après " + ATTENTE_MAX_S + " s");
    }

    private static EvaluerCritereResponseDto reponseIaDefavorable() {
        // Probabilité 0.10 → niveau 1 : sans la garde, une non-conformité naîtrait.
        return new EvaluerCritereResponseDto(UUID.randomUUID(), 0.10, 0.9, true, "Analyse RG35-HARDENING",
                List.of(), false, null, null, false, null);
    }

    private static EnveloppeV2Dto enveloppeV2(Critere critere) {
        var evidence = new EnveloppeV2Dto.EvidenceDto(true, "Couverture de test", 0.20, 0.9,
                "Conformité de test", List.of(), List.of());
        var recommandation = new EnveloppeV2Dto.RecommandationDto(true, "Pistes de test",
                List.of(new EnveloppeV2Dto.ActionDto("Formaliser la procédure RG35-HARDENING", null)));
        return new EnveloppeV2Dto(new EnveloppeV2Dto.ResultatDto("2.0", critere.auditCritereId(), List.of(),
                evidence, null, recommandation), null);
    }

    // --- Dépôt de preuve --------------------------------------------------

    private String televerserDocument(Contexte ctx) {
        return given()
                .header("Authorization", "Bearer " + ctx.token())
                .multiPart("fichier", "preuve-rg35-hardening.pdf", "%PDF-1.4 contenu de test".getBytes(), "application/pdf")
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/documents")
                .then().statusCode(201)
                .extract().path("id");
    }

    private io.restassured.response.Response deposer(Contexte ctx, String documentId, List<Critere> criteres) {
        return given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("documentId", documentId, "description", "Preuve RG35-HARDENING", "type", "JUSTIFICATIF",
                        "auditCritereIds", criteres.stream().map(Critere::auditCritereId).toList()))
                .when().post(url(ctx) + "/preuves");
    }

    private long preuvesDeLaMission(Contexte ctx) {
        return nombre("SELECT count(*) FROM preuve WHERE audit_id = CAST(?1 AS uuid)", ctx.auditId());
    }

    private long rattachements(Contexte ctx) {
        return nombre("SELECT count(*) FROM preuve_critere pc JOIN preuve p ON p.id = pc.preuve_id "
                + "WHERE p.audit_id = CAST(?1 AS uuid)", ctx.auditId());
    }

    private long journauxPreuve(Contexte ctx) {
        return nombre("SELECT count(*) FROM audit_log WHERE action = 'PREUVE_AJOUTEE' AND entreprise_id = CAST(?1 AS uuid)",
                ctx.entrepriseId());
    }

    private void verifierAucunDepot(Contexte ctx) {
        assertEquals(0, preuvesDeLaMission(ctx), "aucune preuve");
        assertEquals(0, rattachements(ctx), "aucun rattachement preuve_critere");
        assertEquals(0, journauxPreuve(ctx), "aucun journal PREUVE_AJOUTEE");
    }

    // === H1-1 — preuve sur un critère « Non applicable » ====================

    @Test
    void h1_1_preuveSurCritereNonApplicable_409SansEcriture() {
        Contexte ctx = contexte();
        Critere critere = criteresDeFin(ctx, 1).get(0);
        assertEquals(200, exclure(ctx, critere, true, false).statut());
        String documentId = televerserDocument(ctx);

        deposer(ctx, documentId, List.of(critere)).then().statusCode(409)
                .body("message", org.hamcrest.Matchers.containsString("Non applicable"));
        verifierAucunDepot(ctx);
    }

    // === H1-2 — preuve sur un critère « Retiré du périmètre » ===============

    @Test
    void h1_2_preuveSurCritereRetire_409SansEcriture() {
        Contexte ctx = contexte();
        Critere critere = criteresDeFin(ctx, 1).get(0);
        assertEquals(200, exclure(ctx, critere, false, true).statut());
        String documentId = televerserDocument(ctx);

        deposer(ctx, documentId, List.of(critere)).then().statusCode(409)
                .body("message", org.hamcrest.Matchers.containsString("Retiré du périmètre"));
        verifierAucunDepot(ctx);
    }

    // === H1-3 — preuve multi-critères dont un exclu =========================

    @Test
    void h1_3_preuveMultiCriteresDontUnExclu_409RienPersiste() {
        Contexte ctx = contexte();
        List<Critere> c = criteresDeFin(ctx, 2);
        Critere actif = c.get(0);
        Critere exclu = c.get(1);
        assertEquals(200, exclure(ctx, exclu, true, false).statut());
        String documentId = televerserDocument(ctx);

        // Dans les deux ordres : le critère actif lu en premier ne doit rien laisser derrière lui.
        deposer(ctx, documentId, List.of(actif, exclu)).then().statusCode(409);
        deposer(ctx, documentId, List.of(exclu, actif)).then().statusCode(409);
        verifierAucunDepot(ctx);
    }

    // === H1-4 — contrôle positif ============================================

    @Test
    void h1_4_preuveSurCritereActif_201() {
        Contexte ctx = contexte();
        List<Critere> c = criteresDeFin(ctx, 2);
        assertEquals(200, exclure(ctx, c.get(1), false, true).statut());
        String documentId = televerserDocument(ctx);

        deposer(ctx, documentId, List.of(c.get(0))).then().statusCode(201)
                .body("critereCodes", org.hamcrest.Matchers.hasItem(c.get(0).code()));
        assertEquals(1, preuvesDeLaMission(ctx));
        assertEquals(1, rattachements(ctx));
        assertEquals(1, journauxPreuve(ctx));
    }

    // === H1-5 — preuve existante puis exclusion =============================

    @Test
    void h1_5_preuveExistantePuisExclusion_resteListeeEtRattachee() {
        Contexte ctx = contexte();
        Critere critere = criteresDeFin(ctx, 1).get(0);
        String documentId = televerserDocument(ctx);
        String preuveId = deposer(ctx, documentId, List.of(critere)).then().statusCode(201).extract().path("id");

        assertEquals(200, exclure(ctx, critere, true, false).statut());

        given().header("Authorization", "Bearer " + ctx.token())
                .when().get(url(ctx) + "/preuves")
                .then().statusCode(200)
                .body("id", org.hamcrest.Matchers.hasItem(preuveId))
                .body("find { it.id == '" + preuveId + "' }.critereCodes", org.hamcrest.Matchers.hasItem(critere.code()));
        assertEquals(1L, nombre("SELECT count(*) FROM preuve_critere WHERE preuve_id = CAST(?1 AS uuid) "
                + "AND audit_critere_id = CAST(?2 AS uuid)", preuveId, critere.auditCritereId()), "rattachement intact");
    }

    // === H2-1 — V1 engagée, critère DECLARE, exclusion pendant l'appel IA ====

    @Test
    void h2_1_v1EngageePuisExclusion_exclusionConserveeAucuneEvaluationNiNc() throws Exception {
        Contexte ctx = contexte();
        Critere critere = criteresDeFin(ctx, 1).get(0);
        preparerPourAnalyse(ctx, critere, "DECLARE");

        CountDownLatch dansIa = new CountDownLatch(1);
        CountDownLatch relacher = new CountDownLatch(1);
        when(iaEvaluationClient.evaluerCritere(any())).thenAnswer(invocation -> {
            dansIa.countDown();
            assertTrue(relacher.await(ATTENTE_MAX_S, TimeUnit.SECONDS));
            return reponseIaDefavorable();
        });

        Future<Reponse> analyse = lancer(() -> analyserV1(ctx, critere));
        attendre(dansIa, "appel IA V1");

        // L'exclusion passe pendant l'appel IA : aucun verrou n'est tenu pendant ce temps.
        long debut = System.nanoTime();
        Reponse exclusion = exclure(ctx, critere, false, true);
        long dureeMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - debut);
        assertEquals(200, exclusion.statut(), exclusion.corps());
        assertFalse(analyse.isDone(), "l'analyse est toujours bloquée dans l'IA");
        assertTrue(dureeMs < 10_000, "exclusion servie sans attendre l'IA : " + dureeMs + " ms");

        relacher.countDown();
        Reponse resultat = attendre(analyse, "analyse V1");

        // L'invariant critique d'abord : l'exclusion n'est pas réécrite (lost update).
        assertEquals("false|true|DECLARE|Scénario RG35-HARDENING", etat(critere), "exclusion conservée, statut intact");
        assertEquals(0, evaluations(critere), "aucune évaluation après exclusion");
        assertEquals(0, nonConformites(critere), "aucune non-conformité après exclusion");
        assertEquals(409, resultat.statut(), "analyse refusée après exclusion : " + resultat.corps());
        assertTrue(resultat.corps().contains("Retiré du périmètre"), resultat.corps());
    }

    // === H2-2 — V1 engagée, ré-analyse d'un critère déjà EVALUE ==============

    @Test
    void h2_2_v1ReanalyseEngageePuisExclusion_aucuneNouvelleEvaluation() throws Exception {
        Contexte ctx = contexte();
        Critere critere = criteresDeFin(ctx, 1).get(0);
        preparerPourAnalyse(ctx, critere, "EVALUE");
        executer("INSERT INTO evaluation (audit_critere_id, probabilite_conforme, note, source, statut, contrat_version, "
                        + "justification, date_evaluation) VALUES (CAST(?1 AS uuid), 0.9500, 5, 'IA', 'VALIDEE', NULL, "
                        + "'Analyse antérieure RG35-HARDENING', now() - interval '1 hour')",
                critere.auditCritereId());

        CountDownLatch dansIa = new CountDownLatch(1);
        CountDownLatch relacher = new CountDownLatch(1);
        when(iaEvaluationClient.evaluerCritere(any())).thenAnswer(invocation -> {
            dansIa.countDown();
            assertTrue(relacher.await(ATTENTE_MAX_S, TimeUnit.SECONDS));
            return reponseIaDefavorable();
        });

        Future<Reponse> analyse = lancer(() -> analyserV1(ctx, critere));
        attendre(dansIa, "appel IA V1");
        assertEquals(200, exclure(ctx, critere, true, false).statut());
        relacher.countDown();
        Reponse resultat = attendre(analyse, "ré-analyse V1");

        assertEquals("true|false", drapeaux(critere), "exclusion conservée");
        assertEquals(1, evaluations(critere), "seule l'évaluation antérieure subsiste");
        assertEquals(0, nonConformites(critere), "aucune non-conformité");
        assertEquals(409, resultat.statut(), resultat.corps());
    }

    // === H2-3 — V2 engagée, exclusion pendant l'appel IA =====================

    @Test
    void h2_3_v2EngageePuisExclusion_aucuneEvaluationNiAxePasseCloseInterne() throws Exception {
        Contexte ctx = contexte();
        Critere critere = criteresDeFin(ctx, 1).get(0);
        preparerPourAnalyse(ctx, critere, "DECLARE");

        CountDownLatch dansIa = new CountDownLatch(1);
        CountDownLatch relacher = new CountDownLatch(1);
        when(iaEvaluationClientV2.executerCritere(any())).thenAnswer(invocation -> {
            dansIa.countDown();
            assertTrue(relacher.await(ATTENTE_MAX_S, TimeUnit.SECONDS));
            return enveloppeV2(critere);
        });

        Future<Reponse> analyse = lancer(() -> analyserV2(ctx, critere));
        attendre(dansIa, "appel IA V2");
        long debut = System.nanoTime();
        assertEquals(200, exclure(ctx, critere, false, true).statut());
        assertTrue(TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - debut) < 10_000, "exclusion sans attendre l'IA V2");
        relacher.countDown();
        Reponse resultat = attendre(analyse, "analyse V2");

        assertEquals("false|true", drapeaux(critere), "exclusion conservée");
        assertEquals(0, evaluations(critere), "aucune évaluation EN_REVUE");
        assertEquals(0, axes(critere), "aucun axe proposé");
        assertEquals(409, resultat.statut(), resultat.corps());
        assertTrue(resultat.corps().contains("Retiré du périmètre"), resultat.corps());
        Object[] passe = (Object[]) scalaire("SELECT statut::text, erreur_type, count(*) OVER () FROM analyse_ia "
                + "WHERE audit_critere_id = CAST(?1 AS uuid)", critere.auditCritereId());
        assertEquals("ERREUR", passe[0], "passe close en erreur");
        assertEquals("INTERNE", passe[1], "type d'erreur existant");
        assertEquals(1L, ((Number) passe[2]).longValue(), "une seule passe");

        // Aucune passe résiduelle EN_COURS : un nouvel essai est refusé pour exclusion, pas pour concurrence.
        Reponse relance = analyserV2(ctx, critere);
        assertEquals(409, relance.statut());
        assertTrue(relance.corps().contains("Retiré du périmètre"), relance.corps());
        assertFalse(relance.corps().contains("déjà en cours"), relance.corps());
    }

    // === H2-4 — saisie concurrente d'une exclusion en cours ==================

    @Test
    void h2_4_saisiePendantExclusionEnCours_exclusionNonEcrasee() throws Exception {
        Contexte ctx = contexte();
        Critere critere = criteresDeFin(ctx, 1).get(0);
        String auditQuestionId = premiereQuestion(ctx, critere);
        String etatInitial = etat(critere);

        // Exclusion en cours : une transaction tient le verrou de ligne et a déjà
        // écrit applicable=false, comme definirPerimetreCritere avant son commit.
        CountDownLatch verrouTenu = new CountDownLatch(1);
        CountDownLatch commit = new CountDownLatch(1);
        Future<?> exclusion = lancer(() -> {
            QuarkusTransaction.requiringNew().run(() -> {
                entityManager.createNativeQuery("SELECT id FROM audit_critere WHERE id = CAST(?1 AS uuid) FOR UPDATE")
                        .setParameter(1, critere.auditCritereId()).getResultList();
                entityManager.createNativeQuery("UPDATE audit_critere SET applicable = false WHERE id = CAST(?1 AS uuid)")
                        .setParameter(1, critere.auditCritereId()).executeUpdate();
                verrouTenu.countDown();
                try {
                    assertTrue(commit.await(ATTENTE_MAX_S, TimeUnit.SECONDS));
                } catch (InterruptedException e) {
                    throw new IllegalStateException(e);
                }
            });
            return null;
        });
        attendre(verrouTenu, "verrou d'exclusion");

        Future<Reponse> saisie = lancer(() -> saisir(ctx, critere, auditQuestionId, "Saisie concurrente RG35-HARDENING"));
        // La saisie doit être en attente du verrou de ligne avant qu'on relâche l'exclusion.
        long limite = System.nanoTime() + TimeUnit.SECONDS.toNanos(ATTENTE_MAX_S);
        while (nombre("SELECT count(*) FROM pg_locks WHERE NOT granted") == 0) {
            assertFalse(saisie.isDone(), "la saisie n'a pas attendu le verrou : " + (saisie.isDone() ? saisie.get() : ""));
            assertTrue(System.nanoTime() < limite, "aucune attente de verrou observée");
            Thread.sleep(50);
        }
        commit.countDown();
        attendre(exclusion, "exclusion");
        Reponse resultat = attendre(saisie, "saisie");

        assertEquals(etatInitial.replaceFirst("^true\\|true", "true|false"), etat(critere),
                "exclusion non écrasée, ni scénario ni statut écrits");
        assertEquals(0, reponses(critere), "aucune réponse enregistrée");
        assertEquals(409, resultat.statut(), "saisie refusée une fois l'exclusion validée : " + resultat.corps());
    }

    // === H2-5 — absence de blocage, exclusion rapide =========================

    @Test
    void h2_5_operationsSimultanees_aucunBlocageExclusionRapide() throws Exception {
        Contexte ctx = contexte();
        List<Critere> c = criteresDeFin(ctx, 3);
        Critere analyse = c.get(0);
        Critere saisi = c.get(1);
        Critere libre = c.get(2);
        preparerPourAnalyse(ctx, analyse, "DECLARE");
        String auditQuestionId = premiereQuestion(ctx, saisi);

        // 1. Sans IA en cours, l'exclusion est immédiate.
        long debut = System.nanoTime();
        assertEquals(200, exclure(ctx, libre, true, false).statut());
        long dureeLibreMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - debut);
        assertTrue(dureeLibreMs < 5_000, "exclusion sans concurrence : " + dureeLibreMs + " ms");

        // 2. Analyse V1, exclusion du même critère et saisie d'un autre critère, relâchées ensemble.
        when(iaEvaluationClient.evaluerCritere(any())).thenReturn(reponseIaDefavorable());
        CountDownLatch depart = new CountDownLatch(1);
        List<Future<Reponse>> taches = new ArrayList<>();
        taches.add(lancer(() -> { depart.await(); return analyserV1(ctx, analyse); }));
        taches.add(lancer(() -> { depart.await(); return exclure(ctx, analyse, false, true); }));
        taches.add(lancer(() -> { depart.await(); return saisir(ctx, saisi, auditQuestionId, "Saisie simultanée"); }));
        depart.countDown();

        List<Reponse> reponses = new ArrayList<>();
        for (Future<Reponse> tache : taches) {
            reponses.add(attendre(tache, "opération simultanée"));
        }
        for (Reponse r : reponses) {
            assertNotEquals(500, r.statut(), "aucune erreur serveur (deadlock détecté par PostgreSQL) : " + r.corps());
        }
        assertEquals(200, reponses.get(1).statut(), "exclusion servie : " + reponses.get(1).corps());
        assertEquals(200, reponses.get(2).statut(), "saisie d'un autre critère servie : " + reponses.get(2).corps());
        assertEquals("false|true", drapeaux(analyse), "exclusion conservée quel que soit l'ordre");

        // Selon l'ordre réel : analyse écrite avant l'exclusion (201), ou refusée après elle (409) —
        // jamais une évaluation datée après la décision d'exclusion.
        int statutAnalyse = reponses.get(0).statut();
        assertTrue(statutAnalyse == 201 || statutAnalyse == 409, "analyse : " + reponses.get(0).corps());
        long evaluationsApresExclusion = nombre("SELECT count(*) FROM evaluation e WHERE e.audit_critere_id = CAST(?1 AS uuid) "
                + "AND e.date_evaluation > (SELECT min(created_at) FROM audit_log WHERE entite_id = CAST(?1 AS uuid) "
                + "AND action = 'CRITERE_RETIRE_PERIMETRE')", analyse.auditCritereId());
        assertEquals(0, evaluationsApresExclusion, "aucune évaluation créée après l'exclusion");
        assertEquals(statutAnalyse == 201 ? 1 : 0, evaluations(analyse));
        assertEquals("true|false", drapeaux(libre));
    }
}
