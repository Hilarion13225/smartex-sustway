package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.RoleRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.path.json.JsonPath;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.openpdf.text.pdf.PdfReader;
import org.openpdf.text.pdf.parser.PdfTextExtractor;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * V74-C1 — seule la dernière analyse IA fait la note, partout où une note est
 * calculée ou restituée : score global, indice de préparation, rapport
 * détaillé et liste de l'indice.
 *
 * <p>Ce que ces tests protègent : depuis V38, une déclaration de
 * l'organisation (évaluation EXPERT) ne remplace plus l'analyse IA. Le score
 * global appliquait déjà la règle ; l'indice et les rapports lisaient encore
 * « la dernière évaluation, toutes sources ». Une organisation pouvait donc
 * voir, dans son rapport ou son indice bailleur, un niveau déclaré que le score
 * avait écarté.
 *
 * <p>La règle éprouvée est exactement celle d'AuditScoreService : la dernière
 * évaluation IA, par date. Une EXPERT n'est jamais lue ; une dernière IA non
 * validée rend le critère non retenu, sans repli sur une IA validée plus
 * ancienne.
 *
 * <p>Chiffres : le critère éprouvé porte un coefficient 3. Une analyse IA à
 * 0,92 donne le niveau 5 (score 5), une déclaration à 0,40 le niveau 2
 * (score 2) — lire la mauvaise source se voit au premier chiffre.
 *
 * <p>Décor : mission Avancées sur SMARTEX_SUSTWAY 2.1, critères de fin de
 * catalogue (jamais D1-01 ni D1-02, voir IndicePreparationJustificationTest),
 * bailleurs fictifs {@code ZZTEST_*}, jamais IFC_SFI. Dates d'évaluation
 * distinctes : la méthode de sélection n'a pas de second critère de tri.
 */
@QuarkusTest
class SourceEvaluationIaTest {

    @Inject JwtService jwtService;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntityManager entityManager;

    private record Contexte(String token, String entrepriseId, String auditId, String jetonAdmin) {
    }

    private record Critere(String id, String code) {
    }

    // --- Construction ---------------------------------------------------

    private Contexte contexte() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Source IA V74-C1",
                        "identifiantLegal", "RCCM-SRCIA-" + UUID.randomUUID(),
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
                        "nom", "Audit Source IA V74-C1",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201)
                .extract().path("id");

        String jetonAdmin = UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository, utilisateurEntrepriseRepository).token;
        return new Contexte(utilisateur.token, entrepriseId, auditId, jetonAdmin);
    }

    /** Critère actif et applicable de fin de catalogue : rang 0 = le dernier (D6-93), rang 1 = D6-92. */
    private Critere critereDeFin(Contexte ctx, int rang) {
        Critere critere = QuarkusTransaction.requiringNew().call(() -> {
            Object[] ligne = (Object[]) entityManager.createNativeQuery(
                            "SELECT c.id::text, c.code FROM audit_critere ac "
                                    + "JOIN critere c ON c.id = ac.critere_id JOIN domaine d ON d.id = c.domaine_id "
                                    + "WHERE ac.audit_id = CAST(?1 AS uuid) AND ac.actif AND ac.applicable "
                                    + "ORDER BY d.ordre DESC, c.code DESC OFFSET ?2 LIMIT 1")
                    .setParameter(1, ctx.auditId())
                    .setParameter(2, rang)
                    .getSingleResult();
            return new Critere((String) ligne[0], (String) ligne[1]);
        });
        assertFalse(List.of("D1-01", "D1-02").contains(critere.code()),
                "les tests ne doivent pas marquer les premiers critères du catalogue : " + critere.code());
        return critere;
    }

    /** Coefficient 3 et criticité renseignée, comme le ferait la mission. */
    private void preparer(Contexte ctx, Critere critere) {
        QuarkusTransaction.requiringNew().run(() -> entityManager.createNativeQuery(
                        "UPDATE audit_critere SET coefficient_ponderation = 3, criticite_id = "
                                + "coalesce(criticite_id, (SELECT id FROM criticite ORDER BY poids DESC LIMIT 1)) "
                                + "WHERE audit_id = CAST(?1 AS uuid) AND critere_id = CAST(?2 AS uuid)")
                .setParameter(1, ctx.auditId()).setParameter(2, critere.id())
                .executeUpdate());
    }

    /**
     * Pose une évaluation datée de {@code minutesAvant} minutes. L'IA porte un
     * contrat V2 et, validée, son validateur ; la déclaration EXPERT, forme
     * historique, n'en porte pas.
     */
    private void evaluation(Contexte ctx, Critere critere, String source, String statut,
                            String probabilite, int note, int minutesAvant, String justification) {
        boolean ia = "IA".equals(source);
        boolean validee = "VALIDEE".equals(statut);
        QuarkusTransaction.requiringNew().run(() -> entityManager.createNativeQuery(
                        "INSERT INTO evaluation (audit_critere_id, probabilite_conforme, note, source, statut, "
                                + "contrat_version, justification, date_evaluation, validee_par, validee_le) "
                                + "SELECT ac.id, CAST(?3 AS numeric), CAST(?4 AS smallint), "
                                + "CAST(?5 AS source_evaluation), CAST(?6 AS statut_evaluation), CAST(?7 AS varchar), CAST(?8 AS text), "
                                + "now() - make_interval(mins => ?9), "
                                + "CASE WHEN ?10 THEN a.created_by END, CASE WHEN ?10 THEN now() END "
                                + "FROM audit_critere ac JOIN audit a ON a.id = ac.audit_id "
                                + "WHERE ac.audit_id = CAST(?1 AS uuid) AND ac.critere_id = CAST(?2 AS uuid)")
                .setParameter(1, ctx.auditId()).setParameter(2, critere.id())
                .setParameter(3, probabilite).setParameter(4, note)
                .setParameter(5, source).setParameter(6, statut)
                .setParameter(7, ia ? "2.0" : null).setParameter(8, justification)
                .setParameter(9, minutesAvant).setParameter(10, validee)
                .executeUpdate());
    }

    /** Un bailleur fictif, le mapping du critère et sa justification EXACTE validée (périmètre V74-B). */
    private String bailleurJustifie(Contexte ctx, Critere critere) {
        String code = "ZZTEST_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        QuarkusTransaction.requiringNew().run(() -> entityManager.createNativeQuery(
                        "INSERT INTO bailleur (code, nom, description) VALUES (?1, ?2, ?3)")
                .setParameter(1, code)
                .setParameter(2, "Bailleur fictif de test")
                .setParameter(3, "Décor de test V74-C1, sans valeur réglementaire.")
                .executeUpdate());
        given()
                .header("Authorization", "Bearer " + ctx.jetonAdmin())
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", code, "applicable", true))
                .when().put("/api/v1/referentiels/criteres/" + critere.id() + "/bailleur")
                .then().statusCode(200);
        String url = "/api/v1/referentiels/criteres/" + critere.id() + "/bailleur/" + code + "/justification";
        String id = given()
                .header("Authorization", "Bearer " + ctx.jetonAdmin())
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "documentNom", "Document fictif de test",
                        "documentEdition", "Édition de test",
                        "documentOrganisme", "Organisme fictif",
                        "referenceOfficielle", "REF-TEST-C1",
                        "texteSource", "Passage fictif rédigé pour le test.",
                        "correspondance", "EXACTE",
                        "justification", "Justification fictive de test."))
                .when().post(url)
                .then().statusCode(201)
                .extract().path("id");
        given()
                .header("Authorization", "Bearer " + ctx.jetonAdmin())
                .when().post(url + "/" + id + "/validation")
                .then().statusCode(200);
        return code;
    }

    private JsonPath scoreGlobal(Contexte ctx) {
        return given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/score")
                .then().statusCode(200)
                .extract().jsonPath();
    }

    private JsonPath indice(Contexte ctx, String bailleur) {
        return given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", bailleur))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                .then().statusCode(200)
                .extract().jsonPath();
    }

    private byte[] rapport(Contexte ctx, String jeton, String type, String format, String bailleur) {
        Map<String, String> corps = bailleur == null
                ? Map.of("type", type, "format", format)
                : Map.of("type", type, "format", format, "bailleurCode", bailleur);
        String rapportId = given()
                .header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(corps)
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/rapports")
                .then().statusCode(201)
                .extract().path("id");
        return given()
                .header("Authorization", "Bearer " + jeton)
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId()
                        + "/rapports/" + rapportId + "/telechargement")
                .then().statusCode(200)
                .extract().asByteArray();
    }

    /** Texte d'un PDF, espaces et retours supprimés : les cellules d'une ligne s'y lisent bout à bout. */
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

    /** Cellules de la ligne CSV du critère : {@code colonneCode} vaut 1 pour le rapport détaillé, 0 pour l'indice. */
    private static String[] ligneCsv(byte[] csv, String code, int colonneCode) {
        List<String[]> lignes = Arrays.stream(new String(csv, StandardCharsets.UTF_8).split("\\R"))
                .map(l -> l.split(";", -1))
                // Repérée par la cellule égale au code, où qu'elle soit : un
                // point-virgule dans un nom de domaine décalerait les colonnes.
                // Les valeurs d'évaluation se lisent ensuite depuis la fin.
                .filter(c -> Arrays.asList(c).contains(code))
                .toList();
        assertEquals(1, lignes.size(), "une seule ligne attendue pour " + code);
        return lignes.get(0);
    }

    private static String depuisLaFin(String[] cellules, int rang) {
        return cellules[cellules.length - rang];
    }

    /** Critère de fin : analyse IA validée à 0,92, puis déclaration EXPERT validée à 0,40, plus récente. */
    private Critere decorIaPuisExpertPlusRecente(Contexte ctx, String declaration) {
        Critere critere = critereDeFin(ctx, 0);
        preparer(ctx, critere);
        evaluation(ctx, critere, "IA", "VALIDEE", "0.9200", 5, 120, "Analyse IA fictive de test.");
        evaluation(ctx, critere, "EXPERT", "VALIDEE", "0.4000", 2, 60, declaration);
        return critere;
    }

    // === T1a — IA validée, EXPERT plus récente : score global et indice ======

    @Test
    void t1a_uneDeclarationExpertPlusRecente_neRemplacePasLAnalyseIa_niDansLeScore_niDansLIndice() {
        Contexte ctx = contexte();
        Critere critere = decorIaPuisExpertPlusRecente(ctx, "Déclaration fictive de l'organisation.");
        String bailleur = bailleurJustifie(ctx, critere);

        JsonPath score = scoreGlobal(ctx);
        assertEquals(5.0f, score.getFloat("scoreGlobal"), "score global : niveau IA 5, pas le 2 déclaré");
        assertEquals(1, score.getInt("nombreCriteresEvalues"));

        JsonPath indice = indice(ctx, bailleur);
        assertEquals("CALCULE", indice.getString("statut"));
        assertEquals(5.0f, indice.getFloat("score"), "indice : niveau IA 5, pas le 2 déclaré");
        assertEquals(1, indice.getInt("nombreCriteresTagues"));
        assertEquals(1, indice.getInt("nombreCriteresRetenus"));
    }

    // === T1b — rapport détaillé : source IA, déclaration non restituée =======

    @Test
    void t1b_leRapportDetaille_restitueLAnalyseIa_etJamaisLaDeclarationExpert() throws Exception {
        Contexte ctx = contexte();
        String declaration = "DECLARATION-ORG-" + UUID.randomUUID();
        Critere critere = decorIaPuisExpertPlusRecente(ctx, declaration);

        // SUPER_ADMIN : le rapport porte la colonne Justification, là où une
        // déclaration restituée par erreur apparaîtrait.
        byte[] csv = rapport(ctx, ctx.jetonAdmin(), "DETAILLE", "CSV", null);
        String[] ligne = ligneCsv(csv, critere.code(), 1);
        assertEquals("5", depuisLaFin(ligne, 5), "niveau");
        assertEquals("0.92", depuisLaFin(ligne, 4), "probabilité");
        assertEquals("VALIDEE", depuisLaFin(ligne, 3), "statut évaluation");
        assertEquals("IA", depuisLaFin(ligne, 2), "source");
        assertFalse(new String(csv, StandardCharsets.UTF_8).contains(declaration), "CSV : déclaration restituée");
        assertFalse(new String(csv, StandardCharsets.UTF_8).contains("EXPERT"), "CSV : source EXPERT restituée");

        String pdf = textePdfCompact(rapport(ctx, ctx.jetonAdmin(), "DETAILLE", "PDF", null));
        assertTrue(pdf.contains("5VALIDEEIA"), "PDF : niveau 5, VALIDEE, source IA attendus");
        assertFalse(pdf.contains("EXPERT"), "PDF : source EXPERT restituée");
        assertFalse(pdf.contains(declaration), "PDF : déclaration restituée");
    }

    // === T1c — listes de l'indice ===========================================

    @Test
    void t1c_lesListesDeLIndice_restituentLeNiveauIa() throws Exception {
        Contexte ctx = contexte();
        Critere critere = decorIaPuisExpertPlusRecente(ctx, "Déclaration fictive de l'organisation.");
        String bailleur = bailleurJustifie(ctx, critere);

        String[] ligne = ligneCsv(rapport(ctx, ctx.token(), "INDICE_FINANCEMENTS_VERTS", "CSV", bailleur), critere.code(), 0);
        assertEquals("5", depuisLaFin(ligne, 3), "niveau");
        assertEquals("0.92", depuisLaFin(ligne, 2), "probabilité");
        assertEquals("VALIDEE", depuisLaFin(ligne, 1), "statut évaluation");

        String pdf = textePdfCompact(rapport(ctx, ctx.token(), "INDICE_FINANCEMENTS_VERTS", "PDF", bailleur));
        assertTrue(pdf.contains("5VALIDEE"), "PDF indice : niveau IA 5 attendu");
        assertFalse(pdf.contains("2VALIDEE"), "PDF indice : niveau déclaré 2 restitué");
    }

    // === T2 — EXPERT seule ==================================================

    /** Sans analyse IA, le critère n'est ni noté ni retenu ; son statut de critère reste affiché. */
    @Test
    void t2_uneDeclarationExpertSeule_neRetientPasLeCritere() throws Exception {
        Contexte ctx = contexte();
        Critere critere = critereDeFin(ctx, 1);
        preparer(ctx, critere);
        String declaration = "DECLARATION-SEULE-" + UUID.randomUUID();
        evaluation(ctx, critere, "EXPERT", "VALIDEE", "0.9200", 5, 60, declaration);
        String bailleur = bailleurJustifie(ctx, critere);

        JsonPath score = scoreGlobal(ctx);
        assertEquals(0, score.getInt("nombreCriteresEvalues"));
        assertEquals(0.0f, score.getFloat("scoreGlobal"));

        JsonPath indice = indice(ctx, bailleur);
        assertEquals("SANS_EVALUATION", indice.getString("statut"));
        assertNull(indice.get("score"));
        assertEquals(1, indice.getInt("nombreCriteresTagues"));
        assertEquals(0, indice.getInt("nombreCriteresRetenus"));

        String[] detaille = ligneCsv(rapport(ctx, ctx.jetonAdmin(), "DETAILLE", "CSV", null), critere.code(), 1);
        assertEquals("—", depuisLaFin(detaille, 5), "niveau");
        assertEquals("—", depuisLaFin(detaille, 4), "probabilité");
        assertEquals("—", depuisLaFin(detaille, 3), "statut évaluation");
        assertEquals("—", depuisLaFin(detaille, 2), "source");
        assertEquals("", depuisLaFin(detaille, 1), "justification");
        assertNotEquals("—", depuisLaFin(detaille, 6), "le statut du critère reste affiché");
        assertFalse(depuisLaFin(detaille, 6).isBlank(), "le statut du critère reste affiché");

        String[] liste = ligneCsv(rapport(ctx, ctx.token(), "INDICE_FINANCEMENTS_VERTS", "CSV", bailleur), critere.code(), 0);
        assertEquals("—", depuisLaFin(liste, 3), "niveau");
        assertEquals("—", depuisLaFin(liste, 1), "statut évaluation");

        String pdf = textePdfCompact(rapport(ctx, ctx.jetonAdmin(), "DETAILLE", "PDF", null));
        assertFalse(pdf.contains("EXPERT"), "PDF : source EXPERT restituée");
        assertFalse(pdf.contains("VALIDEE"), "PDF : aucune évaluation ne doit apparaître comme validée");
        assertFalse(pdf.contains(declaration), "PDF : déclaration restituée");
    }

    // === T3 — EXPERT plus ancienne ==========================================

    @Test
    void t3_uneDeclarationExpertPlusAncienne_laisseLAnalyseIaFaireLaNote() {
        Contexte ctx = contexte();
        Critere critere = critereDeFin(ctx, 0);
        preparer(ctx, critere);
        evaluation(ctx, critere, "EXPERT", "VALIDEE", "0.4000", 2, 120, "Déclaration fictive de l'organisation.");
        evaluation(ctx, critere, "IA", "VALIDEE", "0.9200", 5, 60, "Analyse IA fictive de test.");
        String bailleur = bailleurJustifie(ctx, critere);

        assertEquals(5.0f, scoreGlobal(ctx).getFloat("scoreGlobal"));
        JsonPath indice = indice(ctx, bailleur);
        assertEquals("CALCULE", indice.getString("statut"));
        assertEquals(5.0f, indice.getFloat("score"));
    }

    // === T4 — deux analyses IA ==============================================

    /** La plus récente l'emporte, même moins favorable : c'est l'ordre des dates, pas la meilleure note. */
    @Test
    void t4_deuxAnalysesIaValidees_laPlusRecenteFaitLaNote() {
        Contexte ctx = contexte();
        Critere critere = critereDeFin(ctx, 0);
        preparer(ctx, critere);
        evaluation(ctx, critere, "IA", "VALIDEE", "0.9200", 5, 120, "Analyse IA ancienne.");
        evaluation(ctx, critere, "IA", "VALIDEE", "0.4000", 2, 60, "Analyse IA récente.");
        String bailleur = bailleurJustifie(ctx, critere);

        assertEquals(2.0f, scoreGlobal(ctx).getFloat("scoreGlobal"));
        JsonPath indice = indice(ctx, bailleur);
        assertEquals("CALCULE", indice.getString("statut"));
        assertEquals(2.0f, indice.getFloat("score"));
        String[] ligne = ligneCsv(rapport(ctx, ctx.token(), "INDICE_FINANCEMENTS_VERTS", "CSV", bailleur), critere.code(), 0);
        assertEquals("2", depuisLaFin(ligne, 3), "niveau de l'analyse la plus récente");
    }

    // === T6 — AMB-1 : dernière IA en revue, sans repli =====================

    /**
     * La dernière analyse est en revue : le critère n'est pas retenu, et
     * l'analyse validée plus ancienne n'est pas reprise — comme dans le score
     * global, qui compte le critère « en revue ».
     */
    @Test
    void t6_derniereAnalyseEnRevue_neRetientPasLeCritere_sansRepliSurUneIaValideeAncienne() {
        Contexte ctx = contexte();
        Critere critere = critereDeFin(ctx, 0);
        preparer(ctx, critere);
        evaluation(ctx, critere, "IA", "VALIDEE", "0.9200", 5, 120, "Analyse IA ancienne validée.");
        evaluation(ctx, critere, "IA", "EN_REVUE", "0.4000", 2, 60, "Analyse IA récente en revue.");
        String bailleur = bailleurJustifie(ctx, critere);

        JsonPath score = scoreGlobal(ctx);
        assertEquals(0, score.getInt("nombreCriteresEvalues"));
        assertEquals(1, score.getInt("nombreCriteresEnRevue"));
        assertEquals(0.0f, score.getFloat("scoreGlobal"));

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", bailleur))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                .then().statusCode(200)
                .body("statut", equalTo("SANS_EVALUATION"))
                .body("score", nullValue())
                .body("nombreCriteresTagues", equalTo(1))
                .body("nombreCriteresRetenus", equalTo(0));

        String[] ligne = ligneCsv(rapport(ctx, ctx.token(), "INDICE_FINANCEMENTS_VERTS", "CSV", bailleur), critere.code(), 0);
        assertEquals("2", depuisLaFin(ligne, 3), "la liste restitue la dernière analyse, pas l'ancienne validée");
        assertEquals("EN_REVUE", depuisLaFin(ligne, 1));
    }
}
