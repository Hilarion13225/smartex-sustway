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
import io.restassured.response.ValidatableResponse;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.openpdf.text.pdf.PdfReader;
import org.openpdf.text.pdf.parser.PdfTextExtractor;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * V74-B — seuls les mappings dont la correspondance est justifiée comptent
 * dans l'indice de préparation.
 *
 * <p>Ce que ces tests protègent : un mapping critère ↔ bailleur que personne
 * n'a confronté à un document officiel ne doit plus peser dans un indice
 * présenté à un bailleur. Le périmètre du calcul devient
 * {@code applicable = true ∩ justification VALIDEE, non périmée, EXACTE ou PARTIELLE}.
 * Rien d'autre ne change : la formule, les statuts et le sens des compteurs
 * sont ceux de V73 — {@code nombreCriteresTagues} compte les mappings
 * applicables avant ce filtre, {@code nombreCriteresRetenus} ce qui entre
 * réellement dans le calcul.
 *
 * <p>Chiffres de référence, posés en base sur deux critères d'une mission
 * réelle :
 * <ul>
 *   <li>C1 : probabilité 0,92 → niveau 5, coefficient 3 → note 15 ;</li>
 *   <li>C2 : probabilité 0,40 → niveau 2, coefficient 1 → note 2 ;</li>
 *   <li>les deux comptent : 17 / 4 = 4,25 ; C1 seul : 15 / 3 = 5,00 ;
 *       C2 seul : 2 / 1 = 2,00.</li>
 * </ul>
 *
 * <p>Chaque cas emploie des bailleurs fictifs {@code ZZTEST_*} qui lui sont
 * propres : une justification rend son mapping non supprimable, et le
 * périmètre d'un bailleur est global à toutes les missions. IFC_SFI n'est
 * jamais touché. Les documents cités sont fictifs.
 */
@QuarkusTest
class IndicePreparationJustificationTest {

    @Inject JwtService jwtService;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntityManager entityManager;

    private record Contexte(String token, String entrepriseId, String auditId, String jetonAdmin) {
    }

    /** Un critère de la mission : identifiant du critère de référentiel et son code. */
    private record Critere(String id, String code, String domaineCode) {
    }

    // --- Construction ---------------------------------------------------

    /** Mission Avancées sur SMARTEX_SUSTWAY (version courante 2.1), et un SUPER_ADMIN pour le catalogue. */
    private Contexte contexte() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Indice V74-B",
                        "identifiantLegal", "RCCM-IDXJ-" + UUID.randomUUID(),
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
                        "nom", "Audit Indice V74-B",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201)
                .extract().path("id");

        String jetonAdmin = UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository, utilisateurEntrepriseRepository).token;
        return new Contexte(utilisateur.token, entrepriseId, auditId, jetonAdmin);
    }

    /**
     * Les deux DERNIERS critères actifs et applicables de la mission, dans
     * l'ordre du catalogue (domaine puis code) : D6-93 et D6-92 aujourd'hui.
     *
     * <p>Jamais les premiers. Une justification rend son mapping non
     * supprimable, et ces mappings persistent d'un lancement à l'autre ; or
     * IndicePreparationResourceTest.critereBailleur_definirListerSupprimer
     * éprouve le premier critère du catalogue (D1-01) en supposant qu'il ne
     * porte aucun autre mapping. Les deux derniers critères existent aussi en
     * version 2.0, ce que requiert le cas I.
     */
    private List<Critere> deuxCriteresDeLaMission(Contexte ctx) {
        List<Critere> criteres = QuarkusTransaction.requiringNew().call(() -> {
            @SuppressWarnings("unchecked")
            List<Object[]> lignes = entityManager.createNativeQuery(
                            "SELECT c.id::text, c.code, d.code FROM audit_critere ac "
                                    + "JOIN critere c ON c.id = ac.critere_id JOIN domaine d ON d.id = c.domaine_id "
                                    + "WHERE ac.audit_id = CAST(?1 AS uuid) AND ac.actif AND ac.applicable "
                                    + "ORDER BY d.ordre DESC, c.code DESC LIMIT 2")
                    .setParameter(1, ctx.auditId())
                    .getResultList();
            return lignes.stream().map(l -> new Critere((String) l[0], (String) l[1], (String) l[2])).toList();
        });
        for (Critere critere : criteres) {
            assertFalse(List.of("D1-01", "D1-02").contains(critere.code()),
                    "les tests V74-B ne doivent pas marquer les premiers critères du catalogue : " + critere.code());
        }
        return criteres;
    }

    /** Pose une évaluation IA validée et le coefficient du critère dans la mission. */
    private void poserEvaluation(Contexte ctx, Critere critere, String probabilite, int note, String coefficient) {
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery(
                            "UPDATE audit_critere SET coefficient_ponderation = CAST(?3 AS numeric), criticite_id = "
                                    + "coalesce(criticite_id, (SELECT id FROM criticite ORDER BY poids DESC LIMIT 1)) "
                                    + "WHERE audit_id = CAST(?1 AS uuid) AND critere_id = CAST(?2 AS uuid)")
                    .setParameter(1, ctx.auditId()).setParameter(2, critere.id()).setParameter(3, coefficient)
                    .executeUpdate();
            entityManager.createNativeQuery(
                            "INSERT INTO evaluation (audit_critere_id, probabilite_conforme, note, source, "
                                    + "statut, contrat_version, justification, date_evaluation, validee_par, validee_le) "
                                    + "SELECT ac.id, CAST(?3 AS numeric), CAST(?4 AS smallint), 'IA', 'VALIDEE', '2.0', "
                                    + "'Évaluation posée pour éprouver le périmètre V74-B.', now(), a.created_by, now() "
                                    + "FROM audit_critere ac JOIN audit a ON a.id = ac.audit_id "
                                    + "WHERE ac.audit_id = CAST(?1 AS uuid) AND ac.critere_id = CAST(?2 AS uuid)")
                    .setParameter(1, ctx.auditId()).setParameter(2, critere.id())
                    .setParameter(3, probabilite).setParameter(4, note)
                    .executeUpdate();
        });
    }

    /** C1 et C2 évalués selon les chiffres de référence. */
    private List<Critere> decorEvalue(Contexte ctx) {
        List<Critere> criteres = deuxCriteresDeLaMission(ctx);
        assertEquals(2, criteres.size(), "la mission doit porter au moins deux critères actifs et applicables");
        assertFalse(criteres.get(0).code().contains(criteres.get(1).code()) || criteres.get(1).code().contains(criteres.get(0).code()));
        poserEvaluation(ctx, criteres.get(0), "0.9200", 5, "3");
        poserEvaluation(ctx, criteres.get(1), "0.4000", 2, "1");
        return criteres;
    }

    private String nouveauBailleur() {
        String code = "ZZTEST_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        QuarkusTransaction.requiringNew().run(() -> entityManager.createNativeQuery(
                        "INSERT INTO bailleur (code, nom, description) VALUES (?1, ?2, ?3)")
                .setParameter(1, code)
                .setParameter(2, "Bailleur fictif de test")
                .setParameter(3, "Décor de test V74-B, sans valeur réglementaire.")
                .executeUpdate());
        return code;
    }

    private void mapper(Contexte ctx, String critereId, String bailleur, boolean applicable) {
        given()
                .header("Authorization", "Bearer " + ctx.jetonAdmin())
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", bailleur, "applicable", applicable))
                .when().put("/api/v1/referentiels/criteres/" + critereId + "/bailleur")
                .then().statusCode(200);
    }

    private static String url(String critereId, String bailleur) {
        return "/api/v1/referentiels/criteres/" + critereId + "/bailleur/" + bailleur + "/justification";
    }

    private static Map<String, Object> preuve(String correspondance, String texteSource) {
        Map<String, Object> corps = new HashMap<>();
        corps.put("documentNom", "Document fictif de test");
        corps.put("documentEdition", "Édition de test");
        corps.put("documentOrganisme", "Organisme fictif");
        corps.put("referenceOfficielle", "REF-TEST-V74B");
        corps.put("texteSource", texteSource);
        corps.put("correspondance", correspondance);
        corps.put("justification", "Justification fictive de test.");
        return corps;
    }

    /** Une justification en brouillon, preuve complète. */
    private String brouillon(Contexte ctx, String critereId, String bailleur, String correspondance) {
        return brouillon(ctx, critereId, bailleur, correspondance, "Passage fictif rédigé pour le test.");
    }

    private String brouillon(Contexte ctx, String critereId, String bailleur, String correspondance, String texteSource) {
        return given()
                .header("Authorization", "Bearer " + ctx.jetonAdmin())
                .contentType(ContentType.JSON)
                .body(preuve(correspondance, texteSource))
                .when().post(url(critereId, bailleur))
                .then().statusCode(201)
                .extract().path("id");
    }

    private void valider(Contexte ctx, String critereId, String bailleur, String id) {
        given()
                .header("Authorization", "Bearer " + ctx.jetonAdmin())
                .when().post(url(critereId, bailleur) + "/" + id + "/validation")
                .then().statusCode(200);
    }

    private String validee(Contexte ctx, String critereId, String bailleur, String correspondance) {
        String id = brouillon(ctx, critereId, bailleur, correspondance);
        valider(ctx, critereId, bailleur, id);
        return id;
    }

    private void decision(Contexte ctx, String critereId, String bailleur, String id, String action, String motif) {
        given()
                .header("Authorization", "Bearer " + ctx.jetonAdmin())
                .contentType(ContentType.JSON)
                .body(Map.of("motif", motif))
                .when().post(url(critereId, bailleur) + "/" + id + "/" + action)
                .then().statusCode(200);
    }

    private ValidatableResponse indice(Contexte ctx, String bailleur) {
        return given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", bailleur))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                .then()
                .statusCode(200);
    }

    private void attendreCalcule(Contexte ctx, String bailleur, float score, int tagues, int retenus) {
        indice(ctx, bailleur)
                .body("statut", equalTo("CALCULE"))
                .body("score", equalTo(score))
                .body("nombreCriteresTagues", equalTo(tagues))
                .body("nombreCriteresRetenus", equalTo(retenus));
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

    /** Mappe C1 et C2 au bailleur, applicables. */
    private String bailleurMappe(Contexte ctx, List<Critere> criteres) {
        String bailleur = nouveauBailleur();
        mapper(ctx, criteres.get(0).id(), bailleur, true);
        mapper(ctx, criteres.get(1).id(), bailleur, true);
        return bailleur;
    }

    // === A / J — justification validée, score exact ==========================

    @Test
    void a_justificationsValidees_comptent_etLeScoreEstExact() {
        Contexte ctx = contexte();
        List<Critere> c = decorEvalue(ctx);
        String bailleur = bailleurMappe(ctx, c);
        validee(ctx, c.get(0).id(), bailleur, "EXACTE");
        validee(ctx, c.get(1).id(), bailleur, "EXACTE");

        attendreCalcule(ctx, bailleur, 4.25f, 2, 2);
    }

    /** Mappings applicables sans aucune justification : périmètre V74-B vide, mais pas NON_CALCULABLE. */
    @Test
    void mappingsApplicablesSansJustification_neComptentPas_etRestentSansEvaluation() {
        Contexte ctx = contexte();
        List<Critere> c = decorEvalue(ctx);
        String bailleur = bailleurMappe(ctx, c);

        indice(ctx, bailleur)
                .body("statut", equalTo("SANS_EVALUATION"))
                .body("score", nullValue())
                .body("nombreCriteresTagues", equalTo(2))
                .body("nombreCriteresRetenus", equalTo(0));
    }

    // === B — brouillon ======================================================

    @Test
    void b_brouillon_neComptePas() {
        Contexte ctx = contexte();
        List<Critere> c = decorEvalue(ctx);
        String bailleur = bailleurMappe(ctx, c);
        validee(ctx, c.get(0).id(), bailleur, "EXACTE");
        brouillon(ctx, c.get(1).id(), bailleur, "EXACTE");

        attendreCalcule(ctx, bailleur, 5.0f, 2, 1);
    }

    // === C — rejetée ========================================================

    @Test
    void c_rejetee_neComptePas() {
        Contexte ctx = contexte();
        List<Critere> c = decorEvalue(ctx);
        String bailleur = bailleurMappe(ctx, c);
        validee(ctx, c.get(0).id(), bailleur, "EXACTE");
        String id = brouillon(ctx, c.get(1).id(), bailleur, "EXACTE");
        decision(ctx, c.get(1).id(), bailleur, id, "rejet", "Source jugée inadaptée (test)");

        attendreCalcule(ctx, bailleur, 5.0f, 2, 1);
    }

    // === D — périmée ========================================================

    /** Validée, elle compte ; périmée, elle cesse de compter au calcul suivant. */
    @Test
    void d_validee_puisPerimee_cesseDeCompter() {
        Contexte ctx = contexte();
        List<Critere> c = decorEvalue(ctx);
        String bailleur = bailleurMappe(ctx, c);
        validee(ctx, c.get(0).id(), bailleur, "EXACTE");
        String id = validee(ctx, c.get(1).id(), bailleur, "EXACTE");
        attendreCalcule(ctx, bailleur, 4.25f, 2, 2);

        decision(ctx, c.get(1).id(), bailleur, id, "peremption", "Édition remplacée (test)");

        attendreCalcule(ctx, bailleur, 5.0f, 2, 1);
    }

    // === E — AUCUNE =========================================================

    @Test
    void e_valideeAucune_neComptePas() {
        Contexte ctx = contexte();
        List<Critere> c = decorEvalue(ctx);
        String bailleur = bailleurMappe(ctx, c);
        validee(ctx, c.get(0).id(), bailleur, "EXACTE");
        validee(ctx, c.get(1).id(), bailleur, "AUCUNE");

        attendreCalcule(ctx, bailleur, 5.0f, 2, 1);
    }

    // === F — PARTIELLE ======================================================

    /** PARTIELLE compte à 100 % : même score qu'EXACTE, et seul, son propre niveau. */
    @Test
    void f_valideePartielle_compteEntierement_sansPonderation() {
        Contexte ctx = contexte();
        List<Critere> c = decorEvalue(ctx);
        String bailleur = bailleurMappe(ctx, c);
        validee(ctx, c.get(0).id(), bailleur, "EXACTE");
        validee(ctx, c.get(1).id(), bailleur, "PARTIELLE");
        attendreCalcule(ctx, bailleur, 4.25f, 2, 2);

        String seul = bailleurMappe(ctx, c);
        brouillon(ctx, c.get(0).id(), seul, "EXACTE");
        validee(ctx, c.get(1).id(), seul, "PARTIELLE");
        attendreCalcule(ctx, seul, 2.0f, 2, 1);
    }

    // === G — applicable = false =============================================

    @Test
    void g_applicableFalse_exclutMalgreUneJustificationValidee() {
        Contexte ctx = contexte();
        List<Critere> c = decorEvalue(ctx);
        String bailleur = nouveauBailleur();
        mapper(ctx, c.get(0).id(), bailleur, true);
        mapper(ctx, c.get(1).id(), bailleur, false);
        validee(ctx, c.get(0).id(), bailleur, "EXACTE");
        validee(ctx, c.get(1).id(), bailleur, "EXACTE");

        // Le mapping non applicable n'est ni tagué ni retenu.
        attendreCalcule(ctx, bailleur, 5.0f, 1, 1);

        // Aucun mapping applicable : NON_CALCULABLE, même avec une justification validée.
        String nonApplicable = nouveauBailleur();
        mapper(ctx, c.get(1).id(), nonApplicable, false);
        validee(ctx, c.get(1).id(), nonApplicable, "EXACTE");
        indice(ctx, nonApplicable)
                .body("statut", equalTo("NON_CALCULABLE"))
                .body("score", nullValue())
                .body("nombreCriteresTagues", equalTo(0))
                .body("nombreCriteresRetenus", equalTo(0));
    }

    // === H — plusieurs bailleurs ============================================

    @Test
    void h_laJustificationDUnBailleur_neModifieJamaisLePerimetreDUnAutre() {
        Contexte ctx = contexte();
        List<Critere> c = decorEvalue(ctx);
        String premier = bailleurMappe(ctx, c);
        String second = bailleurMappe(ctx, c);
        validee(ctx, c.get(0).id(), premier, "EXACTE");
        validee(ctx, c.get(1).id(), premier, "EXACTE");

        attendreCalcule(ctx, premier, 4.25f, 2, 2);
        indice(ctx, second)
                .body("statut", equalTo("SANS_EVALUATION"))
                .body("nombreCriteresTagues", equalTo(2))
                .body("nombreCriteresRetenus", equalTo(0));

        validee(ctx, c.get(0).id(), second, "EXACTE");
        attendreCalcule(ctx, second, 5.0f, 2, 1);
        attendreCalcule(ctx, premier, 4.25f, 2, 2);
    }

    // === I — nouvelle version ===============================================

    /**
     * Une justification posée sur le critère de la version 2.0 ne vaut pas
     * pour son équivalent de la version 2.1 que la mission audite : aucun
     * transfert automatique, aucune dérivation supplémentaire.
     */
    @Test
    void i_laJustificationDUneAncienneVersion_nEstPasReutilisee() {
        Contexte ctx = contexte();
        List<Critere> c = decorEvalue(ctx);
        Critere c1 = c.get(0);
        String[] versionEtAncien = QuarkusTransaction.requiringNew().call(() -> {
            Object[] ligne = (Object[]) entityManager.createNativeQuery(
                            "SELECT v_mission.numero, ancien.id::text FROM critere c "
                                    + "JOIN referentiel_version v_mission ON v_mission.id = c.referentiel_version_id "
                                    + "JOIN domaine d ON d.id = c.domaine_id "
                                    + "JOIN referentiel_version v_ancienne ON v_ancienne.referentiel_id = v_mission.referentiel_id AND v_ancienne.numero = '2.0' "
                                    + "JOIN domaine d_ancien ON d_ancien.referentiel_version_id = v_ancienne.id AND d_ancien.code = d.code "
                                    + "JOIN critere ancien ON ancien.domaine_id = d_ancien.id AND ancien.code = c.code "
                                    + "WHERE c.id = CAST(?1 AS uuid)")
                    .setParameter(1, c1.id())
                    .getSingleResult();
            return new String[] {(String) ligne[0], (String) ligne[1]};
        });
        assertEquals("2.1", versionEtAncien[0], "la mission doit auditer la version courante 2.1");
        String ancienCritereId = versionEtAncien[1];

        String bailleur = nouveauBailleur();
        mapper(ctx, ancienCritereId, bailleur, true);
        validee(ctx, ancienCritereId, bailleur, "EXACTE");
        mapper(ctx, c1.id(), bailleur, true);

        indice(ctx, bailleur)
                .body("statut", equalTo("SANS_EVALUATION"))
                .body("score", nullValue())
                .body("nombreCriteresTagues", equalTo(2))
                .body("nombreCriteresRetenus", equalTo(0));

        validee(ctx, c1.id(), bailleur, "EXACTE");
        attendreCalcule(ctx, bailleur, 5.0f, 2, 1);
    }

    // === K — sécurité =======================================================

    /** Les réponses de l'indice et le rapport ne portent rien du contenu des justifications. */
    @Test
    void k_aucunContenuDeJustification_nApparaitDansLIndice() {
        Contexte ctx = contexte();
        List<Critere> c = decorEvalue(ctx);
        String bailleur = bailleurMappe(ctx, c);
        String marqueur = "MARQUEUR-JUSTIFICATION-" + UUID.randomUUID();
        String id = brouillon(ctx, c.get(0).id(), bailleur, "EXACTE", marqueur);
        valider(ctx, c.get(0).id(), bailleur, id);
        String rejetee = brouillon(ctx, c.get(1).id(), bailleur, "EXACTE", marqueur);
        decision(ctx, c.get(1).id(), bailleur, rejetee, "rejet", "MOTIF-" + marqueur);

        String reponseCalcul = indice(ctx, bailleur).extract().asString();
        String reponseListe = given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                .then().statusCode(200)
                .extract().asString();
        String csv = new String(rapport(ctx, bailleur, "CSV"), StandardCharsets.UTF_8);

        for (String contenu : List.of(reponseCalcul, reponseListe, csv)) {
            assertFalse(contenu.contains(marqueur), "le texte d'une justification ne doit pas sortir");
            for (String champ : List.of("texteSource", "motifRejet", "motifPeremption", "documentNom",
                    "referenceOfficielle", "valideeParId", "Justification fictive de test.", id, rejetee)) {
                assertFalse(contenu.contains(champ), "champ de justification exposé : " + champ);
            }
        }
    }

    // === L — rapports CSV et PDF ============================================

    /** Le rapport liste exactement le périmètre du calcul : C1 justifié y figure, C2 en brouillon non. */
    @Test
    void l_lesRapportsCsvEtPdf_listentExactementLePerimetreDeLIndice() throws Exception {
        Contexte ctx = contexte();
        List<Critere> c = decorEvalue(ctx);
        String bailleur = bailleurMappe(ctx, c);
        validee(ctx, c.get(0).id(), bailleur, "EXACTE");
        brouillon(ctx, c.get(1).id(), bailleur, "EXACTE");
        attendreCalcule(ctx, bailleur, 5.0f, 2, 1);

        String csv = new String(rapport(ctx, bailleur, "CSV"), StandardCharsets.UTF_8);
        List<String> lignesCriteres = Arrays.stream(csv.split("\\R"))
                .filter(l -> l.startsWith(c.get(0).code() + ";") || l.startsWith(c.get(1).code() + ";"))
                .toList();
        assertEquals(1, lignesCriteres.size(), "CSV : un seul critère du périmètre attendu, obtenu " + lignesCriteres);
        assertTrue(lignesCriteres.get(0).startsWith(c.get(0).code() + ";"));

        byte[] pdf = rapport(ctx, bailleur, "PDF");
        PdfReader lecteur = new PdfReader(pdf);
        StringBuilder texte = new StringBuilder();
        PdfTextExtractor extracteur = new PdfTextExtractor(lecteur);
        for (int page = 1; page <= lecteur.getNumberOfPages(); page++) {
            texte.append(extracteur.getTextFromPage(page)).append('\n');
        }
        lecteur.close();
        assertTrue(texte.toString().contains(c.get(0).code()), "PDF : le critère justifié doit figurer");
        assertFalse(texte.toString().contains(c.get(1).code()), "PDF : le critère non justifié ne doit pas figurer");
    }

    /** Sans justification validée, le rapport ne liste aucun critère, comme le calcul n'en retient aucun. */
    @Test
    void l_sansJustification_leRapportNeListeAucunCritere() {
        Contexte ctx = contexte();
        List<Critere> c = decorEvalue(ctx);
        String bailleur = bailleurMappe(ctx, c);

        String csv = new String(rapport(ctx, bailleur, "CSV"), StandardCharsets.UTF_8);
        assertFalse(Arrays.stream(csv.split("\\R")).anyMatch(l -> l.startsWith(c.get(0).code() + ";") || l.startsWith(c.get(1).code() + ";")),
                "aucun critère non justifié ne doit être listé");
        given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                .then().statusCode(200)
                .body(not(containsString(c.get(0).id())));
    }
}
