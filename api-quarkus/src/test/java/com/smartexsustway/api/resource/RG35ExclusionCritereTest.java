package com.smartexsustway.api.resource;

import com.smartexsustway.api.audit.AuditLogService;
import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
import com.smartexsustway.api.domain.enums.ValeurReponse;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.RoleRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.ia.EvaluerCritereResponseDto;
import com.smartexsustway.api.ia.IaEvaluationClient;
import com.smartexsustway.api.ia.IaEvaluationClientV2;
import com.smartexsustway.api.mission.AnalyseCritereService;
import com.smartexsustway.api.mission.AnalyseMissionService;
import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusMock;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.path.json.JsonPath;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.openpdf.text.pdf.PdfReader;
import org.openpdf.text.pdf.parser.PdfTextExtractor;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * RG35 — exclusion contrôlée d'un critère de mission : « Non applicable »
 * ({@code audit_critere.applicable=false}) ou « Retiré du périmètre »
 * ({@code audit_critere.actif=false}).
 *
 * <p>Ce que ces tests protègent : un critère exclu sort du score et du total,
 * n'est plus saisissable, n'est jamais soumis à l'IA (analyse unitaire V1/V2,
 * validation) et apparaît en toutes lettres dans les rapports — jamais « — »
 * ni 0. La décision est réservée au personnel interne Smartex, refusée sur une
 * mission close, motivée, et journalisée dans la même transaction. Rien
 * n'est effacé. La réponse NON_APPLICABLE n'est plus acceptée à la saisie.
 *
 * <p>Décor : mission Avancées sur SMARTEX_SUSTWAY en base de test, critères de
 * fin de catalogue (jamais D1-01 ni D1-02), évaluations posées en base comme
 * dans ScoreAbsentRapportTest. Aucun bailleur. Les clients IA sont des doubles
 * dont on vérifie qu'ils ne sont pas appelés.
 */
@QuarkusTest
class RG35ExclusionCritereTest {

    private static final String NON_APPLICABLE = "Non applicable";
    private static final String RETIRE = "Retiré du périmètre";

    @Inject JwtService jwtService;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject AuditRepository auditRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject AnalyseCritereService analyseCritereService;
    @Inject AnalyseMissionService analyseMissionService;
    @Inject EntityManager entityManager;

    @InjectMock
    @RestClient
    IaEvaluationClient iaEvaluationClient;

    @InjectMock
    @RestClient
    IaEvaluationClientV2 iaEvaluationClientV2;

    private record Contexte(String token, String entrepriseId, String auditId, String jetonAdmin, String adminId) {
    }

    /** Un critère de la mission : ligne AUDIT_CRITERE, critère du catalogue, code. */
    private record Critere(String auditCritereId, String critereId, String code) {
    }

    // --- Construction ---------------------------------------------------

    private Contexte contexte() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise RG35 Exclusion",
                        "identifiantLegal", "RCCM-RG35-" + UUID.randomUUID(),
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

        String auditId = nouvelAudit(utilisateur.token, entrepriseId);
        var admin = UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository, utilisateurEntrepriseRepository);
        return new Contexte(utilisateur.token, entrepriseId, auditId, admin.token, admin.id);
    }

    private static String nouvelAudit(String token, String entrepriseId) {
        return given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "referentielCode", "SMARTEX_SUSTWAY",
                        "nom", "Audit RG35 Exclusion",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201)
                .extract().path("id");
    }

    /** Les {@code n} derniers critères de la mission, du dernier au premier — jamais D1-01/D1-02. */
    @SuppressWarnings("unchecked")
    private List<Critere> criteresDeFin(Contexte ctx, int n) {
        List<Critere> criteres = QuarkusTransaction.requiringNew().call(() ->
                ((List<Object[]>) entityManager.createNativeQuery(
                                "SELECT ac.id::text, c.id::text, c.code FROM audit_critere ac "
                                        + "JOIN critere c ON c.id = ac.critere_id JOIN domaine d ON d.id = c.domaine_id "
                                        + "WHERE ac.audit_id = CAST(?1 AS uuid) "
                                        + "ORDER BY d.ordre DESC, c.code DESC LIMIT " + n)
                        .setParameter(1, ctx.auditId())
                        .getResultList()).stream()
                        .map(l -> new Critere((String) l[0], (String) l[1], (String) l[2]))
                        .toList());
        assertEquals(n, criteres.size());
        criteres.forEach(c -> assertFalse(List.of("D1-01", "D1-02").contains(c.code()),
                "les tests ne doivent pas marquer les premiers critères du catalogue : " + c.code()));
        return criteres;
    }

    /** Analyse IA datée de {@code minutesAvant} minutes, coefficient 3 — même décor que ScoreAbsentRapportTest. */
    private void analyseIa(Contexte ctx, Critere critere, String statut, String probabilite, int note, int minutesAvant) {
        boolean validee = "VALIDEE".equals(statut);
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery(
                            "UPDATE audit_critere SET coefficient_ponderation = 3, criticite_id = "
                                    + "coalesce(criticite_id, (SELECT id FROM criticite ORDER BY poids DESC LIMIT 1)) "
                                    + "WHERE id = CAST(?1 AS uuid)")
                    .setParameter(1, critere.auditCritereId())
                    .executeUpdate();
            entityManager.createNativeQuery(
                            "INSERT INTO evaluation (audit_critere_id, probabilite_conforme, note, source, statut, "
                                    + "contrat_version, justification, date_evaluation, validee_par, validee_le) "
                                    + "SELECT ac.id, CAST(?2 AS numeric), CAST(?3 AS smallint), 'IA', "
                                    + "CAST(?4 AS statut_evaluation), '2.0', 'Analyse IA fictive de test.', "
                                    + "now() - make_interval(mins => ?5), "
                                    + "CASE WHEN ?6 THEN a.created_by END, CASE WHEN ?6 THEN now() END "
                                    + "FROM audit_critere ac JOIN audit a ON a.id = ac.audit_id "
                                    + "WHERE ac.id = CAST(?1 AS uuid)")
                    .setParameter(1, critere.auditCritereId())
                    .setParameter(2, probabilite).setParameter(3, note)
                    .setParameter(4, statut).setParameter(5, minutesAvant).setParameter(6, validee)
                    .executeUpdate();
        });
    }

    private void poserStatutMission(Contexte ctx, String statut) {
        QuarkusTransaction.requiringNew().run(() -> entityManager.createNativeQuery(
                        "UPDATE audit SET statut = CAST(?2 AS statut_audit) WHERE id = CAST(?1 AS uuid)")
                .setParameter(1, ctx.auditId()).setParameter(2, statut).executeUpdate());
    }

    private void poserScenario(Critere critere, String scenario) {
        QuarkusTransaction.requiringNew().run(() -> entityManager.createNativeQuery(
                        "UPDATE audit_critere SET scenario = ?2 WHERE id = CAST(?1 AS uuid)")
                .setParameter(1, critere.auditCritereId()).setParameter(2, scenario).executeUpdate());
    }

    /** Pose une réponse existante en base (historique), sans passer par la saisie. */
    private void poserReponseHistorique(String auditQuestionId, int niveau) {
        QuarkusTransaction.requiringNew().run(() -> entityManager.createNativeQuery(
                        "INSERT INTO reponse_question (audit_question_id, niveau) VALUES (CAST(?1 AS uuid), CAST(?2 AS smallint))")
                .setParameter(1, auditQuestionId).setParameter(2, niveau).executeUpdate());
    }

    /** Une valeur d'une requête SQL scalaire, lue en base de test hors du cache de persistance. */
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

    /** Les drapeaux, le statut et le scénario de la ligne, tels qu'en base. */
    private String etat(Critere critere) {
        Object[] l = (Object[]) scalaire(
                "SELECT actif, applicable, statut, coalesce(scenario, '') FROM audit_critere WHERE id = CAST(?1 AS uuid)",
                critere.auditCritereId());
        return l[0] + "|" + l[1] + "|" + l[2] + "|" + l[3];
    }

    private long evaluations(Critere critere) {
        return nombre("SELECT count(*) FROM evaluation WHERE audit_critere_id = CAST(?1 AS uuid)", critere.auditCritereId());
    }

    private long reponses(Critere critere) {
        return nombre("SELECT count(*) FROM reponse_question r JOIN audit_question aq ON aq.id = r.audit_question_id "
                + "WHERE aq.audit_critere_id = CAST(?1 AS uuid)", critere.auditCritereId());
    }

    private long journauxExclusion(Critere critere) {
        return nombre("SELECT count(*) FROM audit_log WHERE entite = 'audit_critere' AND entite_id = CAST(?1 AS uuid) "
                + "AND action IN ('CRITERE_NON_APPLICABLE', 'CRITERE_RETIRE_PERIMETRE')", critere.auditCritereId());
    }

    private String url(Contexte ctx) {
        return "/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId();
    }

    /** PUT de la décision, corps JSON brut pour pouvoir envoyer un motif absent. */
    private io.restassured.response.Response exclure(Contexte ctx, String jeton, String auditCritereId, String corps) {
        return given()
                .header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(corps)
                .when().put(url(ctx) + "/criteres/" + auditCritereId + "/perimetre");
    }

    private static String corps(boolean actif, boolean applicable, String motif) {
        return "{\"actif\":" + actif + ",\"applicable\":" + applicable + ",\"motif\":"
                + (motif == null ? "null" : "\"" + motif + "\"") + "}";
    }

    private void exclureNonApplicable(Contexte ctx, Critere critere, String motif) {
        exclure(ctx, ctx.jetonAdmin(), critere.auditCritereId(), corps(true, false, motif)).then().statusCode(200);
    }

    private void exclureRetire(Contexte ctx, Critere critere, String motif) {
        exclure(ctx, ctx.jetonAdmin(), critere.auditCritereId(), corps(false, true, motif)).then().statusCode(200);
    }

    private JsonPath score(Contexte ctx) {
        return given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get(url(ctx) + "/score")
                .then().statusCode(200)
                .extract().jsonPath();
    }

    private byte[] rapport(Contexte ctx, String type, String format) {
        String jeton = "DETAILLE".equals(type) ? ctx.jetonAdmin() : ctx.token();
        String rapportId = given()
                .header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(Map.of("type", type, "format", format))
                .when().post(url(ctx) + "/rapports")
                .then().statusCode(201)
                .extract().path("id");
        return given()
                .header("Authorization", "Bearer " + jeton)
                .when().get(url(ctx) + "/rapports/" + rapportId + "/telechargement")
                .then().statusCode(200)
                .extract().asByteArray();
    }

    private String csv(Contexte ctx, String type) {
        return new String(rapport(ctx, type, "CSV"), StandardCharsets.UTF_8);
    }

    private static List<String> lignes(String csv) {
        return Arrays.asList(csv.split("\\R"));
    }

    private static String ligneCritere(String csv, Critere critere) {
        List<String> trouvees = lignes(csv).stream().filter(l -> l.contains(";" + critere.code() + ";")).toList();
        assertEquals(1, trouvees.size(), "une ligne attendue pour " + critere.code() + " : " + trouvees);
        return trouvees.get(0);
    }

    private static String textePdfCompact(byte[] pdf) throws Exception {
        PdfReader lecteur = new PdfReader(pdf);
        StringBuilder texte = new StringBuilder();
        PdfTextExtractor extracteur = new PdfTextExtractor(lecteur);
        for (int page = 1; page <= lecteur.getNumberOfPages(); page++) {
            texte.append(extracteur.getTextFromPage(page));
        }
        lecteur.close();
        return texte.toString().replaceAll("\\s+", "");
    }

    /** Les drapeaux « actif|applicable » du critère, lus par GET /criteres (AuditCritereDto). */
    private String drapeauxDto(Contexte ctx, Critere critere) {
        JsonPath json = given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get(url(ctx) + "/criteres")
                .then().statusCode(200)
                .extract().jsonPath();
        int index = json.getList("id").indexOf(critere.auditCritereId());
        assertTrue(index >= 0, "critère absent de GET /criteres");
        return json.getBoolean("[" + index + "].actif") + "|" + json.getBoolean("[" + index + "].applicable");
    }

    /** L'identifiant de la première question du critère, dans l'ordre de GET /questions. */
    private String premiereQuestion(Contexte ctx, Critere critere) {
        String id = given().header("Authorization", "Bearer " + ctx.token())
                .when().get(url(ctx) + "/criteres/" + critere.auditCritereId() + "/questions")
                .then().statusCode(200).extract().path("questions[0].auditQuestionId");
        assertNotNull(id, "le critère porte au moins une question");
        return id;
    }

    private static EvaluerCritereResponseDto reponseNeutre() {
        return new EvaluerCritereResponseDto(
                UUID.randomUUID(), 0.8, 0.8, true, "Analyse de décor RG35",
                List.of(), false, null, null, false, null);
    }

    // === T1 — actif + applicable + évalué : score réel ======================

    @Test
    void t1_critereActifApplicableEvalue_scoreReel() {
        Contexte ctx = contexte();
        List<Critere> c = criteresDeFin(ctx, 2);
        analyseIa(ctx, c.get(0), "VALIDEE", "0.9500", 5, 10);

        // Une exclusion ailleurs dans la mission ne touche pas au score réel.
        exclureNonApplicable(ctx, c.get(1), "Critère sans objet pour ce site");

        JsonPath json = score(ctx);
        assertEquals(1, json.getInt("nombreCriteresEvalues"));
        assertEquals(5.0000, json.getDouble("scoreGlobal"), 0.00005);
        String csv = csv(ctx, "SYNTHESE");
        assertTrue(lignes(csv).contains("Score global;5.00/5"), "score réel attendu : " + csv);
        assertTrue(ligneCritere(csv(ctx, "DETAILLE"), c.get(0)).contains(";5;0.95;VALIDEE;IA"), "détail : score réel");
    }

    // === T2 — actif + applicable + non évalué : « — » (B11-2) ===============

    @Test
    void t2_critereActifApplicableNonEvalue_absenceResteTiret() {
        Contexte ctx = contexte();
        List<Critere> c = criteresDeFin(ctx, 2);
        exclureRetire(ctx, c.get(1), "Retiré après cadrage");

        JsonPath json = score(ctx);
        assertEquals(0, json.getInt("nombreCriteresEvalues"));
        String synthese = csv(ctx, "SYNTHESE");
        assertTrue(lignes(synthese).contains("Score global;—"), "« Score global;— » attendu");
        assertFalse(synthese.contains("0.00/5"), "une absence de score n'est jamais 0.00/5");

        String detaille = csv(ctx, "DETAILLE");
        String ligne = ligneCritere(detaille, c.get(0));
        assertTrue(ligne.contains(";A_EVALUER;—;—;—;—"), "critère non évalué : « — » conservé " + ligne);
        assertFalse(ligne.contains(NON_APPLICABLE) || ligne.contains(RETIRE), "un non évalué n'est pas exclu " + ligne);
    }

    // === T3 — applicable=false : Non applicable ============================

    @Test
    void t3_nonApplicable_horsScoreHorsTotalLibelleAucuneIaAucuneEvaluation() throws Exception {
        Contexte ctx = contexte();
        List<Critere> c = criteresDeFin(ctx, 2);
        Critere evalue = c.get(0);
        Critere exclu = c.get(1);
        analyseIa(ctx, evalue, "VALIDEE", "0.9500", 5, 10);
        analyseIa(ctx, exclu, "VALIDEE", "0.1000", 1, 5);

        JsonPath avant = score(ctx);
        int totalAvant = avant.getInt("nombreCriteresTotal");
        assertEquals(2, avant.getInt("nombreCriteresEvalues"));
        assertEquals(3.0000, avant.getDouble("scoreGlobal"), 0.00005);

        exclure(ctx, ctx.jetonAdmin(), exclu.auditCritereId(), corps(true, false, "Aucun rejet aqueux sur le site"))
                .then().statusCode(200)
                .body("actif", org.hamcrest.Matchers.equalTo(true))
                .body("applicable", org.hamcrest.Matchers.equalTo(false));

        // Hors score, hors total.
        JsonPath apres = score(ctx);
        assertEquals(totalAvant - 1, apres.getInt("nombreCriteresTotal"));
        assertEquals(1, apres.getInt("nombreCriteresEvalues"));
        assertEquals(5.0000, apres.getDouble("scoreGlobal"), 0.00005);
        assertEquals(totalAvant - 1, given().header("Authorization", "Bearer " + ctx.token())
                .when().get(url(ctx)).then().statusCode(200).extract().jsonPath().getInt("nombreCriteres"),
                "AuditDto.nombreCriteres suit le périmètre du score");
        assertEquals("true|false", drapeauxDto(ctx, exclu), "AuditCritereDto expose l'exclusion");

        // Libellé dans les rapports, jamais « — » ni 0, ni l'ancienne note.
        String ligne = ligneCritere(csv(ctx, "DETAILLE"), exclu);
        assertTrue(ligne.contains(";3.0;Non applicable;Non applicable;;;"), "CSV : « Non applicable » attendu " + ligne);
        assertFalse(ligne.contains(";1;0.10;"), "CSV : l'ancienne évaluation n'est pas présentée " + ligne);
        assertTrue(textePdfCompact(rapport(ctx, "DETAILLE", "PDF")).contains("Nonapplicable"), "PDF : « Non applicable »");

        // Aucune IA, aucune nouvelle évaluation.
        given().header("Authorization", "Bearer " + ctx.jetonAdmin()).contentType(ContentType.JSON).body("{}")
                .when().post(url(ctx) + "/criteres/" + exclu.auditCritereId() + "/evaluations")
                .then().statusCode(409)
                .body("message", org.hamcrest.Matchers.containsString(NON_APPLICABLE));
        assertEquals(1, evaluations(exclu));
        assertFalse(analyseMissionService.criteresAAnalyser(UUID.fromString(ctx.auditId())).stream()
                .anyMatch(ac -> ac.getId().toString().equals(exclu.auditCritereId())), "passe de mission : critère exclu");
        verifyNoInteractions(iaEvaluationClient, iaEvaluationClientV2);
    }

    // === T4 — actif=false : Retiré du périmètre ============================

    @Test
    void t4_retirePerimetre_horsScoreHorsTotalLibelleAucuneIaAucuneEvaluation() throws Exception {
        Contexte ctx = contexte();
        List<Critere> c = criteresDeFin(ctx, 2);
        Critere evalue = c.get(0);
        Critere exclu = c.get(1);
        analyseIa(ctx, evalue, "VALIDEE", "0.9500", 5, 10);
        analyseIa(ctx, exclu, "VALIDEE", "0.3000", 2, 5);
        int totalAvant = score(ctx).getInt("nombreCriteresTotal");

        exclure(ctx, ctx.jetonAdmin(), exclu.auditCritereId(), corps(false, true, "Retiré du périmètre contractuel"))
                .then().statusCode(200)
                .body("actif", org.hamcrest.Matchers.equalTo(false))
                .body("applicable", org.hamcrest.Matchers.equalTo(true));

        JsonPath apres = score(ctx);
        assertEquals(totalAvant - 1, apres.getInt("nombreCriteresTotal"));
        assertEquals(1, apres.getInt("nombreCriteresEvalues"));
        assertEquals(5.0000, apres.getDouble("scoreGlobal"), 0.00005);

        String ligne = ligneCritere(csv(ctx, "DETAILLE"), exclu);
        assertTrue(ligne.contains(";3.0;Retiré du périmètre;Retiré du périmètre;;;"), "CSV : « Retiré du périmètre » " + ligne);
        assertTrue(textePdfCompact(rapport(ctx, "DETAILLE", "PDF")).contains("Retirédupérimètre"), "PDF : libellé");

        given().header("Authorization", "Bearer " + ctx.jetonAdmin()).contentType(ContentType.JSON).body("{}")
                .when().post(url(ctx) + "/criteres/" + exclu.auditCritereId() + "/evaluations")
                .then().statusCode(409).body("message", org.hamcrest.Matchers.containsString(RETIRE));
        given().header("Authorization", "Bearer " + ctx.jetonAdmin()).contentType(ContentType.JSON).body("{}")
                .when().post(url(ctx) + "/criteres/" + exclu.auditCritereId() + "/evaluations/v2")
                .then().statusCode(409).body("message", org.hamcrest.Matchers.containsString(RETIRE));
        assertEquals(1, evaluations(exclu));
        verifyNoInteractions(iaEvaluationClient, iaEvaluationClientV2);
    }

    // === T5 — motif obligatoire, états incohérents ==========================

    @Test
    void t5_motifObligatoire_etEtatsIncoherentsRefusesSansJournal() {
        Contexte ctx = contexte();
        Critere critere = criteresDeFin(ctx, 1).get(0);
        String etatInitial = etat(critere);
        assertEquals("true|true|A_EVALUER|", etatInitial);

        for (String motif : Arrays.asList(null, "", "   ")) {
            exclure(ctx, ctx.jetonAdmin(), critere.auditCritereId(), corps(true, false, motif))
                    .then().statusCode(400);
            assertEquals(etatInitial, etat(critere), "motif " + motif + " : aucune modification");
        }
        // actif=true + applicable=true n'est pas une exclusion ; les deux à false confondraient deux motifs.
        exclure(ctx, ctx.jetonAdmin(), critere.auditCritereId(), corps(true, true, "Pas une exclusion"))
                .then().statusCode(400);
        exclure(ctx, ctx.jetonAdmin(), critere.auditCritereId(), corps(false, false, "Deux exclusions"))
                .then().statusCode(400);
        exclure(ctx, ctx.jetonAdmin(), critere.auditCritereId(), "{\"motif\":\"Drapeaux absents\"}")
                .then().statusCode(400);
        assertEquals(etatInitial, etat(critere));
        assertEquals(0, journauxExclusion(critere), "aucun journal d'exclusion pour une requête refusée");

        exclure(ctx, ctx.jetonAdmin(), critere.auditCritereId(), corps(true, false, "  Motif valide  "))
                .then().statusCode(200);
        assertEquals("true|false|A_EVALUER|", etat(critere));
        assertEquals(1, journauxExclusion(critere));
        Object[] journal = (Object[]) scalaire(
                "SELECT action, utilisateur_id::text, entreprise_id::text, details->>'motif', details->>'auditId', "
                        + "details->>'critereCode', details->>'ancienActif', details->>'ancienApplicable', "
                        + "details->>'nouveauActif', details->>'nouveauApplicable', created_at IS NOT NULL "
                        + "FROM audit_log WHERE entite = 'audit_critere' AND entite_id = CAST(?1 AS uuid)",
                critere.auditCritereId());
        assertEquals("CRITERE_NON_APPLICABLE", journal[0]);
        assertEquals(ctx.adminId(), journal[1], "acteur");
        assertEquals(ctx.entrepriseId(), journal[2]);
        assertEquals("Motif valide", journal[3], "motif tracé, espaces retirés");
        assertEquals(ctx.auditId(), journal[4], "mission");
        assertEquals(critere.code(), journal[5], "critère");
        assertEquals(List.of("true", "true", "true", "false"), List.of(journal[6], journal[7], journal[8], journal[9]),
                "ancienne et nouvelle valeur");
        assertEquals(true, journal[10], "date");

        // Déjà exclu : conflit, pas de second journal.
        exclure(ctx, ctx.jetonAdmin(), critere.auditCritereId(), corps(false, true, "Seconde décision"))
                .then().statusCode(409);
        assertEquals("true|false|A_EVALUER|", etat(critere));
        assertEquals(1, journauxExclusion(critere));
    }

    // === T6 — autorisation (D1) et introuvables ============================

    @Test
    void t6_autorisation_seulPersonnelInterneSmartex() {
        Contexte ctx = contexte();
        List<Critere> c = criteresDeFin(ctx, 2);
        Critere critere = c.get(0);
        String etatInitial = etat(critere);

        // RESPONSABLE_ENTREPRISE (créateur de l'entreprise, RG05).
        exclure(ctx, ctx.token(), critere.auditCritereId(), corps(true, false, "Tentative responsable"))
                .then().statusCode(403);

        // COLLABORATEUR rattaché à l'entreprise auditée.
        var collaborateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        QuarkusTransaction.requiringNew().run(() -> utilisateurEntrepriseRepository.persist(new UtilisateurEntreprise(
                utilisateurRepository.findById(UUID.fromString(collaborateur.id)),
                entrepriseRepository.findById(UUID.fromString(ctx.entrepriseId())),
                null, roleRepository.parCode("COLLABORATEUR").orElseThrow())));
        String jetonCollaborateur = given().contentType(ContentType.JSON)
                .body(Map.of("email", collaborateur.email, "motDePasse", collaborateur.motDePasse))
                .when().post("/api/v1/auth/connexion").then().statusCode(200).extract().path("token");
        exclure(ctx, jetonCollaborateur, critere.auditCritereId(), corps(true, false, "Tentative collaborateur"))
                .then().statusCode(403);

        // Responsable d'une autre entreprise : isolation multi-tenant.
        var autre = UtilisateurDeTest.creerEtConnecter(jwtService);
        given().header("Authorization", "Bearer " + autre.token).contentType(ContentType.JSON)
                .body(Map.of("raisonSociale", "Autre entreprise RG35", "identifiantLegal", "RCCM-RG35-AUTRE-" + UUID.randomUUID(),
                        "formuleCode", "AVANCEES"))
                .when().post("/api/v1/entreprises").then().statusCode(201);
        exclure(ctx, autre.token, critere.auditCritereId(), corps(true, false, "Tentative autre entreprise"))
                .then().statusCode(403);

        assertEquals(etatInitial, etat(critere), "aucune modification par un rôle refusé");
        assertEquals(0, journauxExclusion(critere));

        // ADMIN_AUDIT : autorisé par contrat (ROLES_INTERNES_SMARTEX), mais le rôle
        // est désactivé depuis V44 et ne peut plus être attribué — pas de compte réel.
        assertTrue(AutorisationService.ROLES_INTERNES_SMARTEX.contains("ADMIN_AUDIT"));
        assertTrue(AutorisationService.ROLES_INTERNES_SMARTEX.contains("SUPER_ADMIN"));
        assertFalse(AutorisationService.ROLES_INTERNES_SMARTEX.contains("RESPONSABLE_ENTREPRISE"));
        assertFalse(AutorisationService.ROLES_INTERNES_SMARTEX.contains("COLLABORATEUR"));
        assertEquals("INACTIF", scalaire("SELECT statut::text FROM role WHERE code = 'ADMIN_AUDIT'"));

        // SUPER_ADMIN : autorisé.
        exclure(ctx, ctx.jetonAdmin(), critere.auditCritereId(), corps(true, false, "Décision SUPER_ADMIN"))
                .then().statusCode(200);
        assertEquals(1, journauxExclusion(critere));

        // Introuvables : critère inconnu, mission inconnue, critère d'une autre mission.
        exclure(ctx, ctx.jetonAdmin(), UUID.randomUUID().toString(), corps(true, false, "Critère inconnu"))
                .then().statusCode(404);
        given().header("Authorization", "Bearer " + ctx.jetonAdmin()).contentType(ContentType.JSON)
                .body(corps(true, false, "Mission inconnue"))
                .when().put("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + UUID.randomUUID()
                        + "/criteres/" + c.get(1).auditCritereId() + "/perimetre")
                .then().statusCode(404);
        String autreAudit = nouvelAudit(ctx.token(), ctx.entrepriseId());
        given().header("Authorization", "Bearer " + ctx.jetonAdmin()).contentType(ContentType.JSON)
                .body(corps(true, false, "Critère d'une autre mission"))
                .when().put("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + autreAudit
                        + "/criteres/" + c.get(1).auditCritereId() + "/perimetre")
                .then().statusCode(404);
        assertEquals("true|true|A_EVALUER|", etat(c.get(1)));
    }

    // === T7 — mission TERMINE (D2) =========================================

    @Test
    void t7_missionTermine_refusSansModificationNiJournal() {
        Contexte ctx = contexte();
        List<Critere> c = criteresDeFin(ctx, 2);
        Critere critere = c.get(0);
        String etatInitial = etat(critere);

        for (String statut : List.of("TERMINE", "ANNULE")) {
            poserStatutMission(ctx, statut);
            exclure(ctx, ctx.jetonAdmin(), critere.auditCritereId(), corps(true, false, "Après clôture"))
                    .then().statusCode(409);
            exclure(ctx, ctx.jetonAdmin(), critere.auditCritereId(), corps(false, true, "Après clôture"))
                    .then().statusCode(409);
            assertEquals(etatInitial, etat(critere), statut + " : aucune modification");
            assertEquals(0, journauxExclusion(critere), statut + " : aucun journal");
        }

        // BROUILLON et EN_COURS restent modifiables.
        poserStatutMission(ctx, "EN_COURS");
        exclureNonApplicable(ctx, critere, "Mission en cours");
        poserStatutMission(ctx, "BROUILLON");
        exclureRetire(ctx, c.get(1), "Mission en brouillon");
        assertEquals(1, journauxExclusion(critere));
        assertEquals(1, journauxExclusion(c.get(1)));
    }

    // === T8 — IA unitaire sur critère exclu ================================

    @Test
    void t8_iaUnitaireSurCritereExclu_refusAucuneEvaluation() {
        Contexte ctx = contexte();
        List<Critere> c = criteresDeFin(ctx, 3);
        Critere actif = c.get(0);
        Critere nonApplicable = c.get(1);
        Critere retire = c.get(2);
        // Matière à analyser sur les trois : seul le périmètre fait la différence.
        c.forEach(critere -> poserScenario(critere, "Scénario RG35 " + critere.code()));
        analyseIa(ctx, retire, "EN_REVUE", "0.6000", 3, 5);
        poserStatutMission(ctx, "EN_COURS");
        exclureNonApplicable(ctx, nonApplicable, "Sans objet");
        exclureRetire(ctx, retire, "Hors contrat");
        String evaluationEnRevue = (String) scalaire(
                "SELECT id::text FROM evaluation WHERE audit_critere_id = CAST(?1 AS uuid)", retire.auditCritereId());

        for (Critere exclu : List.of(nonApplicable, retire)) {
            long avant = evaluations(exclu);
            for (String chemin : List.of("/evaluations", "/evaluations/v2")) {
                given().header("Authorization", "Bearer " + ctx.jetonAdmin()).contentType(ContentType.JSON).body("{}")
                        .when().post(url(ctx) + "/criteres/" + exclu.auditCritereId() + chemin)
                        .then().statusCode(409);
            }
            // Le service lui-même, appelé comme le fait la passe de mission.
            var resultat = QuarkusTransaction.requiringNew().call(() -> analyseCritereService.analyser(
                    auditRepository.findById(UUID.fromString(ctx.auditId())),
                    auditCritereRepository.findById(UUID.fromString(exclu.auditCritereId()))));
            assertTrue(resultat instanceof AnalyseCritereService.Resultat.HorsPerimetre, "résultat : " + resultat);
            assertEquals(avant, evaluations(exclu), "aucune évaluation créée");
        }

        // Valider une évaluation en revue d'un critère exclu : refusé, elle reste en revue.
        given().header("Authorization", "Bearer " + ctx.jetonAdmin()).contentType(ContentType.JSON).body("{}")
                .when().post(url(ctx) + "/criteres/" + retire.auditCritereId() + "/evaluations/" + evaluationEnRevue + "/validation")
                .then().statusCode(409);
        assertEquals("EN_REVUE", scalaire("SELECT statut::text FROM evaluation WHERE id = CAST(?1 AS uuid)", evaluationEnRevue));
        verifyNoInteractions(iaEvaluationClient, iaEvaluationClientV2);

        // Contrôle : le critère actif et applicable reste analysable.
        when(iaEvaluationClient.evaluerCritere(any())).thenReturn(reponseNeutre());
        given().header("Authorization", "Bearer " + ctx.jetonAdmin()).contentType(ContentType.JSON).body("{}")
                .when().post(url(ctx) + "/criteres/" + actif.auditCritereId() + "/evaluations")
                .then().statusCode(201);
        assertEquals(1, evaluations(actif));
        Mockito.verify(iaEvaluationClient, Mockito.times(1)).evaluerCritere(any());
    }

    // === T9 — saisie sur critère exclu =====================================

    @Test
    void t9_saisieSurCritereExclu_refusHistoriqueConserve() {
        Contexte ctx = contexte();
        Critere critere = criteresDeFin(ctx, 1).get(0);
        String questions = url(ctx) + "/criteres/" + critere.auditCritereId() + "/questions";
        String auditQuestionId = premiereQuestion(ctx, critere);
        poserReponseHistorique(auditQuestionId, 2);
        exclureNonApplicable(ctx, critere, "Sans objet");
        String etatExclu = etat(critere);

        given().header("Authorization", "Bearer " + ctx.token()).contentType(ContentType.JSON)
                .body(Map.of("scenario", "Saisie après exclusion",
                        "reponses", List.of(Map.of("auditQuestionId", auditQuestionId, "niveau", 4))))
                .when().put(questions)
                .then().statusCode(409)
                .body("message", org.hamcrest.Matchers.containsString(NON_APPLICABLE));

        assertEquals(etatExclu, etat(critere), "ni scénario ni statut modifiés");
        assertEquals(1, reponses(critere), "réponse historique conservée, aucune nouvelle");
        assertEquals(2L, nombre("SELECT r.niveau FROM reponse_question r JOIN audit_question aq ON aq.id = r.audit_question_id "
                + "WHERE aq.audit_critere_id = CAST(?1 AS uuid)", critere.auditCritereId()), "niveau historique inchangé");
        // Toujours consultable.
        given().header("Authorization", "Bearer " + ctx.token()).when().get(questions)
                .then().statusCode(200).body("questions[0].niveau", org.hamcrest.Matchers.equalTo(2));
    }

    // === T10 — réponse NON_APPLICABLE ======================================

    @Test
    void t10_reponseNonApplicable_refusAucuneIaAucunScore() {
        Contexte ctx = contexte();
        Critere critere = criteresDeFin(ctx, 1).get(0);
        String questions = url(ctx) + "/criteres/" + critere.auditCritereId() + "/questions";
        String auditQuestionId = premiereQuestion(ctx, critere);
        JsonPath scoreAvant = score(ctx);

        given().header("Authorization", "Bearer " + ctx.token()).contentType(ContentType.JSON)
                .body(Map.of("scenario", "Déclaré non applicable",
                        "reponses", List.of(Map.of("auditQuestionId", auditQuestionId, "valeur", "NON_APPLICABLE"))))
                .when().put(questions)
                .then().statusCode(400);

        assertEquals("true|true|A_EVALUER|", etat(critere), "ni DECLARE ni scénario : la requête est refusée en entier");
        assertEquals(0, reponses(critere));
        assertFalse(analyseMissionService.criteresEnAttenteDAnalyse(UUID.fromString(ctx.auditId())).stream()
                .anyMatch(ac -> ac.getId().toString().equals(critere.auditCritereId())), "rien n'attend l'IA");
        JsonPath scoreApres = score(ctx);
        assertEquals(scoreAvant.getInt("nombreCriteresEvalues"), scoreApres.getInt("nombreCriteresEvalues"));
        assertEquals(scoreAvant.getInt("nombreCriteresTotal"), scoreApres.getInt("nombreCriteresTotal"));
        assertEquals(0, evaluations(critere));
        verifyNoInteractions(iaEvaluationClient, iaEvaluationClientV2);

        // L'énumération historique et le type SQL gardent la valeur.
        assertEquals(ValeurReponse.NON_APPLICABLE, ValeurReponse.valueOf("NON_APPLICABLE"));
        assertEquals(1L, nombre("SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid "
                + "WHERE t.typname = 'valeur_reponse' AND e.enumlabel = 'NON_APPLICABLE'"));

        // Contrôle : une saisie normale reste acceptée.
        given().header("Authorization", "Bearer " + ctx.token()).contentType(ContentType.JSON)
                .body(Map.of("reponses", List.of(Map.of("auditQuestionId", auditQuestionId, "niveau", 3))))
                .when().put(questions)
                .then().statusCode(200);
        assertEquals("true|true|DECLARE|", etat(critere));
    }

    // === T11 — mission mixte ===============================================

    @Test
    void t11_missionMixte_totalEvaluesNonEvaluesScoreProgressionRapports() throws Exception {
        Contexte ctx = contexte();
        List<Critere> c = criteresDeFin(ctx, 4);
        Critere evalue = c.get(0);
        Critere nonEvalue = c.get(1);
        Critere nonApplicable = c.get(2);
        Critere retire = c.get(3);
        analyseIa(ctx, evalue, "VALIDEE", "0.9500", 5, 10);
        analyseIa(ctx, nonApplicable, "VALIDEE", "0.1000", 1, 10);
        analyseIa(ctx, retire, "VALIDEE", "0.3000", 2, 10);

        JsonPath avant = score(ctx);
        int total = avant.getInt("nombreCriteresTotal");
        assertEquals(3, avant.getInt("nombreCriteresEvalues"));
        assertEquals(2.6667, avant.getDouble("scoreGlobal"), 0.00005, "(5×3 + 1×3 + 2×3) / 9 avant exclusion");

        exclureNonApplicable(ctx, nonApplicable, "Sans objet");
        exclureRetire(ctx, retire, "Hors contrat");

        JsonPath apres = score(ctx);
        int totalApres = total - 2;
        assertEquals(totalApres, apres.getInt("nombreCriteresTotal"), "total");
        assertEquals(1, apres.getInt("nombreCriteresEvalues"), "évalués");
        assertEquals(0, apres.getInt("nombreCriteresEnRevue"));
        assertEquals(totalApres - 1, apres.getInt("nombreCriteresNonEvalues"), "non évalués");
        assertEquals(5.0000, apres.getDouble("scoreGlobal"), 0.00005, "score");
        // Progression telle que l'affichent SyntheseMission / la liste des missions :
        // évalués / nombreCriteresTotal, le dénominateur ne comptant pas les exclus.
        assertEquals(Math.round(100.0 / totalApres), Math.round(apres.getInt("nombreCriteresEvalues") * 100.0
                / apres.getInt("nombreCriteresTotal")));
        assertEquals(totalApres, given().header("Authorization", "Bearer " + ctx.token())
                .when().get(url(ctx)).then().statusCode(200).extract().jsonPath().getInt("nombreCriteres"));
        int domaineTotal = apres.getList("domaines.nombreCriteresTotal", Integer.class).stream().mapToInt(Integer::intValue).sum();
        assertEquals(totalApres, domaineTotal, "somme des totaux par domaine = périmètre");

        for (String type : List.of("SYNTHESE", "DETAILLE")) {
            String csv = csv(ctx, type);
            assertTrue(lignes(csv).contains("Score global;5.00/5"), type + " : score");
            assertTrue(lignes(csv).contains("Critères évalués;1/" + totalApres), type + " : évalués/total");
            assertTrue(lignes(csv).contains("Non évalués;" + (totalApres - 1)), type + " : non évalués");
        }
        String detaille = csv(ctx, "DETAILLE");
        assertTrue(ligneCritere(detaille, evalue).contains(";5;0.95;VALIDEE;IA"), "évalué : score réel");
        assertTrue(ligneCritere(detaille, nonEvalue).contains(";A_EVALUER;—;—;—;—"), "non évalué : —");
        assertTrue(ligneCritere(detaille, nonApplicable).contains(";Non applicable;Non applicable;;;"), "non applicable");
        assertTrue(ligneCritere(detaille, retire).contains(";Retiré du périmètre;Retiré du périmètre;;;"), "retiré");
        String pdf = textePdfCompact(rapport(ctx, "DETAILLE", "PDF"));
        assertTrue(pdf.contains("Nonapplicable") && pdf.contains("Retirédupérimètre"), "PDF : deux libellés");
        assertTrue(pdf.contains("Évalués:1/" + totalApres), "PDF : compteur évalués");
    }

    // === T12 — historique ==================================================

    @Test
    void t12_historique_evaluationReponseEtJournauxConserves() {
        Contexte ctx = contexte();
        List<Critere> c = criteresDeFin(ctx, 2);
        Critere critere = c.get(0);
        analyseIa(ctx, critere, "VALIDEE", "0.7000", 3, 30);
        poserReponseHistorique(premiereQuestion(ctx, critere), 3);
        poserStatutMission(ctx, "EN_COURS");
        Object[] evaluationAvant = (Object[]) scalaire(
                "SELECT id::text, note, probabilite_conforme::text, statut::text, source::text, date_evaluation::text "
                        + "FROM evaluation WHERE audit_critere_id = CAST(?1 AS uuid)", critere.auditCritereId());
        long journauxAvant = nombre("SELECT count(*) FROM audit_log WHERE entreprise_id = CAST(?1 AS uuid)", ctx.entrepriseId());
        long historiqueAvant = nombre("SELECT count(*) FROM score_historique WHERE audit_id = CAST(?1 AS uuid)", ctx.auditId());

        exclureRetire(ctx, critere, "Retiré après revue du contrat");

        Object[] evaluationApres = (Object[]) scalaire(
                "SELECT id::text, note, probabilite_conforme::text, statut::text, source::text, date_evaluation::text "
                        + "FROM evaluation WHERE audit_critere_id = CAST(?1 AS uuid)", critere.auditCritereId());
        assertEquals(Arrays.asList(evaluationAvant), Arrays.asList(evaluationApres), "ancienne évaluation conservée, inchangée");
        assertEquals(1, reponses(critere), "réponse conservée");
        assertEquals(journauxAvant + 1, nombre("SELECT count(*) FROM audit_log WHERE entreprise_id = CAST(?1 AS uuid)",
                ctx.entrepriseId()), "journaux antérieurs conservés, une entrée ajoutée");
        assertEquals(historiqueAvant, nombre("SELECT count(*) FROM score_historique WHERE audit_id = CAST(?1 AS uuid)",
                ctx.auditId()), "score_historique ni effacé ni réécrit par l'exclusion");
        // Toujours lisible par l'API.
        given().header("Authorization", "Bearer " + ctx.jetonAdmin())
                .when().get(url(ctx) + "/criteres/" + critere.auditCritereId() + "/evaluations")
                .then().statusCode(200).body("size()", org.hamcrest.Matchers.equalTo(1));
    }

    // === Atomicité (D3) ====================================================

    @Test
    void atomicite_echecDuJournal_aucuneModificationPersistee() {
        Contexte ctx = contexte();
        Critere critere = criteresDeFin(ctx, 1).get(0);
        String etatInitial = etat(critere);

        AuditLogService journalEnEchec = Mockito.mock(AuditLogService.class);
        doThrow(new IllegalStateException("journal indisponible (test RG35)"))
                .when(journalEnEchec).journaliserAvecDetails(any(), any(), any(), any(), any(), any());
        QuarkusMock.installMockForType(journalEnEchec, AuditLogService.class);

        exclure(ctx, ctx.jetonAdmin(), critere.auditCritereId(), corps(true, false, "Journal en échec"))
                .then().statusCode(500);
        assertEquals(etatInitial, etat(critere), "le drapeau n'est pas persisté sans son journal");
        assertEquals(0, journauxExclusion(critere));
    }
}
