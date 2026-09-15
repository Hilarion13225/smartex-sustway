package com.smartexsustway.api.referentiel;

import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.RoleRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
import io.agroal.api.AgroalDataSource;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.response.ValidatableResponse;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;
import org.postgresql.util.PSQLException;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.anyOf;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Cycle de vie d'une justification de mapping critère ↔ bailleur (V74-A).
 *
 * <p>Ce que ces tests protègent : une correspondance critère ↔ bailleur ne
 * vaut que par la source officielle qui la fonde et la décision humaine qui
 * l'a retenue. Une validation sans preuve, une décision réécrite après coup,
 * ou une justification effacée rendraient le mapping indéfendable devant un
 * bailleur, sans que rien ne le signale.
 *
 * <p>Chaque cas travaille sur un référentiel {@code TEST_JUS_*} et un bailleur
 * {@code ZZTEST_*} créés pour lui : les documents cités sont fictifs et ne
 * constituent aucune donnée réglementaire. {@code IFC_SFI} n'est jamais
 * touché, pour ne pas faire basculer l'indice de préparation éprouvé par
 * d'autres classes. Faute de suppression possible — c'est la règle éprouvée —
 * ces lignes restent dans la base de test.
 *
 * <p>Les règles sont éprouvées deux fois : par l'API, puis directement en SQL,
 * pour montrer qu'elles tiennent sans le service, sous le nom de contrainte
 * que l'API sait traduire.
 */
@QuarkusTest
class MappingBailleurJustificationTest {

    @Inject JwtService jwtService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject AgroalDataSource dataSource;

    /** Un mapping de test prêt à être justifié, et le SUPER_ADMIN qui l'administre. */
    private record Cadre(String jeton, String adminId, String code, String critereId, String bailleurCode) {
        String url() {
            return "/api/v1/referentiels/criteres/" + critereId + "/bailleur/" + bailleurCode + "/justification";
        }
    }

    // --- Construction ---------------------------------------------------

    private static String suffixe() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
    }

    private Cadre cadre() {
        var admin = UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository, utilisateurEntrepriseRepository);
        String code = "TEST_JUS_" + suffixe();

        given().header("Authorization", "Bearer " + admin.token)
                .contentType(ContentType.JSON)
                .body(Map.of("code", code, "nom", "Référentiel éprouvant les justifications", "type", "SMARTEX"))
                .when().post("/api/v1/referentiels")
                .then().statusCode(201);

        given().header("Authorization", "Bearer " + admin.token)
                .contentType(ContentType.JSON)
                .body(Map.of("code", "DJ", "nom", "Domaine éprouvé"))
                .when().post("/api/v1/referentiels/" + code + "/domaines")
                .then().statusCode(201);

        String critereId = given().header("Authorization", "Bearer " + admin.token)
                .contentType(ContentType.JSON)
                .body(Map.of("code", "DJ-01", "libelle", "Critère éprouvé"))
                .when().post("/api/v1/referentiels/" + code + "/domaines/DJ/criteres")
                .then().statusCode(201)
                .extract().path("id");

        String bailleurCode = "ZZTEST_" + suffixe();
        executer("INSERT INTO bailleur (code, nom, description) VALUES (?, ?, ?)",
                bailleurCode, "Bailleur fictif de test", "Décor de test V74, sans valeur réglementaire.");

        given().header("Authorization", "Bearer " + admin.token)
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", bailleurCode, "applicable", true))
                .when().put("/api/v1/referentiels/criteres/" + critereId + "/bailleur")
                .then().statusCode(200);

        return new Cadre(admin.token, admin.id, code, critereId, bailleurCode);
    }

    /** Une preuve complète, entièrement fictive. */
    private static Map<String, Object> preuveComplete() {
        Map<String, Object> corps = new HashMap<>();
        corps.put("documentNom", "Document fictif de test");
        corps.put("documentEdition", "Édition de test");
        corps.put("documentOrganisme", "Organisme fictif");
        corps.put("documentUrl", "https://example.invalid/document-de-test");
        corps.put("referenceOfficielle", "REF-TEST-1");
        corps.put("titreOfficiel", "Titre fictif");
        corps.put("texteSource", "Passage fictif rédigé pour le test.");
        corps.put("localisation", Map.of("page", 12, "section", "2.1"));
        corps.put("confiance", new BigDecimal("0.850"));
        corps.put("correspondance", "EXACTE");
        corps.put("justification", "Justification fictive de test.");
        return corps;
    }

    private ValidatableResponse creer(Cadre cadre, Map<String, Object> corps) {
        return given().header("Authorization", "Bearer " + cadre.jeton())
                .contentType(ContentType.JSON)
                .body(corps)
                .when().post(cadre.url())
                .then();
    }

    private String creerBrouillon(Cadre cadre, Map<String, Object> corps) {
        return creer(cadre, corps).statusCode(201).extract().path("id");
    }

    private ValidatableResponse modifier(Cadre cadre, String id, Map<String, Object> corps) {
        return given().header("Authorization", "Bearer " + cadre.jeton())
                .contentType(ContentType.JSON)
                .body(corps)
                .when().put(cadre.url() + "/" + id)
                .then();
    }

    private ValidatableResponse valider(Cadre cadre, String id) {
        return given().header("Authorization", "Bearer " + cadre.jeton())
                .when().post(cadre.url() + "/" + id + "/validation")
                .then();
    }

    private ValidatableResponse rejeter(Cadre cadre, String id, String motif) {
        return given().header("Authorization", "Bearer " + cadre.jeton())
                .contentType(ContentType.JSON)
                .body(motifCorps(motif))
                .when().post(cadre.url() + "/" + id + "/rejet")
                .then();
    }

    private ValidatableResponse perimer(Cadre cadre, String id, String motif) {
        return given().header("Authorization", "Bearer " + cadre.jeton())
                .contentType(ContentType.JSON)
                .body(motifCorps(motif))
                .when().post(cadre.url() + "/" + id + "/peremption")
                .then();
    }

    private static Map<String, Object> motifCorps(String motif) {
        Map<String, Object> corps = new HashMap<>();
        corps.put("motif", motif);
        return corps;
    }

    private ValidatableResponse consulter(Cadre cadre) {
        return given().header("Authorization", "Bearer " + cadre.jeton())
                .when().get(cadre.url())
                .then();
    }

    private String creerValidee(Cadre cadre) {
        String id = creerBrouillon(cadre, preuveComplete());
        valider(cadre, id).statusCode(200);
        return id;
    }

    // --- SQL direct -----------------------------------------------------

    private void executer(String sql, Object... parametres) {
        try (Connection connexion = dataSource.getConnection();
             PreparedStatement requete = connexion.prepareStatement(sql)) {
            lier(requete, parametres);
            requete.executeUpdate();
        } catch (SQLException e) {
            throw new IllegalStateException(e);
        }
    }

    private String lire(String sql, Object... parametres) {
        try (Connection connexion = dataSource.getConnection();
             PreparedStatement requete = connexion.prepareStatement(sql)) {
            lier(requete, parametres);
            try (ResultSet resultat = requete.executeQuery()) {
                return resultat.next() ? resultat.getString(1) : null;
            }
        } catch (SQLException e) {
            throw new IllegalStateException(e);
        }
    }

    /**
     * Exécute une écriture qui doit être refusée, et rend le nom de
     * contrainte porté par le message du serveur — celui que lit
     * ContrainteJustificationMapper, jamais le texte de l'erreur.
     */
    private String contrainteDuRefus(String sql, Object... parametres) {
        try (Connection connexion = dataSource.getConnection();
             PreparedStatement requete = connexion.prepareStatement(sql)) {
            lier(requete, parametres);
            requete.executeUpdate();
        } catch (PSQLException e) {
            return e.getServerErrorMessage() == null ? null : e.getServerErrorMessage().getConstraint();
        } catch (SQLException e) {
            throw new IllegalStateException(e);
        }
        fail("Écriture acceptée alors qu'un refus était attendu : " + sql);
        return null;
    }

    private static void lier(PreparedStatement requete, Object... parametres) throws SQLException {
        for (int i = 0; i < parametres.length; i++) {
            requete.setObject(i + 1, parametres[i]);
        }
    }

    // === Création et consultation ============================================

    /** Un brouillon naît sans source, humain, non déterminé, et sans marque de modification. */
    @Test
    void creationBrouillon_sansSource_estAcceptee() {
        Cadre cadre = cadre();

        String creeLe = creer(cadre, Map.of())
                .statusCode(201)
                .body("id", notNullValue())
                .body("etat", equalTo("BROUILLON"))
                .body("critereId", equalTo(cadre.critereId()))
                .body("bailleurCode", equalTo(cadre.bailleurCode()))
                .body("origine", equalTo("CONTENU_HUMAIN"))
                .body("correspondance", equalTo("NON_DETERMINEE"))
                .body("creeParId", equalTo(cadre.adminId()))
                .body("creeLe", notNullValue())
                .body("modifieeParId", nullValue())
                .body("modifieeLe", nullValue())
                .body("valideeParId", nullValue())
                .extract().path("creeLe");

        // La date annoncée à la création est celle que la base a gardée.
        consulter(cadre).statusCode(200)
                .body("etat", equalTo("BROUILLON"))
                .body("creeLe", equalTo(creeLe));
    }

    /** Un mapping sans justification répond 200 et le dit ; ce qui n'existe pas répond 404. */
    @Test
    void mappingSansJustification_estNonDocumente_etAbsences_en404() {
        Cadre cadre = cadre();

        consulter(cadre)
                .statusCode(200)
                .body("etat", equalTo("NON_DOCUMENTE"))
                .body("id", nullValue())
                .body("bailleurCode", equalTo(cadre.bailleurCode()));

        given().header("Authorization", "Bearer " + cadre.jeton())
                .when().get(cadre.url() + "/historique")
                .then().statusCode(200).body("$", hasSize(0));

        // Critère inexistant.
        given().header("Authorization", "Bearer " + cadre.jeton())
                .when().get("/api/v1/referentiels/criteres/" + UUID.randomUUID()
                        + "/bailleur/" + cadre.bailleurCode() + "/justification")
                .then().statusCode(404);

        // Bailleur inexistant.
        given().header("Authorization", "Bearer " + cadre.jeton())
                .when().get("/api/v1/referentiels/criteres/" + cadre.critereId()
                        + "/bailleur/ZZINCONNU_" + suffixe() + "/justification")
                .then().statusCode(404);

        // Critère et bailleur existants, mais non rattachés.
        String autreBailleur = "ZZTEST_" + suffixe();
        executer("INSERT INTO bailleur (code, nom) VALUES (?, ?)", autreBailleur, "Bailleur fictif non rattaché");
        given().header("Authorization", "Bearer " + cadre.jeton())
                .when().get("/api/v1/referentiels/criteres/" + cadre.critereId()
                        + "/bailleur/" + autreBailleur + "/justification")
                .then().statusCode(404);
        given().header("Authorization", "Bearer " + cadre.jeton())
                .contentType(ContentType.JSON)
                .body(Map.of())
                .when().post("/api/v1/referentiels/criteres/" + cadre.critereId()
                        + "/bailleur/" + autreBailleur + "/justification")
                .then().statusCode(404);
    }

    // === Validation ==========================================================

    @Test
    void validationComplete_estAcceptee_etTraceLeValidateur() {
        Cadre cadre = cadre();
        String id = creerBrouillon(cadre, preuveComplete());

        var reponse = valider(cadre, id)
                .statusCode(200)
                .body("etat", equalTo("VALIDEE"))
                .body("valideeParId", equalTo(cadre.adminId()))
                .body("valideeLe", notNullValue())
                .body("localisation.page", equalTo(12))
                .body("localisation.section", equalTo("2.1"))
                .body("correspondance", equalTo("EXACTE"))
                .extract().jsonPath();
        assertEquals(0, new BigDecimal("0.850").compareTo(new BigDecimal(reponse.getString("confiance"))));

        consulter(cadre).statusCode(200).body("id", equalTo(id)).body("etat", equalTo("VALIDEE"));
    }

    /** Sans preuve, pas de validation : le refus nomme ce qui manque, et le brouillon reste brouillon. */
    @Test
    void validationIncomplete_estRefusee() {
        Cadre cadre = cadre();
        String id = creerBrouillon(cadre, Map.of("documentNom", "Document fictif de test"));

        valider(cadre, id)
                .statusCode(409)
                .body("message", containsString("texteSource"))
                .body("message", containsString("correspondance"));

        // Preuve complète mais correspondance non déterminée : toujours refusée.
        Map<String, Object> nonDeterminee = preuveComplete();
        nonDeterminee.put("correspondance", "NON_DETERMINEE");
        modifier(cadre, id, nonDeterminee).statusCode(200);
        valider(cadre, id).statusCode(409);

        consulter(cadre).statusCode(200).body("etat", equalTo("BROUILLON")).body("valideeParId", nullValue());
    }

    /** Un champ fait d'espaces ne vaut pas preuve. */
    @Test
    void validationAvecChampsBlancs_estRefusee() {
        Cadre cadre = cadre();
        Map<String, Object> corps = preuveComplete();
        corps.put("documentNom", "   ");
        corps.put("justification", "\t ");
        String id = creerBrouillon(cadre, corps);

        valider(cadre, id)
                .statusCode(409)
                .body("message", containsString("documentNom"))
                .body("message", containsString("justification"));
        consulter(cadre).statusCode(200).body("etat", equalTo("BROUILLON"));
    }

    // === Rejet ===============================================================

    @Test
    void rejetMotive_estAccepte() {
        Cadre cadre = cadre();
        String id = creerBrouillon(cadre, Map.of("documentNom", "Document fictif de test"));

        rejeter(cadre, id, "Document hors périmètre du bailleur")
                .statusCode(200)
                .body("etat", equalTo("REJETEE"))
                .body("rejeteeParId", equalTo(cadre.adminId()))
                .body("rejeteeLe", notNullValue())
                .body("motifRejet", equalTo("Document hors périmètre du bailleur"));

        // Une rejetée n'est plus vivante : le mapping redevient non documenté.
        consulter(cadre).statusCode(200).body("etat", equalTo("NON_DOCUMENTE"));
    }

    @Test
    void rejetSansMotif_estRefuse() {
        Cadre cadre = cadre();
        String id = creerBrouillon(cadre, Map.of());

        rejeter(cadre, id, "   ").statusCode(400);
        rejeter(cadre, id, null).statusCode(400);

        consulter(cadre).statusCode(200).body("etat", equalTo("BROUILLON")).body("rejeteeParId", nullValue());
    }

    // === Péremption ==========================================================

    /** Périmer défait la validation sans toucher au contenu ni aux marques de modification. */
    @Test
    void peremptionMotivee_dUneValidee_estAcceptee_sansToucherLaModification() {
        Cadre cadre = cadre();
        String id = creerBrouillon(cadre, Map.of());
        modifier(cadre, id, preuveComplete()).statusCode(200).body("modifieeParId", equalTo(cadre.adminId()));

        var validee = valider(cadre, id).statusCode(200).extract().jsonPath();

        var perimee = perimer(cadre, id, "Édition remplacée")
                .statusCode(200)
                .body("etat", equalTo("PERIMEE"))
                .body("perimeeParId", equalTo(cadre.adminId()))
                .body("perimeeLe", notNullValue())
                .body("motifPeremption", equalTo("Édition remplacée"))
                .body("valideeParId", equalTo(cadre.adminId()))
                .extract().jsonPath();

        assertEquals(validee.getString("modifieeParId"), perimee.getString("modifieeParId"));
        assertEquals(validee.getString("modifieeLe"), perimee.getString("modifieeLe"));
        assertEquals(validee.getString("valideeLe"), perimee.getString("valideeLe"));
        assertEquals(validee.getString("texteSource"), perimee.getString("texteSource"));

        consulter(cadre).statusCode(200).body("etat", equalTo("NON_DOCUMENTE"));
    }

    @Test
    void peremptionSansMotif_estRefusee() {
        Cadre cadre = cadre();
        String id = creerValidee(cadre);

        perimer(cadre, id, "").statusCode(400);
        perimer(cadre, id, null).statusCode(400);

        consulter(cadre).statusCode(200).body("etat", equalTo("VALIDEE")).body("perimeeLe", nullValue());
    }

    /** Ni un brouillon ni une rejetée ne se périment : il n'y a pas de validation à défaire. */
    @Test
    void peremptionDUneNonValidee_estRefusee() {
        Cadre cadre = cadre();
        String brouillon = creerBrouillon(cadre, Map.of());
        perimer(cadre, brouillon, "Sans objet").statusCode(409);

        rejeter(cadre, brouillon, "Source introuvable").statusCode(200);
        perimer(cadre, brouillon, "Sans objet").statusCode(409);
    }

    // === Immuabilité =========================================================

    @Test
    void validee_neSeModifiePas_neSeRejettePas_neSeRevalidePas() {
        Cadre cadre = cadre();
        String id = creerValidee(cadre);

        Map<String, Object> reecrit = preuveComplete();
        reecrit.put("texteSource", "Passage réécrit après validation");
        modifier(cadre, id, reecrit).statusCode(409);
        rejeter(cadre, id, "Changement d'avis").statusCode(409);
        valider(cadre, id).statusCode(409);

        consulter(cadre).statusCode(200)
                .body("etat", equalTo("VALIDEE"))
                .body("texteSource", equalTo("Passage fictif rédigé pour le test."));
    }

    @Test
    void rejetee_neSeModifiePas_neSeValidePas_neSePerimePas() {
        Cadre cadre = cadre();
        String id = creerBrouillon(cadre, preuveComplete());
        rejeter(cadre, id, "Correspondance contestée").statusCode(200);

        modifier(cadre, id, preuveComplete()).statusCode(409);
        valider(cadre, id).statusCode(409);
        perimer(cadre, id, "Sans objet").statusCode(409);
        rejeter(cadre, id, "Second rejet").statusCode(409);

        given().header("Authorization", "Bearer " + cadre.jeton())
                .when().get(cadre.url() + "/historique")
                .then().statusCode(200)
                .body("$", hasSize(1))
                .body("[0].etat", equalTo("REJETEE"))
                .body("[0].motifRejet", equalTo("Correspondance contestée"));
    }

    @Test
    void perimee_neSeModifiePlus_etSaPeremptionEstDefinitive() {
        Cadre cadre = cadre();
        String id = creerValidee(cadre);
        perimer(cadre, id, "Édition remplacée").statusCode(200);

        modifier(cadre, id, preuveComplete()).statusCode(409);
        perimer(cadre, id, "Autre motif").statusCode(409);
        rejeter(cadre, id, "Rejet tardif").statusCode(409);
        valider(cadre, id).statusCode(409);

        given().header("Authorization", "Bearer " + cadre.jeton())
                .when().get(cadre.url() + "/historique")
                .then().statusCode(200)
                .body("[0].etat", equalTo("PERIMEE"))
                .body("[0].motifPeremption", equalTo("Édition remplacée"));
    }

    // === Historique et justification vivante =================================

    /** L'historique garde tout, du plus récent au plus ancien : rien n'est écrasé. */
    @Test
    void historique_conserveToutesLesTentatives() {
        Cadre cadre = cadre();
        String rejetee = creerBrouillon(cadre, Map.of());
        rejeter(cadre, rejetee, "Source introuvable").statusCode(200);
        String perimee = creerValidee(cadre);
        perimer(cadre, perimee, "Édition remplacée").statusCode(200);
        String enCours = creerBrouillon(cadre, Map.of());

        given().header("Authorization", "Bearer " + cadre.jeton())
                .when().get(cadre.url() + "/historique")
                .then().statusCode(200)
                .body("$", hasSize(3))
                .body("id", equalTo(List.of(enCours, perimee, rejetee)))
                .body("etat", equalTo(List.of("BROUILLON", "PERIMEE", "REJETEE")));

        consulter(cadre).statusCode(200).body("id", equalTo(enCours));
    }

    @Test
    void nouvelleJustification_apresRejet_estAcceptee() {
        Cadre cadre = cadre();
        String premiere = creerBrouillon(cadre, Map.of());
        rejeter(cadre, premiere, "Source introuvable").statusCode(200);

        String seconde = creerBrouillon(cadre, preuveComplete());
        assertNotEquals(premiere, seconde);
        valider(cadre, seconde).statusCode(200);
    }

    @Test
    void nouvelleJustification_apresPeremption_estAcceptee() {
        Cadre cadre = cadre();
        String premiere = creerValidee(cadre);
        perimer(cadre, premiere, "Édition remplacée").statusCode(200);

        String seconde = creerBrouillon(cadre, preuveComplete());
        assertNotEquals(premiere, seconde);
        consulter(cadre).statusCode(200).body("id", equalTo(seconde)).body("etat", equalTo("BROUILLON"));
    }

    /** Une seule justification vivante par mapping, que la vivante soit brouillon ou validée. */
    @Test
    void unicite_dUneSeuleJustificationVivante() {
        Cadre cadre = cadre();
        String brouillon = creerBrouillon(cadre, Map.of());
        creer(cadre, Map.of()).statusCode(409);

        valider(cadre, brouillon).statusCode(409); // preuve absente, reste brouillon
        modifier(cadre, brouillon, preuveComplete()).statusCode(200);
        valider(cadre, brouillon).statusCode(200);
        creer(cadre, Map.of()).statusCode(409);

        // Sans le service, la base refuse de même.
        String contrainte = contrainteDuRefus(
                "INSERT INTO critere_bailleur_justification (critere_id, bailleur_id, created_by) "
                        + "SELECT ?::uuid, b.id, ?::uuid FROM bailleur b WHERE b.code = ?",
                cadre.critereId(), cadre.adminId(), cadre.bailleurCode());
        assertEquals("cbj_vivante_uidx", contrainte);
    }

    /** Aucune route de suppression, et la base refuse la suppression physique. */
    @Test
    void suppressionPhysique_estRefusee() {
        Cadre cadre = cadre();
        String id = creerBrouillon(cadre, Map.of());

        given().header("Authorization", "Bearer " + cadre.jeton())
                .when().delete(cadre.url() + "/" + id)
                .then().statusCode(anyOf(equalTo(404), equalTo(405)));

        assertEquals("cbj_suppression_interdite",
                contrainteDuRefus("DELETE FROM critere_bailleur_justification WHERE id = ?::uuid", id));
        assertEquals("1", lire("SELECT count(*) FROM critere_bailleur_justification WHERE id = ?::uuid", id));
    }

    // === Déclencheurs et contraintes, éprouvés sans l'API ====================

    /** Les déclencheurs tiennent la règle en SQL direct, chacun sous son nom exact. */
    @Test
    void declencheursSql_refusentSousLeurNomExact() {
        Cadre cadre = cadre();

        // Brouillon : contenu libre, identité figée.
        String brouillon = creerBrouillon(cadre, Map.of());
        executer("UPDATE critere_bailleur_justification SET texte_source = 'Passage modifié en brouillon' "
                + "WHERE id = ?::uuid", brouillon);
        assertEquals("cbj_identite_figee", contrainteDuRefus(
                "UPDATE critere_bailleur_justification SET created_at = created_at - interval '1 day' "
                        + "WHERE id = ?::uuid", brouillon));
        assertEquals("cbj_identite_figee", contrainteDuRefus(
                "UPDATE critere_bailleur_justification SET created_by = (SELECT id FROM utilisateur "
                        + "WHERE id <> created_by LIMIT 1) WHERE id = ?::uuid", brouillon));
        rejeter(cadre, brouillon, "Écarté pour la suite du test").statusCode(200);

        // Rejetée : plus rien ne change, pas même la péremption.
        assertEquals("cbj_immuable_apres_decision", contrainteDuRefus(
                "UPDATE critere_bailleur_justification SET motif_rejet = 'Motif réécrit' WHERE id = ?::uuid",
                brouillon));

        // Validée : ni réécriture, ni rejet.
        String validee = creerValidee(cadre);
        assertEquals("cbj_immuable_apres_decision", contrainteDuRefus(
                "UPDATE critere_bailleur_justification SET texte_source = 'Réécrit' WHERE id = ?::uuid", validee));
        assertEquals("cbj_immuable_apres_decision", contrainteDuRefus(
                "UPDATE critere_bailleur_justification SET validee_par = NULL, validee_le = NULL, "
                        + "rejetee_par = created_by, rejetee_le = now(), motif_rejet = 'x' WHERE id = ?::uuid",
                validee));

        // Péremption à motif blanc refusée par sa contrainte ; une fois posée, définitive.
        assertEquals("cbj_peremption_tracee", contrainteDuRefus(
                "UPDATE critere_bailleur_justification SET perimee_par = created_by, perimee_le = now(), "
                        + "motif_peremption = '  ' WHERE id = ?::uuid", validee));
        perimer(cadre, validee, "Édition remplacée").statusCode(200);
        assertEquals("cbj_peremption_definitive", contrainteDuRefus(
                "UPDATE critere_bailleur_justification SET motif_peremption = 'Autre' WHERE id = ?::uuid", validee));
    }

    /**
     * Un brouillon ne se déplace pas vers un autre mapping, même existant :
     * son historique irait avec lui. Les deux cibles sont de vrais mappings,
     * pour que seul le déclencheur puisse refuser — ni la clé étrangère, ni
     * l'unicité de la justification vivante.
     */
    @Test
    void identiteDUnBrouillon_nePeutEtreDeplaceeVersUnAutreMapping() {
        Cadre cadre = cadre();
        String brouillon = creerBrouillon(cadre, Map.of());

        // Même bailleur, autre critère du même référentiel, rattaché lui aussi.
        String autreCritere = given().header("Authorization", "Bearer " + cadre.jeton())
                .contentType(ContentType.JSON)
                .body(Map.of("code", "DJ-02", "libelle", "Second critère éprouvé"))
                .when().post("/api/v1/referentiels/" + cadre.code() + "/domaines/DJ/criteres")
                .then().statusCode(201)
                .extract().path("id");
        given().header("Authorization", "Bearer " + cadre.jeton())
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", cadre.bailleurCode(), "applicable", true))
                .when().put("/api/v1/referentiels/criteres/" + autreCritere + "/bailleur")
                .then().statusCode(200);

        // Même critère, autre bailleur, rattaché lui aussi.
        String autreBailleur = "ZZTEST_" + suffixe();
        executer("INSERT INTO bailleur (code, nom) VALUES (?, ?)", autreBailleur, "Second bailleur fictif de test");
        given().header("Authorization", "Bearer " + cadre.jeton())
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", autreBailleur, "applicable", true))
                .when().put("/api/v1/referentiels/criteres/" + cadre.critereId() + "/bailleur")
                .then().statusCode(200);

        assertEquals("cbj_identite_figee", contrainteDuRefus(
                "UPDATE critere_bailleur_justification SET critere_id = ?::uuid WHERE id = ?::uuid",
                autreCritere, brouillon));
        assertEquals("cbj_identite_figee", contrainteDuRefus(
                "UPDATE critere_bailleur_justification SET bailleur_id = (SELECT id FROM bailleur WHERE code = ?) "
                        + "WHERE id = ?::uuid", autreBailleur, brouillon));

        assertEquals(cadre.critereId(), lire(
                "SELECT critere_id::text FROM critere_bailleur_justification WHERE id = ?::uuid", brouillon));
        assertEquals(cadre.bailleurCode(), lire("SELECT b.code FROM critere_bailleur_justification j "
                + "JOIN bailleur b ON b.id = j.bailleur_id WHERE j.id = ?::uuid", brouillon));
        consulter(cadre).statusCode(200).body("id", equalTo(brouillon)).body("etat", equalTo("BROUILLON"));
    }

    /** Les contraintes CHECK de décision, chacune isolée pour que son nom soit certain. */
    @Test
    void contraintesDeDecision_refusentSousLeurNomExact() {
        Cadre cadre = cadre();
        String brouillon = creerBrouillon(cadre, Map.of());

        assertEquals("cbj_validation_exige_preuve_complete", contrainteDuRefus(
                "UPDATE critere_bailleur_justification SET validee_par = created_by, validee_le = now() "
                        + "WHERE id = ?::uuid", brouillon));
        assertEquals("cbj_rejet_motive", contrainteDuRefus(
                "UPDATE critere_bailleur_justification SET rejetee_par = created_by, rejetee_le = now() "
                        + "WHERE id = ?::uuid", brouillon));
        assertEquals("cbj_peremption_apres_validation", contrainteDuRefus(
                "UPDATE critere_bailleur_justification SET perimee_par = created_by, perimee_le = now(), "
                        + "motif_peremption = 'Sans validation' WHERE id = ?::uuid", brouillon));
        assertEquals("cbj_confiance_bornee", contrainteDuRefus(
                "UPDATE critere_bailleur_justification SET confiance = 1.5 WHERE id = ?::uuid", brouillon));
        assertEquals("cbj_modification_coherente", contrainteDuRefus(
                "UPDATE critere_bailleur_justification SET modifiee_par = created_by WHERE id = ?::uuid",
                brouillon));

        consulter(cadre).statusCode(200).body("etat", equalTo("BROUILLON"));
    }
}
