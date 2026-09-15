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
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * V74-C2 — les rapports de l'indice nomment chaque nombre pour ce qu'il compte.
 *
 * <p>Ce que ces tests protègent : depuis V74-B, un critère « tagué » pour un
 * bailleur ne compte que si sa correspondance est justifiée. Les rapports
 * parlaient encore de critères « applicables » ou « tagués » pour trois
 * nombres différents, et annonçaient « aucun critère tagué » à un bailleur qui
 * en portait. Trois périmètres emboîtés sont désormais restitués :
 * <ul>
 *   <li>A : critères rattachés au bailleur, {@code nombreCriteresTagues} ;</li>
 *   <li>B_m : critères de la mission à correspondance justifiée, la liste du
 *       rapport ;</li>
 *   <li>C : critères pris en compte dans le score,
 *       {@code nombreCriteresRetenus}.</li>
 * </ul>
 * Seuls les libellés changent : statuts, compteurs JSON et formule restent
 * ceux de V73/V74-B/V74-C1.
 *
 * <p>Décor : mission Avancées sur SMARTEX_SUSTWAY, critères de fin de
 * catalogue (jamais D1-01 ni D1-02), bailleurs fictifs {@code ZZTEST_*} propres
 * à chaque cas, jamais IFC_SFI.
 */
@QuarkusTest
class IndiceRapportLibellesTest {

    private static final String LIGNE_A = "Critères rattachés à ce bailleur (mapping applicable, tous référentiels)";
    private static final String LIGNE_B = "Critères de cette mission à correspondance justifiée";
    private static final String LIGNE_C = "Critères pris en compte dans le score (correspondance justifiée, dernière analyse IA validée)";
    private static final String LIGNE_INDICE = "Indice de préparation";

    private static final String NON_CALCULABLE = "Mapping non disponible — aucun critère rattaché à ce bailleur, "
            + "source officielle requise ; aucun financement recommandé sur ce référentiel";
    private static final String SANS_JUSTIFICATION =
            "En attente — aucun critère de cette mission n'a de correspondance justifiée et validée avec ce bailleur";
    private static final String SANS_ANALYSE_VALIDEE =
            "En attente — aucun critère justifié de cette mission n'a encore de dernière analyse IA validée";
    private static final String ANCIEN_SANS_EVALUATION = "aucun critère de cette mission n'est encore validé";

    private static final String VIDE_NON_CALCULABLE = "Aucun critère n'est encore tagué comme applicable à ce bailleur.";
    private static final String VIDE_SANS_JUSTIFICATION =
            "Des critères sont rattachés à ce bailleur, mais aucun critère de cette mission n'a de correspondance justifiée et validée.";
    private static final String AVERTISSEMENT =
            "Cet indice mesure un alignement avec les critères dont la correspondance avec ce bailleur est justifiée "
                    + "et validée, pas une garantie d'éligibilité au financement.";

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
                        "raisonSociale", "Entreprise Libellés Indice V74-C2",
                        "identifiantLegal", "RCCM-LIBIDX-" + UUID.randomUUID(),
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
                        "nom", "Audit Libellés Indice V74-C2",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201)
                .extract().path("id");

        String jetonAdmin = UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository, utilisateurEntrepriseRepository).token;
        return new Contexte(utilisateur.token, entrepriseId, auditId, jetonAdmin);
    }

    /** Critère actif et applicable de fin de catalogue : rang 0 = le dernier (D6-93 aujourd'hui). */
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

    /** Pose une analyse IA de coefficient 3, datée de {@code minutesAvant} minutes. */
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

    private String nouveauBailleur() {
        String code = "ZZTEST_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        QuarkusTransaction.requiringNew().run(() -> entityManager.createNativeQuery(
                        "INSERT INTO bailleur (code, nom, description) VALUES (?1, ?2, ?3)")
                .setParameter(1, code)
                .setParameter(2, "Bailleur fictif de test")
                .setParameter(3, "Décor de test V74-C2, sans valeur réglementaire.")
                .executeUpdate());
        return code;
    }

    private void mapper(Contexte ctx, Critere critere, String bailleur) {
        given()
                .header("Authorization", "Bearer " + ctx.jetonAdmin())
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", bailleur, "applicable", true))
                .when().put("/api/v1/referentiels/criteres/" + critere.id() + "/bailleur")
                .then().statusCode(200);
    }

    /** Justification EXACTE validée : le mapping entre dans le périmètre V74-B. */
    private void justifier(Contexte ctx, Critere critere, String bailleur) {
        String url = "/api/v1/referentiels/criteres/" + critere.id() + "/bailleur/" + bailleur + "/justification";
        String id = given()
                .header("Authorization", "Bearer " + ctx.jetonAdmin())
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "documentNom", "Document fictif de test",
                        "documentEdition", "Édition de test",
                        "documentOrganisme", "Organisme fictif",
                        "referenceOfficielle", "REF-TEST-C2",
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
    }

    private JsonPath calculer(Contexte ctx, String bailleur) {
        return given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", bailleur))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                .then().statusCode(200)
                .extract().jsonPath();
    }

    /** L'indice de ce bailleur tel que la liste REST le restitue. */
    private Map<String, Object> indiceListe(Contexte ctx, String bailleur) {
        List<Map<String, Object>> indices = given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                .then().statusCode(200)
                .extract().jsonPath().getList("$");
        List<Map<String, Object>> duBailleur = indices.stream().filter(i -> bailleur.equals(i.get("bailleurCode"))).toList();
        assertEquals(1, duBailleur.size(), "un seul indice attendu pour " + bailleur);
        return duBailleur.get(0);
    }

    private byte[] rapport(Contexte ctx, String bailleur, String format) {
        String rapportId = given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("type", "INDICE_FINANCEMENTS_VERTS", "format", format, "bailleurCode", bailleur))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/rapports")
                .then().statusCode(201)
                .extract().path("id");
        return given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId()
                        + "/rapports/" + rapportId + "/telechargement")
                .then().statusCode(200)
                .extract().asByteArray();
    }

    private static String texte(byte[] csv) {
        return new String(csv, StandardCharsets.UTF_8);
    }

    /** Valeur d'une ligne {@code libellé;valeur} du CSV, lue après le premier séparateur. */
    private static String valeurCsv(String csv, String libelle) {
        List<String> lignes = Arrays.stream(csv.split("\\R")).filter(l -> l.startsWith(libelle + ";")).toList();
        assertEquals(1, lignes.size(), "une seule ligne attendue pour « " + libelle + " », obtenu " + lignes);
        return lignes.get(0).substring(libelle.length() + 1);
    }

    /** Lignes de critères listées par le CSV de l'indice. */
    private static long lignesCriteres(String csv, List<Critere> criteres) {
        return Arrays.stream(csv.split("\\R"))
                .filter(l -> criteres.stream().anyMatch(c -> l.startsWith(c.code() + ";")))
                .count();
    }

    /** Texte d'un PDF, espaces et retours supprimés : un libellé coupé en fin de ligne s'y lit d'un bloc. */
    private static String textePdfCompact(byte[] pdf) throws Exception {
        PdfReader lecteur = new PdfReader(pdf);
        StringBuilder texte = new StringBuilder();
        PdfTextExtractor extracteur = new PdfTextExtractor(lecteur);
        for (int page = 1; page <= lecteur.getNumberOfPages(); page++) {
            texte.append(extracteur.getTextFromPage(page));
        }
        lecteur.close();
        return compact(texte.toString());
    }

    private static String compact(String s) {
        return s.replaceAll("\\s+", "");
    }

    private static void assertPdfContient(String pdf, String attendu, String message) {
        assertTrue(pdf.contains(compact(attendu)), message + " : « " + attendu + " » absent du PDF");
    }

    private static void assertPdfNeContientPas(String pdf, String interdit, String message) {
        assertFalse(pdf.contains(compact(interdit)), message + " : « " + interdit + " » présent dans le PDF");
    }

    // === T1 — NON_CALCULABLE : libellés historiques conservés ================

    @Test
    void t1_nonCalculable_conserveLeLibelleHistorique_etDesCompteursNuls() throws Exception {
        Contexte ctx = contexte();
        String bailleur = nouveauBailleur();

        JsonPath indice = calculer(ctx, bailleur);
        assertEquals("NON_CALCULABLE", indice.getString("statut"));
        assertNull(indice.get("score"));
        assertEquals(0, indice.getInt("nombreCriteresTagues"));
        assertEquals(0, indice.getInt("nombreCriteresRetenus"));

        String csv = texte(rapport(ctx, bailleur, "CSV"));
        assertEquals(NON_CALCULABLE, valeurCsv(csv, LIGNE_INDICE), "libellé NON_CALCULABLE validé par ba9ef74");
        assertEquals("0", valeurCsv(csv, LIGNE_A));
        assertEquals("0", valeurCsv(csv, LIGNE_B));
        assertEquals("0", valeurCsv(csv, LIGNE_C));

        String pdf = textePdfCompact(rapport(ctx, bailleur, "PDF"));
        assertPdfContient(pdf, NON_CALCULABLE, "carte de l'indice");
        assertPdfContient(pdf, LIGNE_B + " (0)", "titre de la liste");
        assertPdfContient(pdf, VIDE_NON_CALCULABLE, "message historique de liste vide");
        assertPdfNeContientPas(pdf, VIDE_SANS_JUSTIFICATION, "message réservé aux mappings non justifiés");
    }

    // === T2 — mappings applicables, aucune justification comptée ==========

    /** Le critère est même analysé et validé : c'est la justification qui manque, pas l'évaluation. */
    @Test
    void t2_mappingsSansJustification_nommentLaCorrespondanceAJustifier() throws Exception {
        Contexte ctx = contexte();
        Critere c0 = critereDeFin(ctx, 0);
        Critere c1 = critereDeFin(ctx, 1);
        analyseIa(ctx, c0, "VALIDEE", "0.9200", 5, 60);
        String bailleur = nouveauBailleur();
        mapper(ctx, c0, bailleur);
        mapper(ctx, c1, bailleur);

        JsonPath indice = calculer(ctx, bailleur);
        assertEquals("SANS_EVALUATION", indice.getString("statut"));
        assertNull(indice.get("score"));
        assertEquals(2, indice.getInt("nombreCriteresTagues"));
        assertEquals(0, indice.getInt("nombreCriteresRetenus"));

        String csv = texte(rapport(ctx, bailleur, "CSV"));
        assertEquals(SANS_JUSTIFICATION, valeurCsv(csv, LIGNE_INDICE));
        assertEquals("2", valeurCsv(csv, LIGNE_A), "A : mappings applicables");
        assertEquals("0", valeurCsv(csv, LIGNE_B), "B_m : aucune correspondance justifiée");
        assertEquals("0", valeurCsv(csv, LIGNE_C), "C : rien dans le score");
        assertEquals(0, lignesCriteres(csv, List.of(c0, c1)));
        assertFalse(csv.contains(ANCIEN_SANS_EVALUATION), "ancien message SANS_EVALUATION");
        assertFalse(csv.contains("Critères applicables à ce bailleur"), "ancien libellé CSV");
        assertFalse(csv.contains("Critères retenus dans le calcul"), "ancien libellé CSV");

        String pdf = textePdfCompact(rapport(ctx, bailleur, "PDF"));
        assertPdfContient(pdf, SANS_JUSTIFICATION, "carte de l'indice");
        assertPdfContient(pdf, LIGNE_B + " (0)", "titre de la liste");
        assertPdfContient(pdf, VIDE_SANS_JUSTIFICATION, "liste vide malgré des mappings");
        assertPdfNeContientPas(pdf, VIDE_NON_CALCULABLE, "« aucun critère tagué » alors que le bailleur en porte deux");
        assertPdfNeContientPas(pdf, ANCIEN_SANS_EVALUATION, "ancien message SANS_EVALUATION");
        assertPdfNeContientPas(pdf, "Critères applicables (", "ancien titre de liste");
    }

    // === T3 — correspondance justifiée, dernière analyse IA en revue ========

    @Test
    void t3_justifieMaisDerniereAnalyseEnRevue_nommeLAnalyseAValider() throws Exception {
        Contexte ctx = contexte();
        Critere c0 = critereDeFin(ctx, 0);
        analyseIa(ctx, c0, "VALIDEE", "0.9200", 5, 120);
        analyseIa(ctx, c0, "EN_REVUE", "0.4000", 2, 60);
        String bailleur = nouveauBailleur();
        mapper(ctx, c0, bailleur);
        justifier(ctx, c0, bailleur);

        JsonPath indice = calculer(ctx, bailleur);
        assertEquals("SANS_EVALUATION", indice.getString("statut"));
        assertNull(indice.get("score"));
        assertEquals(1, indice.getInt("nombreCriteresTagues"));
        assertEquals(0, indice.getInt("nombreCriteresRetenus"));

        String csv = texte(rapport(ctx, bailleur, "CSV"));
        assertEquals(SANS_ANALYSE_VALIDEE, valeurCsv(csv, LIGNE_INDICE));
        assertEquals("1", valeurCsv(csv, LIGNE_A));
        assertEquals("1", valeurCsv(csv, LIGNE_B), "B_m : le critère justifié est listé");
        assertEquals("0", valeurCsv(csv, LIGNE_C), "C : dernière analyse non validée");
        assertEquals(1, lignesCriteres(csv, List.of(c0)));

        String pdf = textePdfCompact(rapport(ctx, bailleur, "PDF"));
        assertPdfContient(pdf, SANS_ANALYSE_VALIDEE, "carte de l'indice");
        assertPdfContient(pdf, LIGNE_B + " (1)", "titre de la liste");
        assertTrue(pdf.contains(c0.code()), "le critère justifié est listé");
        assertPdfNeContientPas(pdf, SANS_JUSTIFICATION, "la correspondance est justifiée");
        assertPdfNeContientPas(pdf, VIDE_SANS_JUSTIFICATION, "la liste n'est pas vide");
        assertPdfNeContientPas(pdf, VIDE_NON_CALCULABLE, "la liste n'est pas vide");
    }

    // === T4 — CALCULE : A, B_m et C cohérents entre JSON, CSV et PDF ========

    /**
     * Trois critères rattachés, deux justifiés, un seul analysé et validé :
     * A = 3, B_m = 2, C = 1 — trois nombres distincts, qu'aucun libellé ne
     * peut confondre. Score : niveau 5, coefficient 3 → 5,00.
     */
    @Test
    void t4_calcule_restitueTroisPerimetresCoherents() throws Exception {
        Contexte ctx = contexte();
        Critere c0 = critereDeFin(ctx, 0);
        Critere c1 = critereDeFin(ctx, 1);
        Critere c2 = critereDeFin(ctx, 2);
        analyseIa(ctx, c0, "VALIDEE", "0.9200", 5, 60);
        String bailleur = nouveauBailleur();
        mapper(ctx, c0, bailleur);
        mapper(ctx, c1, bailleur);
        mapper(ctx, c2, bailleur);
        justifier(ctx, c0, bailleur);
        justifier(ctx, c1, bailleur);

        JsonPath indice = calculer(ctx, bailleur);
        assertEquals("CALCULE", indice.getString("statut"));
        assertEquals(5.0f, indice.getFloat("score"));
        assertEquals(3, indice.getInt("nombreCriteresTagues"));
        assertEquals(1, indice.getInt("nombreCriteresRetenus"));

        String csv = texte(rapport(ctx, bailleur, "CSV"));
        assertEquals("5.00/5", valeurCsv(csv, LIGNE_INDICE));
        assertEquals("3", valeurCsv(csv, LIGNE_A));
        assertEquals("2", valeurCsv(csv, LIGNE_B));
        assertEquals("1", valeurCsv(csv, LIGNE_C));
        assertEquals(2, lignesCriteres(csv, List.of(c0, c1, c2)), "la liste CSV compte B_m lignes");
        assertEquals(0, lignesCriteres(csv, List.of(c2)), "le critère non justifié n'est pas listé");
        assertTrue(csv.contains("Critère;Libellé;Domaine;Criticité;Coefficient;Niveau /5;Probabilité conforme;Statut évaluation"),
                "en-tête du tableau CSV conservé");
        for (String champ : List.of("texteSource", "motifRejet", "motifPeremption", "documentNom",
                "referenceOfficielle", "valideeParId", "Justification fictive de test.")) {
            assertFalse(csv.contains(champ), "champ de justification exposé : " + champ);
        }

        String pdf = textePdfCompact(rapport(ctx, bailleur, "PDF"));
        assertTrue(pdf.contains("5.00/5"), "score de la carte");
        assertPdfContient(pdf, LIGNE_B + " (2)", "le titre PDF porte le même nombre que la ligne B_m du CSV");
        assertTrue(pdf.contains(c0.code()) && pdf.contains(c1.code()), "critères justifiés listés");
        assertFalse(pdf.contains(c2.code()), "critère non justifié listé");

        // Le contrat JSON est intact : le rapport a recalculé l'indice, la liste
        // REST rend les mêmes valeurs que le calcul et que le CSV.
        Map<String, Object> liste = indiceListe(ctx, bailleur);
        assertEquals("CALCULE", liste.get("statut"));
        assertEquals(5.0f, ((Number) liste.get("score")).floatValue());
        assertEquals(3, liste.get("nombreCriteresTagues"));
        assertEquals(1, liste.get("nombreCriteresRetenus"));
        assertEquals(List.of("id", "auditId", "bailleurCode", "bailleurNom", "statut", "score",
                        "nombreCriteresTagues", "nombreCriteresRetenus", "dateCalcul").stream().sorted().toList(),
                liste.keySet().stream().sorted().toList(), "champs du DTO inchangés");
    }

    // === T5 — avertissement PDF ============================================

    @Test
    void t5_lAvertissementPdf_parleDeCorrespondanceJustifiee_etNonDeCriteresTagues() throws Exception {
        Contexte ctx = contexte();
        Critere c0 = critereDeFin(ctx, 0);
        analyseIa(ctx, c0, "VALIDEE", "0.9200", 5, 60);
        String bailleur = nouveauBailleur();
        mapper(ctx, c0, bailleur);
        justifier(ctx, c0, bailleur);
        assertEquals("CALCULE", calculer(ctx, bailleur).getString("statut"));

        String pdf = textePdfCompact(rapport(ctx, bailleur, "PDF"));
        assertPdfContient(pdf, AVERTISSEMENT, "avertissement");
        assertPdfNeContientPas(pdf, "alignement avec les critères tagués", "ancien avertissement");
        assertFalse(pdf.contains("tagué"), "vocabulaire « tagué » dans un indice calculé");
    }
}
