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
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * V74-C3-B11 — un rapport ne présente jamais une absence de score comme un
 * score nul.
 *
 * <p>Ce que ces tests protègent : sans critère évalué, le moteur rend un score
 * de 0 (ensemble vide), alors qu'un score réel vaut au moins 1. Les rapports
 * SYNTHESE et DÉTAILLÉ imprimaient ce 0 comme un score — « 0.00/5 » en CSV,
 * « 0.00 » en rouge en PDF — pour la mission comme pour chaque domaine non
 * évalué. Ils écrivent désormais « — », en encre atténuée et sans « / 5 » en
 * PDF, d'après le compteur {@code nombreCriteresEvalues} déjà porté par le
 * score. Les vrais scores, les compteurs, les probabilités et l'avancement ne
 * changent pas ; une dernière analyse IA en revue ne fait pas revenir un score
 * plus ancien.
 *
 * <p>Décor : mission Avancées sur SMARTEX_SUSTWAY, critères de fin de
 * catalogue (jamais D1-01 ni D1-02), évaluations posées en base de test comme
 * dans SourceEvaluationIaTest. Aucun bailleur n'est utilisé.
 */
@QuarkusTest
class ScoreAbsentRapportTest {

    /** RapportGenerationService : BRAND (vert, ≥ 4) et ENCRE_ATTENUEE. */
    private static final int[] BRAND = {18, 130, 87};
    private static final int[] ENCRE_ATTENUEE = {100, 116, 139};

    /**
     * « — » tel qu'OpenPDF 3.0.5 l'écrit dans le flux : une chaîne à deux octets
     * par glyphe, 0x07 0xE0, lue ici en ISO-8859-1. Constaté sur les PDF générés
     * et sur un document minimal ; l'extraction de texte le restitue en U+2014,
     * ce que les tests vérifient aussi.
     */
    private static final String TIRET_PDF = "\u0007\u00E0";

    private static final List<String> TYPES = List.of("SYNTHESE", "DETAILLE");

    @Inject JwtService jwtService;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntityManager entityManager;

    private record Contexte(String token, String entrepriseId, String auditId, String jetonAdmin) {
    }

    private record Critere(String id, String code, String domaineCode) {
    }

    private record Domaine(String code, int evalues, int total) {
    }

    // --- Construction ---------------------------------------------------

    private Contexte contexte() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Score Absent V74-C3-B11",
                        "identifiantLegal", "RCCM-SCABS-" + UUID.randomUUID(),
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
                        "nom", "Audit Score Absent V74-C3-B11",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201)
                .extract().path("id");

        String jetonAdmin = UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository, utilisateurEntrepriseRepository).token;
        return new Contexte(utilisateur.token, entrepriseId, auditId, jetonAdmin);
    }

    /** Le dernier critère actif et applicable de la mission (D6-93 aujourd'hui), avec son domaine. */
    private Critere critereDeFin(Contexte ctx) {
        Critere critere = QuarkusTransaction.requiringNew().call(() -> {
            Object[] ligne = (Object[]) entityManager.createNativeQuery(
                            "SELECT c.id::text, c.code, d.code FROM audit_critere ac "
                                    + "JOIN critere c ON c.id = ac.critere_id JOIN domaine d ON d.id = c.domaine_id "
                                    + "WHERE ac.audit_id = CAST(?1 AS uuid) AND ac.actif AND ac.applicable "
                                    + "ORDER BY d.ordre DESC, c.code DESC LIMIT 1")
                    .setParameter(1, ctx.auditId())
                    .getSingleResult();
            return new Critere((String) ligne[0], (String) ligne[1], (String) ligne[2]);
        });
        assertFalse(List.of("D1-01", "D1-02").contains(critere.code()),
                "les tests ne doivent pas marquer les premiers critères du catalogue : " + critere.code());
        return critere;
    }

    /** Analyse IA datée de {@code minutesAvant} minutes, coefficient 3 ; validée, elle porte son validateur. */
    private void analyseIa(Contexte ctx, Critere critere, String statut, String probabilite, int note, int minutesAvant) {
        boolean validee = "VALIDEE".equals(statut);
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery(
                            "UPDATE audit_critere SET coefficient_ponderation = 3, criticite_id = "
                                    + "coalesce(criticite_id, (SELECT id FROM criticite ORDER BY poids DESC LIMIT 1)) "
                                    + "WHERE audit_id = CAST(?1 AS uuid) AND critere_id = CAST(?2 AS uuid)")
                    .setParameter(1, ctx.auditId()).setParameter(2, critere.id())
                    .executeUpdate();
            entityManager.createNativeQuery(
                            "INSERT INTO evaluation (audit_critere_id, probabilite_conforme, note, source, statut, "
                                    + "contrat_version, justification, date_evaluation, validee_par, validee_le) "
                                    + "SELECT ac.id, CAST(?3 AS numeric), CAST(?4 AS smallint), 'IA', "
                                    + "CAST(?5 AS statut_evaluation), '2.0', 'Analyse IA fictive de test.', "
                                    + "now() - make_interval(mins => ?6), "
                                    + "CASE WHEN ?7 THEN a.created_by END, CASE WHEN ?7 THEN now() END "
                                    + "FROM audit_critere ac JOIN audit a ON a.id = ac.audit_id "
                                    + "WHERE ac.audit_id = CAST(?1 AS uuid) AND ac.critere_id = CAST(?2 AS uuid)")
                    .setParameter(1, ctx.auditId()).setParameter(2, critere.id())
                    .setParameter(3, probabilite).setParameter(4, note)
                    .setParameter(5, statut).setParameter(6, minutesAvant).setParameter(7, validee)
                    .executeUpdate();
        });
    }

    private JsonPath score(Contexte ctx) {
        return given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/score")
                .then().statusCode(200)
                .extract().jsonPath();
    }

    private List<Domaine> domaines(Contexte ctx) {
        JsonPath json = score(ctx);
        List<Domaine> domaines = new ArrayList<>();
        for (int i = 0; i < json.getList("domaines").size(); i++) {
            domaines.add(new Domaine(json.getString("domaines[" + i + "].domaineCode"),
                    json.getInt("domaines[" + i + "].nombreCriteresEvalues"),
                    json.getInt("domaines[" + i + "].nombreCriteresTotal")));
        }
        assertTrue(domaines.size() > 1, "la mission doit porter plusieurs domaines");
        return domaines;
    }

    /** DÉTAILLÉ exige rapport:detaille (SUPER_ADMIN) ; la synthèse est générée par le responsable. */
    private byte[] rapport(Contexte ctx, String type, String format) {
        String jeton = "DETAILLE".equals(type) ? ctx.jetonAdmin() : ctx.token();
        String rapportId = given()
                .header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(Map.of("type", type, "format", format))
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

    private String csv(Contexte ctx, String type) {
        return new String(rapport(ctx, type, "CSV"), StandardCharsets.UTF_8);
    }

    private static List<String> lignes(String csv) {
        return Arrays.asList(csv.split("\\R"));
    }

    /** La ligne de score d'un domaine : « nom;code;score;évalués;total ». */
    private static String ligneDomaine(String csv, Domaine d) {
        List<String> trouvees = lignes(csv).stream()
                .filter(l -> l.contains(";" + d.code() + ";") && l.endsWith(";" + d.evalues() + ";" + d.total()))
                .toList();
        assertEquals(1, trouvees.size(), "une ligne de score attendue pour le domaine " + d.code() + " : " + trouvees);
        return trouvees.get(0);
    }

    private static String contenuPage1(byte[] pdf) throws Exception {
        PdfReader lecteur = new PdfReader(pdf);
        String contenu = new String(lecteur.getPageContent(1), StandardCharsets.ISO_8859_1);
        lecteur.close();
        return contenu;
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

    private static final Pattern REMPLISSAGE_RGB = Pattern.compile("(-?[0-9.]+) (-?[0-9.]+) (-?[0-9.]+) rg\\b");

    /** Couleur (0-255) de chaque chaîne {@code (texte)} de la première page, dans l'ordre du flux. */
    private static List<int[]> couleursDe(String contenu, String texte) {
        List<int[]> couleurs = new ArrayList<>();
        String cible = "(" + texte + ")";
        for (int i = contenu.indexOf(cible); i >= 0; i = contenu.indexOf(cible, i + 1)) {
            Matcher m = REMPLISSAGE_RGB.matcher(contenu.substring(0, i));
            int[] derniere = null;
            while (m.find()) {
                derniere = new int[] {
                        Math.round(Float.parseFloat(m.group(1)) * 255),
                        Math.round(Float.parseFloat(m.group(2)) * 255),
                        Math.round(Float.parseFloat(m.group(3)) * 255)};
            }
            assertTrue(derniere != null, "aucune couleur RGB avant " + cible);
            couleurs.add(derniere);
        }
        return couleurs;
    }

    private static boolean proche(int[] couleur, int[] reference) {
        for (int k = 0; k < 3; k++) {
            if (Math.abs(couleur[k] - reference[k]) > 3) {
                return false;
            }
        }
        return true;
    }

    private static String rgb(int[] c) {
        return "(" + c[0] + "," + c[1] + "," + c[2] + ")";
    }

    /** Les {@code n} premiers « — » de la page 1 sont en encre atténuée (carte puis table des domaines). */
    private static void premiersTiretsAttenues(String contenu, int n, String contexte) {
        List<int[]> tirets = couleursDe(contenu, TIRET_PDF);
        assertTrue(tirets.size() >= n, contexte + " : " + n + " « — » attendus au moins, obtenu " + tirets.size());
        for (int i = 0; i < n; i++) {
            assertTrue(proche(tirets.get(i), ENCRE_ATTENUEE),
                    contexte + " : « — » n° " + (i + 1) + " attendu en encre atténuée " + rgb(ENCRE_ATTENUEE) + ", obtenu " + rgb(tirets.get(i)));
        }
    }

    // === T1 — score réel =====================================================

    @Test
    void t1_missionEvaluee_leScoreReelResteImprimeCommeAvant() throws Exception {
        Contexte ctx = contexte();
        Critere critere = critereDeFin(ctx);
        analyseIa(ctx, critere, "VALIDEE", "0.9200", 5, 60);
        Domaine evalue = domaines(ctx).stream().filter(d -> d.code().equals(critere.domaineCode())).findFirst().orElseThrow();
        assertEquals(1, evalue.evalues());

        for (String type : TYPES) {
            String csv = csv(ctx, type);
            assertTrue(lignes(csv).contains("Score global;5.00/5"), type + " CSV : score global réel attendu");
            assertTrue(ligneDomaine(csv, evalue).contains(";" + evalue.code() + ";5.00;1;"), type + " CSV : score réel du domaine");

            byte[] pdf = rapport(ctx, type, "PDF");
            String contenu = contenuPage1(pdf);
            List<int[]> cinq = couleursDe(contenu, "5.00");
            assertEquals(2, cinq.size(), type + " PDF : 5.00 attendu sur la carte et dans la table des domaines");
            for (int[] c : cinq) {
                assertTrue(proche(c, BRAND), type + " PDF : 5.00 attendu en vert " + rgb(BRAND) + ", obtenu " + rgb(c));
            }
            assertTrue(contenu.contains("( / 5)"), type + " PDF : la carte d'un score réel garde « / 5 »");
        }
    }

    // === T2 — mission sans évaluation ========================================

    @Test
    void t2_missionSansEvaluation_absenceJamaisImprimeeCommeZero() throws Exception {
        Contexte ctx = contexte();
        List<Domaine> domaines = domaines(ctx);
        assertEquals(0, score(ctx).getInt("nombreCriteresEvalues"));

        for (String type : TYPES) {
            String csv = csv(ctx, type);
            assertTrue(lignes(csv).contains("Score global;—"), type + " CSV : « Score global;— » attendu");
            assertFalse(csv.contains("0.00/5"), type + " CSV : 0.00/5 imprimé pour une absence");
            for (Domaine d : domaines) {
                assertTrue(ligneDomaine(csv, d).contains(";" + d.code() + ";—;0;" + d.total()), type + " CSV : domaine " + d.code());
            }

            byte[] pdf = rapport(ctx, type, "PDF");
            String contenu = contenuPage1(pdf);
            assertTrue(couleursDe(contenu, "0.00").isEmpty(), type + " PDF : 0.00 imprimé pour une absence");
            assertFalse(contenu.contains("( / 5)"), type + " PDF : « / 5 » imprimé sur une carte sans score");
            premiersTiretsAttenues(contenu, 1 + domaines.size(), type + " PDF");
            String texte = textePdfCompact(pdf);
            assertFalse(texte.contains("0.00"), type + " PDF : 0.00 dans le texte extrait");
            // L'extracteur ne suit pas l'ordre visuel des cellules : la position
            // du « — » est vérifiée dans le flux, sa lecture ici.
            assertTrue(texte.contains("—"), type + " PDF : « — » restitué U+2014 par l'extraction de texte");
        }
    }

    // === T3 et T6 — domaine non évalué, mission mixte ========================

    @Test
    void t3_t6_missionMixte_domaineEvalueScoreReel_domaineNonEvalueAbsence() throws Exception {
        Contexte ctx = contexte();
        Critere critere = critereDeFin(ctx);
        analyseIa(ctx, critere, "VALIDEE", "0.9200", 5, 60);
        List<Domaine> domaines = domaines(ctx);
        List<Domaine> nonEvalues = domaines.stream().filter(d -> d.evalues() == 0).toList();
        Domaine evalue = domaines.stream().filter(d -> d.evalues() > 0).findFirst().orElseThrow();
        assertEquals(domaines.size() - 1, nonEvalues.size(), "un seul domaine évalué attendu");

        for (String type : TYPES) {
            String csv = csv(ctx, type);
            assertTrue(ligneDomaine(csv, evalue).contains(";" + evalue.code() + ";5.00;1;"), type + " CSV : domaine évalué");
            for (Domaine d : nonEvalues) {
                String ligne = ligneDomaine(csv, d);
                assertTrue(ligne.contains(";" + d.code() + ";—;0;" + d.total()), type + " CSV : domaine non évalué " + ligne);
            }
            assertTrue(lignes(csv).contains("Score global;5.00/5"), type + " CSV : score global réel");

            String contenu = contenuPage1(rapport(ctx, type, "PDF"));
            assertTrue(couleursDe(contenu, "0.00").isEmpty(), type + " PDF : domaine non évalué imprimé 0.00");
            // La carte porte 5.00 : les « — » qui suivent sont les domaines non évalués.
            premiersTiretsAttenues(contenu, nonEvalues.size(), type + " PDF");
            for (int[] c : couleursDe(contenu, "5.00")) {
                assertTrue(proche(c, BRAND), type + " PDF : score réel du domaine hors vert " + rgb(c));
            }
        }
    }

    // === T4 — dernière analyse IA en revue ===================================

    @Test
    void t4_derniereIaEnRevue_absenceSansRepliSurLAncienneAnalyseValidee() throws Exception {
        Contexte ctx = contexte();
        Critere critere = critereDeFin(ctx);
        analyseIa(ctx, critere, "VALIDEE", "0.9200", 5, 120);
        analyseIa(ctx, critere, "EN_REVUE", "0.4000", 2, 60);
        JsonPath json = score(ctx);
        assertEquals(0, json.getInt("nombreCriteresEvalues"));
        assertEquals(1, json.getInt("nombreCriteresEnRevue"));

        for (String type : TYPES) {
            String csv = csv(ctx, type);
            assertTrue(lignes(csv).contains("Score global;—"), type + " CSV : absence attendue, pas de repli");
            assertTrue(lignes(csv).contains("En revue experte;1"), type + " CSV : compteur « en revue » conservé");
            assertFalse(csv.contains("5.00"), type + " CSV : score de l'ancienne analyse validée restitué");

            byte[] pdf = rapport(ctx, type, "PDF");
            String contenu = contenuPage1(pdf);
            assertTrue(couleursDe(contenu, "5.00").isEmpty(), type + " PDF : score de l'ancienne analyse restitué");
            assertFalse(contenu.contains("( / 5)"), type + " PDF : « / 5 » sur une carte sans score");
            premiersTiretsAttenues(contenu, 1, type + " PDF (carte)");
            assertTrue(textePdfCompact(pdf).contains("Enrevueexperte:1"), type + " PDF : compteur « en revue » conservé");
        }

        // Le détail par critère restitue toujours la dernière analyse et son statut.
        String detaille = csv(ctx, "DETAILLE");
        List<String> ligneCritere = lignes(detaille).stream().filter(l -> l.contains(";" + critere.code() + ";")).toList();
        assertEquals(1, ligneCritere.size());
        assertTrue(ligneCritere.get(0).contains(";2;0.40;EN_REVUE;IA"), "détail : dernière analyse en revue restituée " + ligneCritere);
    }

    // === T5 — vrais zéros ======================================================

    @Test
    void t5_vraisZeros_compteursProbabiliteNiveauEtAvancementRestentZero() throws Exception {
        Contexte ctx = contexte();
        int total = score(ctx).getInt("nombreCriteresTotal");

        // Compteurs d'une mission neuve : de vrais zéros.
        for (String type : TYPES) {
            String csv = csv(ctx, type);
            assertTrue(lignes(csv).contains("Critères évalués;0/" + total), type + " CSV : compteur évalués");
            assertTrue(lignes(csv).contains("En revue experte;0"), type + " CSV : compteur en revue");
            assertTrue(lignes(csv).contains("Non évalués;" + total), type + " CSV : compteur non évalués");
            assertTrue(textePdfCompact(rapport(ctx, type, "PDF")).contains("Évalués:0/" + total), type + " PDF : compteur évalués");
        }

        // Probabilité réelle de 0 : niveau 1, probabilité 0.00, score réel 1.00.
        Critere critere = critereDeFin(ctx);
        analyseIa(ctx, critere, "VALIDEE", "0.0000", 1, 60);
        String detaille = csv(ctx, "DETAILLE");
        List<String> ligneCritere = lignes(detaille).stream().filter(l -> l.contains(";" + critere.code() + ";")).toList();
        assertEquals(1, ligneCritere.size());
        assertTrue(ligneCritere.get(0).contains(";1;0.00;VALIDEE;IA"), "détail : niveau 1 et probabilité 0.00 conservés " + ligneCritere);
        assertTrue(lignes(detaille).contains("Score global;1.00/5"), "score réel minimal 1.00");

        // Avancement d'un plan sans action terminée : 0 %.
        String urlPlans = "/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/plans-action";
        String planId = given().header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "PLAN-B11 avancement nul", "dateEcheance", "2026-12-31"))
                .when().post(urlPlans).then().statusCode(201).extract().path("id");
        given().header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "ACTION-B11 non commencée"))
                .when().post(urlPlans + "/" + planId + "/actions").then().statusCode(201);
        assertTrue(csv(ctx, "DETAILLE").contains("Avancement;0%"), "avancement réel de 0 % conservé");
    }
}
