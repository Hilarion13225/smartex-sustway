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
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.openpdf.text.pdf.PdfReader;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
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
 * V74-C3 — dans un PDF généré, un score imprimé « 4.00 » porte la couleur de
 * 4,00, qu'il vienne du score global ou de l'indice.
 *
 * <p>Ce que ce test protège, de bout en bout : une mission dont le score
 * global vaut 3,9950 (JSON à quatre décimales) et un indice qui, sur les mêmes
 * critères, vaut 4,00. Avant V74-C3, le rapport SYNTHESE imprimait « 4.00 » en
 * bleu et le rapport de l'indice « 4.00 » en vert.
 *
 * <p>La couleur est lue dans le flux de contenu de la page : dernier opérateur
 * de remplissage RGB ({@code rg}) avant la chaîne {@code (4.00)}.
 *
 * <p>Décor : huit critères de fin de catalogue (jamais D1-01 ni D1-02) —
 * niveau 3 au coefficient 1,1, niveau 5 au coefficient 1,0, six de niveau 4
 * au coefficient 3,0 : 80,3 / 20,1 = 3,9950. Bailleur fictif
 * {@code ZZTEST_*}, jamais IFC_SFI.
 */
@QuarkusTest
class CouleurScoreRapportPdfTest {

    /** RapportGenerationService.BRAND (vert, ≥ 4), BLEU (≥ 3) et ENCRE_ATTENUEE (absence de score, V74-C3-B11). */
    private static final int[] BRAND = {18, 130, 87};
    private static final int[] BLEU = {37, 99, 235};
    private static final int[] ENCRE_ATTENUEE = {100, 116, 139};

    /** « — » tel qu'OpenPDF 3.0.5 l'écrit dans le flux : deux octets par glyphe, 0x07 0xE0 (voir ScoreAbsentRapportTest). */
    private static final String TIRET_PDF = "\u0007\u00E0";

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

    private Contexte contexte() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Couleur Score V74-C3",
                        "identifiantLegal", "RCCM-COULSC-" + UUID.randomUUID(),
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
                        "nom", "Audit Couleur Score V74-C3",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201)
                .extract().path("id");

        String jetonAdmin = UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository, utilisateurEntrepriseRepository).token;
        return new Contexte(utilisateur.token, entrepriseId, auditId, jetonAdmin);
    }

    /** Les huit derniers critères actifs et applicables de la mission, dans l'ordre du catalogue inversé. */
    private List<Critere> huitCriteresDeFin(Contexte ctx) {
        List<Critere> criteres = QuarkusTransaction.requiringNew().call(() -> {
            @SuppressWarnings("unchecked")
            List<Object[]> lignes = entityManager.createNativeQuery(
                            "SELECT c.id::text, c.code FROM audit_critere ac "
                                    + "JOIN critere c ON c.id = ac.critere_id JOIN domaine d ON d.id = c.domaine_id "
                                    + "WHERE ac.audit_id = CAST(?1 AS uuid) AND ac.actif AND ac.applicable "
                                    + "ORDER BY d.ordre DESC, c.code DESC LIMIT 8")
                    .setParameter(1, ctx.auditId())
                    .getResultList();
            return lignes.stream().map(l -> new Critere((String) l[0], (String) l[1])).toList();
        });
        assertEquals(8, criteres.size());
        for (Critere critere : criteres) {
            assertFalse(List.of("D1-01", "D1-02").contains(critere.code()),
                    "les tests ne doivent pas marquer les premiers critères du catalogue : " + critere.code());
        }
        return criteres;
    }

    /** Coefficient du critère dans la mission et analyse IA validée. */
    private void analyseValidee(Contexte ctx, Critere critere, String coefficient, String probabilite, int note) {
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery(
                            "UPDATE audit_critere SET coefficient_ponderation = CAST(?3 AS numeric), criticite_id = "
                                    + "coalesce(criticite_id, (SELECT id FROM criticite ORDER BY poids DESC LIMIT 1)) "
                                    + "WHERE audit_id = CAST(?1 AS uuid) AND critere_id = CAST(?2 AS uuid)")
                    .setParameter(1, ctx.auditId()).setParameter(2, critere.id()).setParameter(3, coefficient)
                    .executeUpdate();
            entityManager.createNativeQuery(
                            "INSERT INTO evaluation (audit_critere_id, probabilite_conforme, note, source, statut, "
                                    + "contrat_version, justification, date_evaluation, validee_par, validee_le) "
                                    + "SELECT ac.id, CAST(?3 AS numeric), CAST(?4 AS smallint), 'IA', 'VALIDEE', '2.0', "
                                    + "'Analyse IA fictive de test.', now(), a.created_by, now() "
                                    + "FROM audit_critere ac JOIN audit a ON a.id = ac.audit_id "
                                    + "WHERE ac.audit_id = CAST(?1 AS uuid) AND ac.critere_id = CAST(?2 AS uuid)")
                    .setParameter(1, ctx.auditId()).setParameter(2, critere.id())
                    .setParameter(3, probabilite).setParameter(4, note)
                    .executeUpdate();
        });
    }

    /** Bailleur fictif : les huit critères mappés, chacun justifié (EXACTE, validée). */
    private String bailleurJustifie(Contexte ctx, List<Critere> criteres) {
        String code = "ZZTEST_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        QuarkusTransaction.requiringNew().run(() -> entityManager.createNativeQuery(
                        "INSERT INTO bailleur (code, nom, description) VALUES (?1, ?2, ?3)")
                .setParameter(1, code)
                .setParameter(2, "Bailleur fictif de test")
                .setParameter(3, "Décor de test V74-C3, sans valeur réglementaire.")
                .executeUpdate());
        for (Critere critere : criteres) {
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
                            "referenceOfficielle", "REF-TEST-C3",
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
        return code;
    }

    private byte[] rapport(Contexte ctx, String type, String format, String bailleur) {
        Map<String, String> corps = bailleur == null
                ? Map.of("type", type, "format", format)
                : Map.of("type", type, "format", format, "bailleurCode", bailleur);
        String rapportId = given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(corps)
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

    private static final Pattern REMPLISSAGE_RGB = Pattern.compile("(-?[0-9.]+) (-?[0-9.]+) (-?[0-9.]+) rg\\b");

    /** Couleur (0-255) de chaque chaîne {@code (texte)} de la première page : dernier {@code rg} qui la précède. */
    private static List<int[]> couleursDe(byte[] pdf, String texte) throws Exception {
        PdfReader lecteur = new PdfReader(pdf);
        String contenu = new String(lecteur.getPageContent(1), StandardCharsets.ISO_8859_1);
        lecteur.close();
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
            assertTrue(derniere != null, "aucune couleur RGB avant " + cible + " : "
                    + contenu.substring(Math.max(0, i - 200), i + cible.length()));
            couleurs.add(derniere);
        }
        return couleurs;
    }

    /** Écart d'arrondi toléré : le flux écrit les composantes avec une précision limitée. */
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

    @Test
    void unScoreGlobalDe39950_etLIndiceDe400_sImprimentEnVert() throws Exception {
        Contexte ctx = contexte();
        List<Critere> criteres = huitCriteresDeFin(ctx);
        analyseValidee(ctx, criteres.get(0), "1.1", "0.6000", 3);
        analyseValidee(ctx, criteres.get(1), "1.0", "0.9500", 5);
        for (int i = 2; i < 8; i++) {
            analyseValidee(ctx, criteres.get(i), "3.0", "0.8000", 4);
        }

        // Contrat JSON inchangé : quatre décimales pour le score global.
        String score = given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/score")
                .then().statusCode(200)
                .extract().asString();
        assertTrue(score.contains("\"scoreGlobal\":3.9950"), "score global brut attendu 3.9950 : " + score);

        String bailleur = bailleurJustifie(ctx, criteres);
        String indice = given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", bailleur))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                .then().statusCode(200)
                .extract().asString();
        assertTrue(indice.contains("\"statut\":\"CALCULE\"") && indice.contains("\"score\":4.00"),
                "indice attendu CALCULE à 4.00 (double arrondi inchangé) : " + indice);

        assertTrue(new String(rapport(ctx, "SYNTHESE", "CSV", null), StandardCharsets.UTF_8).contains("Score global;4.00/5"));
        assertTrue(new String(rapport(ctx, "INDICE_FINANCEMENTS_VERTS", "CSV", bailleur), StandardCharsets.UTF_8)
                .contains("Indice de préparation;4.00/5"));

        byte[] pdfSynthese = rapport(ctx, "SYNTHESE", "PDF", null);
        List<int[]> synthese = couleursDe(pdfSynthese, "4.00");
        List<int[]> rapportIndice = couleursDe(rapport(ctx, "INDICE_FINANCEMENTS_VERTS", "PDF", bailleur), "4.00");

        // Contre-épreuve de la lecture : les domaines sans évaluation du même
        // PDF impriment « — » en encre atténuée (V74-C3-B11 ; « 0.00 » rouge
        // avant). Une lecture qui rendrait toujours la même couleur échouerait ici.
        assertTrue(couleursDe(pdfSynthese, "0.00").isEmpty(), "SYNTHESE : un domaine non évalué imprimé 0.00");
        List<int[]> domainesVides = couleursDe(pdfSynthese, TIRET_PDF);
        assertFalse(domainesVides.isEmpty(), "le rapport SYNTHESE doit imprimer « — » pour les domaines non évalués");
        for (int[] c : domainesVides) {
            assertTrue(proche(c, ENCRE_ATTENUEE), "SYNTHESE : « — » attendu en encre atténuée " + rgb(ENCRE_ATTENUEE) + ", obtenu " + rgb(c));
        }
        assertFalse(synthese.isEmpty(), "le rapport SYNTHESE doit imprimer 4.00");
        assertEquals(1, rapportIndice.size(), "le rapport de l'indice imprime 4.00 une fois (carte)");

        for (int[] c : synthese) {
            assertTrue(proche(c, BRAND), "SYNTHESE : 4.00 attendu en vert " + rgb(BRAND) + ", obtenu " + rgb(c));
            assertFalse(proche(c, BLEU), "SYNTHESE : 4.00 imprimé en bleu");
        }
        assertTrue(proche(rapportIndice.get(0), BRAND),
                "indice : 4.00 attendu en vert " + rgb(BRAND) + ", obtenu " + rgb(rapportIndice.get(0)));
    }
}
