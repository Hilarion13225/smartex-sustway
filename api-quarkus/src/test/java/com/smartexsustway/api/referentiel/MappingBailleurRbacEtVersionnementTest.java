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

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Qui peut justifier un mapping bailleur, et ce que deviennent les
 * justifications quand le référentiel évolue (V74-A).
 *
 * <p>Droits : seul un SUPER_ADMIN effectivement actif — compte, rattachement
 * et rôle relus en base — y accède. Un jeton qui survit à une révocation ne
 * suffit pas. ADMIN_AUDIT, admis sur les tags d'applicabilité, ne l'est pas
 * ici, et n'est de toute façon plus attribuable (V44).
 *
 * <p>Versions : justifier ne modifie aucune table figée, donc une version
 * publiée se justifie. Un mapping justifié ne se supprime plus, ni seul ni
 * avec sa version brouillon : l'API répond 409 et oriente vers
 * {@code applicable = false}. La dérivation recopie les mappings mais pas
 * leurs justifications ; le report est un geste explicite, qui ne transfère
 * aucune décision.
 *
 * <p>Même décor que MappingBailleurJustificationTest : référentiels
 * {@code TEST_JUS_*}, bailleurs {@code ZZTEST_*}, documents fictifs.
 * SMARTEX_SUSTWAY et IFC_SFI ne sont jamais touchés. Le seul état global
 * modifié — le statut du rôle SUPER_ADMIN — est rétabli en {@code finally}.
 */
@QuarkusTest
class MappingBailleurRbacEtVersionnementTest {

    @Inject JwtService jwtService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject AgroalDataSource dataSource;

    private record Cadre(String jeton, String adminId, String code, String critereId, String bailleurCode) {
        String url() {
            return urlJustification(critereId, bailleurCode);
        }
    }

    private static String urlJustification(String critereId, String bailleurCode) {
        return "/api/v1/referentiels/criteres/" + critereId + "/bailleur/" + bailleurCode + "/justification";
    }

    private static String urlMapping(String critereId) {
        return "/api/v1/referentiels/criteres/" + critereId + "/bailleur";
    }

    // --- Construction ---------------------------------------------------

    private static String suffixe() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
    }

    private UtilisateurDeTest superAdmin() {
        return UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository, utilisateurEntrepriseRepository);
    }

    /** Référentiel neuf (version 1.0 en brouillon), un critère, un bailleur fictif, sans mapping. */
    private Cadre cadreSansMapping() {
        var admin = superAdmin();
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

        return new Cadre(admin.token, admin.id, code, critereId, bailleurCode);
    }

    private Cadre cadre() {
        Cadre cadre = cadreSansMapping();
        definirMapping(cadre, true).statusCode(200);
        return cadre;
    }

    private ValidatableResponse definirMapping(Cadre cadre, boolean applicable) {
        return given().header("Authorization", "Bearer " + cadre.jeton())
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", cadre.bailleurCode(), "applicable", applicable))
                .when().put(urlMapping(cadre.critereId()))
                .then();
    }

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
        corps.put("correspondance", "PARTIELLE");
        corps.put("justification", "Justification fictive de test.");
        return corps;
    }

    private String creerBrouillon(String jeton, String url, Map<String, Object> corps) {
        return given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(corps)
                .when().post(url)
                .then().statusCode(201)
                .extract().path("id");
    }

    private ValidatableResponse valider(String jeton, String url, String id) {
        return given().header("Authorization", "Bearer " + jeton)
                .when().post(url + "/" + id + "/validation")
                .then();
    }

    private ValidatableResponse consulter(String jeton, String url) {
        return given().header("Authorization", "Bearer " + jeton)
                .when().get(url)
                .then();
    }

    private void publier(Cadre cadre, String numero) {
        given().header("Authorization", "Bearer " + cadre.jeton())
                .when().post("/api/v1/referentiels/" + cadre.code() + "/versions/" + numero + "/publication")
                .then().statusCode(200)
                .body("statut", equalTo("PUBLIEE"));
    }

    private void deriver(Cadre cadre, String numero) {
        given().header("Authorization", "Bearer " + cadre.jeton())
                .contentType(ContentType.JSON)
                .body(Map.of("numero", numero))
                .when().post("/api/v1/referentiels/" + cadre.code() + "/versions")
                .then().statusCode(201);
    }

    private String critereDeLaVersion(Cadre cadre, String numero) {
        return lire("SELECT c.id::text FROM critere c "
                        + "JOIN referentiel_version v ON v.id = c.referentiel_version_id "
                        + "JOIN referentiel r ON r.id = v.referentiel_id "
                        + "WHERE r.code = ? AND v.numero = ? AND c.code = 'DJ-01'",
                cadre.code(), numero);
    }

    /** Un compte porteur d'un rôle client sur sa propre organisation. */
    private String jetonAvecRole(String roleCode) {
        var candidat = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = given()
                .header("Authorization", "Bearer " + candidat.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Justification Mapping",
                        "identifiantLegal", "RCCM-ZZDEMO-JUS-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201).extract().path("entreprise.id");

        if (!"RESPONSABLE_ENTREPRISE".equals(roleCode)) {
            executer("UPDATE utilisateur_entreprise SET role_id = (SELECT id FROM role WHERE code = ?) "
                    + "WHERE utilisateur_id = ?::uuid AND entreprise_id = ?::uuid", roleCode, candidat.id, entrepriseId);
        }
        return given().contentType(ContentType.JSON)
                .body(Map.of("email", candidat.email, "motDePasse", candidat.motDePasse))
                .when().post("/api/v1/auth/connexion")
                .then().statusCode(200).extract().path("token");
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

    private static void lier(PreparedStatement requete, Object... parametres) throws SQLException {
        for (int i = 0; i < parametres.length; i++) {
            requete.setObject(i + 1, parametres[i]);
        }
    }

    // === Droits ==============================================================

    @Test
    void superAdminActif_accede() {
        Cadre cadre = cadre();

        consulter(cadre.jeton(), cadre.url()).statusCode(200).body("etat", equalTo("NON_DOCUMENTE"));
        String id = creerBrouillon(cadre.jeton(), cadre.url(), preuveComplete());
        valider(cadre.jeton(), cadre.url(), id).statusCode(200).body("etat", equalTo("VALIDEE"));
    }

    @Test
    void responsableEntreprise_estRefuse() {
        Cadre cadre = cadre();
        String jeton = jetonAvecRole("RESPONSABLE_ENTREPRISE");

        consulter(jeton, cadre.url()).statusCode(403);
        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(preuveComplete())
                .when().post(cadre.url())
                .then().statusCode(403);

        consulter(cadre.jeton(), cadre.url() + "/historique").statusCode(200).body("$", hasSize(0));
    }

    @Test
    void collaborateur_estRefuse() {
        Cadre cadre = cadre();
        String id = creerBrouillon(cadre.jeton(), cadre.url(), preuveComplete());
        String jeton = jetonAvecRole("COLLABORATEUR");

        consulter(jeton, cadre.url()).statusCode(403);
        valider(jeton, cadre.url(), id).statusCode(403);

        consulter(cadre.jeton(), cadre.url()).statusCode(200).body("etat", equalTo("BROUILLON"));
    }

    @Test
    void sansJeton_estNonAuthentifie() {
        Cadre cadre = cadre();

        given().when().get(cadre.url()).then().statusCode(401);
        given().contentType(ContentType.JSON).body(Map.of())
                .when().post(cadre.url())
                .then().statusCode(401);
    }

    /** Le jeton porte encore SUPER_ADMIN, mais le rattachement qui le fondait est révoqué. */
    @Test
    void rattachementRevoque_avecJetonEncoreValide_estRefuse() {
        Cadre cadre = cadre();
        consulter(cadre.jeton(), cadre.url()).statusCode(200);

        executer("UPDATE utilisateur_entreprise SET statut = 'INACTIF' WHERE utilisateur_id = ?::uuid",
                cadre.adminId());

        consulter(cadre.jeton(), cadre.url()).statusCode(403);
        given().header("Authorization", "Bearer " + cadre.jeton())
                .contentType(ContentType.JSON)
                .body(Map.of())
                .when().post(cadre.url())
                .then().statusCode(403);
    }

    /** Même jeton, compte suspendu : refusé. */
    @Test
    void compteSuspendu_avecJetonEncoreValide_estRefuse() {
        Cadre cadre = cadre();
        consulter(cadre.jeton(), cadre.url()).statusCode(200);

        executer("UPDATE utilisateur SET statut = 'SUSPENDU' WHERE id = ?::uuid", cadre.adminId());

        consulter(cadre.jeton(), cadre.url()).statusCode(403);
    }

    /**
     * ADMIN_AUDIT, désactivé par V44, ne peut plus être attribué : le
     * déclencheur refuse, sans contournement. Personne ne peut donc entrer ici
     * par ce rôle, et le service l'exclut de toute façon.
     */
    @Test
    void adminAudit_nEstPasAttribuable() {
        var candidat = superAdmin();

        SQLException refus = assertThrows(SQLException.class, () -> {
            try (Connection connexion = dataSource.getConnection();
                 PreparedStatement requete = connexion.prepareStatement(
                         "UPDATE utilisateur_entreprise SET role_id = (SELECT id FROM role WHERE code = 'ADMIN_AUDIT') "
                                 + "WHERE utilisateur_id = ?::uuid")) {
                requete.setObject(1, candidat.id);
                requete.executeUpdate();
            }
        });
        assertEquals("23514", refus.getSQLState());

        assertEquals("SUPER_ADMIN", lire("SELECT r.code FROM utilisateur_entreprise ue "
                + "JOIN role r ON r.id = ue.role_id WHERE ue.utilisateur_id = ?::uuid", candidat.id));
    }

    /**
     * Rôle SUPER_ADMIN désactivé : ses porteurs perdent l'accès, jeton ou non.
     * Le statut du rôle est global à la base ; il est rétabli quoi qu'il arrive.
     */
    @Test
    void roleSuperAdminInactif_estRefuse() {
        Cadre cadre = cadre();
        consulter(cadre.jeton(), cadre.url()).statusCode(200);

        try {
            executer("UPDATE role SET statut = 'INACTIF' WHERE code = 'SUPER_ADMIN'");
            consulter(cadre.jeton(), cadre.url()).statusCode(403);
        } finally {
            executer("UPDATE role SET statut = 'ACTIF' WHERE code = 'SUPER_ADMIN'");
        }

        assertEquals("ACTIF", lire("SELECT statut::text FROM role WHERE code = 'SUPER_ADMIN'"));
        consulter(cadre.jeton(), cadre.url()).statusCode(200);
    }

    // === Versions ============================================================

    /** Justifier ne modifie aucune table figée : une version publiée se justifie et se valide. */
    @Test
    void versionPubliee_seJustifieEtSeValide() {
        Cadre cadre = cadre();
        String avantPublication = creerBrouillon(cadre.jeton(), cadre.url(), preuveComplete());
        publier(cadre, "1.0");

        valider(cadre.jeton(), cadre.url(), avantPublication).statusCode(200).body("etat", equalTo("VALIDEE"));

        given().header("Authorization", "Bearer " + cadre.jeton())
                .contentType(ContentType.JSON)
                .body(Map.of("motif", "Édition remplacée"))
                .when().post(cadre.url() + "/" + avantPublication + "/peremption")
                .then().statusCode(200).body("etat", equalTo("PERIMEE"));

        String apresPublication = creerBrouillon(cadre.jeton(), cadre.url(), preuveComplete());
        valider(cadre.jeton(), cadre.url(), apresPublication).statusCode(200).body("etat", equalTo("VALIDEE"));
    }

    /** Un mapping justifié ne se supprime plus : 409, et l'orientation vers applicable = false. */
    @Test
    void suppressionDUnMappingJustifie_estRefuseeEn409() {
        Cadre cadre = cadre();
        creerBrouillon(cadre.jeton(), cadre.url(), Map.of());

        given().header("Authorization", "Bearer " + cadre.jeton())
                .when().delete(urlMapping(cadre.critereId()) + "/" + cadre.bailleurCode())
                .then().statusCode(409)
                .body("message", containsString("applicable = false"))
                .body(not(containsString("cbj_")))
                .body(not(containsString("critere_bailleur")));

        consulter(cadre.jeton(), urlMapping(cadre.critereId()))
                .statusCode(200)
                .body("bailleurCode", hasItem(cadre.bailleurCode()));

        // La voie indiquée fonctionne, et la justification reste.
        definirMapping(cadre, false).statusCode(200).body("applicable", equalTo(false));
        consulter(cadre.jeton(), cadre.url()).statusCode(200).body("etat", equalTo("BROUILLON"));
    }

    /** La cascade depuis une version brouillon bute sur la même règle, et rien n'est supprimé. */
    @Test
    void suppressionDUneVersionBrouillonJustifiee_estRefuseeEn409() {
        Cadre cadre = cadre();
        creerBrouillon(cadre.jeton(), cadre.url(), Map.of());

        given().header("Authorization", "Bearer " + cadre.jeton())
                .when().delete("/api/v1/referentiels/" + cadre.code() + "/versions/1.0")
                .then().statusCode(409)
                .body("message", containsString("applicable = false"))
                .body(not(containsString("cbj_")));

        given().header("Authorization", "Bearer " + cadre.jeton())
                .when().get("/api/v1/referentiels/" + cadre.code() + "/versions")
                .then().statusCode(200)
                .body("numero", hasItem("1.0"));
        consulter(cadre.jeton(), cadre.url()).statusCode(200).body("etat", equalTo("BROUILLON"));
    }

    /**
     * La dérivation recopie le mapping, jamais sa justification : la nouvelle
     * version part non documentée.
     */
    @Test
    void derivation_neTransfereAucuneJustificationAutomatiquement() {
        Cadre cadre = cadre();
        String source = creerBrouillon(cadre.jeton(), cadre.url(), preuveComplete());
        valider(cadre.jeton(), cadre.url(), source).statusCode(200);
        publier(cadre, "1.0");
        deriver(cadre, "2.0");

        String cible = critereDeLaVersion(cadre, "2.0");
        assertNotNull(cible);
        assertNotEquals(cadre.critereId(), cible);

        consulter(cadre.jeton(), urlMapping(cible)).statusCode(200).body("bailleurCode", hasItem(cadre.bailleurCode()));
        consulter(cadre.jeton(), urlJustification(cible, cadre.bailleurCode()))
                .statusCode(200).body("etat", equalTo("NON_DOCUMENTE"));
        consulter(cadre.jeton(), urlJustification(cible, cadre.bailleurCode()) + "/historique")
                .statusCode(200).body("$", hasSize(0));

        consulter(cadre.jeton(), cadre.url()).statusCode(200).body("id", equalTo(source)).body("etat", equalTo("VALIDEE"));
    }

    /** Le report reprend le contenu vers la version dérivée, et journalise sa source sans entreprise. */
    @Test
    void reportV56_reprendLeContenuVersLaVersionDerivee() {
        Cadre cadre = cadre();
        String source = creerBrouillon(cadre.jeton(), cadre.url(), preuveComplete());
        valider(cadre.jeton(), cadre.url(), source).statusCode(200);
        publier(cadre, "1.0");
        deriver(cadre, "2.0");
        String cible = critereDeLaVersion(cadre, "2.0");
        String urlCible = urlJustification(cible, cadre.bailleurCode());

        String copie = given().header("Authorization", "Bearer " + cadre.jeton())
                .contentType(ContentType.JSON)
                .body(Map.of("sourceCritereId", cadre.critereId()))
                .when().post(urlCible + "/report")
                .then().statusCode(201)
                .body("critereId", equalTo(cible))
                .body("etat", equalTo("BROUILLON"))
                .body("documentNom", equalTo("Document fictif de test"))
                .body("documentEdition", equalTo("Édition de test"))
                .body("documentOrganisme", equalTo("Organisme fictif"))
                .body("documentUrl", equalTo("https://example.invalid/document-de-test"))
                .body("referenceOfficielle", equalTo("REF-TEST-1"))
                .body("titreOfficiel", equalTo("Titre fictif"))
                .body("texteSource", equalTo("Passage fictif rédigé pour le test."))
                .body("localisation.page", equalTo(12))
                .body("origine", equalTo("CONTENU_HUMAIN"))
                .body("correspondance", equalTo("PARTIELLE"))
                .body("justification", equalTo("Justification fictive de test."))
                .extract().path("id");
        assertNotEquals(source, copie);

        // La source n'a pas bougé.
        consulter(cadre.jeton(), cadre.url()).statusCode(200).body("id", equalTo(source)).body("etat", equalTo("VALIDEE"));

        // Un second report bute sur la justification désormais en cours.
        given().header("Authorization", "Bearer " + cadre.jeton())
                .contentType(ContentType.JSON)
                .body(Map.of("sourceCritereId", cadre.critereId()))
                .when().post(urlCible + "/report")
                .then().statusCode(409);

        String details = lire("SELECT details::text FROM audit_log WHERE action = 'JUSTIFICATION_MAPPING_REPORTEE' "
                + "AND entite = 'critere_bailleur_justification' AND entite_id = ?::uuid AND entreprise_id IS NULL", copie);
        assertNotNull(details);
        assertTrue(details.contains(source), "La source du report doit figurer au journal");
    }

    /** Hors du parent direct, pas de report : ni depuis la version elle-même, ni depuis un autre référentiel. */
    @Test
    void report_horsDuParentDirect_estRefuse() {
        Cadre cadre = cadre();
        String source = creerBrouillon(cadre.jeton(), cadre.url(), preuveComplete());
        valider(cadre.jeton(), cadre.url(), source).statusCode(200);
        publier(cadre, "1.0");
        deriver(cadre, "2.0");
        String cible = critereDeLaVersion(cadre, "2.0");
        String urlCible = urlJustification(cible, cadre.bailleurCode());

        // La version 1.0 ne dérive de rien : on ne reporte pas vers elle.
        given().header("Authorization", "Bearer " + cadre.jeton())
                .contentType(ContentType.JSON)
                .body(Map.of("sourceCritereId", cible))
                .when().post(cadre.url() + "/report")
                .then().statusCode(409);

        // Un critère d'un autre référentiel n'est pas une source.
        Cadre autre = cadre();
        given().header("Authorization", "Bearer " + cadre.jeton())
                .contentType(ContentType.JSON)
                .body(Map.of("sourceCritereId", autre.critereId()))
                .when().post(urlCible + "/report")
                .then().statusCode(409);

        // Source absente de la requête, ou inconnue.
        given().header("Authorization", "Bearer " + cadre.jeton())
                .contentType(ContentType.JSON)
                .body(Map.of())
                .when().post(urlCible + "/report")
                .then().statusCode(400);
        given().header("Authorization", "Bearer " + cadre.jeton())
                .contentType(ContentType.JSON)
                .body(Map.of("sourceCritereId", UUID.randomUUID().toString()))
                .when().post(urlCible + "/report")
                .then().statusCode(404);

        consulter(cadre.jeton(), urlCible).statusCode(200).body("etat", equalTo("NON_DOCUMENTE"));
    }

    /** Aucune décision ne voyage : la copie d'une validée naît brouillon, créée par l'appelant. */
    @Test
    void report_neTransfereAucuneDecision() {
        Cadre cadre = cadre();
        String source = creerBrouillon(cadre.jeton(), cadre.url(), preuveComplete());
        valider(cadre.jeton(), cadre.url(), source).statusCode(200);
        publier(cadre, "1.0");
        deriver(cadre, "2.0");
        String cible = critereDeLaVersion(cadre, "2.0");

        var autreAdmin = superAdmin();
        given().header("Authorization", "Bearer " + autreAdmin.token)
                .contentType(ContentType.JSON)
                .body(Map.of("sourceCritereId", cadre.critereId()))
                .when().post(urlJustification(cible, cadre.bailleurCode()) + "/report")
                .then().statusCode(201)
                .body("etat", equalTo("BROUILLON"))
                .body("valideeParId", nullValue())
                .body("valideeLe", nullValue())
                .body("rejeteeParId", nullValue())
                .body("rejeteeLe", nullValue())
                .body("motifRejet", nullValue())
                .body("perimeeParId", nullValue())
                .body("perimeeLe", nullValue())
                .body("motifPeremption", nullValue())
                .body("modifieeParId", nullValue())
                .body("modifieeLe", nullValue())
                .body("creeParId", equalTo(autreAdmin.id))
                .body("creeLe", notNullValue());
    }

    /**
     * Le report exige une cible qui existe et un mapping sur cette cible :
     * sans lui, il n'y a rien à justifier, et la réponse est 404 comme sur les
     * autres routes. Rien n'est écrit, et la source reste intacte.
     */
    @Test
    void report_versCibleInexistanteOuSansMapping_estRefuseEn404() {
        Cadre cadre = cadre();
        String source = creerBrouillon(cadre.jeton(), cadre.url(), preuveComplete());
        valider(cadre.jeton(), cadre.url(), source).statusCode(200);
        publier(cadre, "1.0");
        deriver(cadre, "2.0");
        String cible = critereDeLaVersion(cadre, "2.0");

        // Cible inexistante.
        given().header("Authorization", "Bearer " + cadre.jeton())
                .contentType(ContentType.JSON)
                .body(Map.of("sourceCritereId", cadre.critereId()))
                .when().post(urlJustification(UUID.randomUUID().toString(), cadre.bailleurCode()) + "/report")
                .then().statusCode(404);

        // Mapping cible absent : la dérivation l'avait recopié, il est retiré
        // de la version brouillon par la route existante, faute de justification.
        given().header("Authorization", "Bearer " + cadre.jeton())
                .when().delete(urlMapping(cible) + "/" + cadre.bailleurCode())
                .then().statusCode(204);
        given().header("Authorization", "Bearer " + cadre.jeton())
                .contentType(ContentType.JSON)
                .body(Map.of("sourceCritereId", cadre.critereId()))
                .when().post(urlJustification(cible, cadre.bailleurCode()) + "/report")
                .then().statusCode(404);

        assertEquals("0", lire("SELECT count(*) FROM critere_bailleur_justification WHERE critere_id = ?::uuid", cible));
        consulter(cadre.jeton(), cadre.url()).statusCode(200).body("id", equalTo(source)).body("etat", equalTo("VALIDEE"));
        consulter(cadre.jeton(), cadre.url() + "/historique").statusCode(200).body("$", hasSize(1));
    }

    // === Isolation ===========================================================

    /**
     * Le catalogue n'expose rien des justifications, une justification ne
     * s'atteint pas sous un autre mapping, et le journal ne l'attribue à
     * aucune entreprise.
     */
    @Test
    void isolationDuCatalogue() {
        Cadre cadre = cadre();
        String passage = "Passage isolé " + UUID.randomUUID();
        Map<String, Object> corps = preuveComplete();
        corps.put("texteSource", passage);
        String id = creerBrouillon(cadre.jeton(), cadre.url(), corps);

        given().header("Authorization", "Bearer " + cadre.jeton())
                .when().get("/api/v1/referentiels/" + cadre.code() + "/criteres")
                .then().statusCode(200)
                .body(not(containsString(passage)))
                .body(not(containsString("texteSource")));

        Cadre autre = cadre();
        given().header("Authorization", "Bearer " + autre.jeton())
                .contentType(ContentType.JSON)
                .body(preuveComplete())
                .when().put(autre.url() + "/" + id)
                .then().statusCode(404);
        valider(autre.jeton(), autre.url(), id).statusCode(404);
        consulter(autre.jeton(), autre.url()).statusCode(200).body("etat", equalTo("NON_DOCUMENTE"));

        assertEquals("0", lire("SELECT count(*) FROM audit_log WHERE entite = 'critere_bailleur_justification' "
                + "AND entite_id = ?::uuid AND entreprise_id IS NOT NULL", id));
        assertEquals("1", lire("SELECT count(*) FROM audit_log WHERE entite = 'critere_bailleur_justification' "
                + "AND entite_id = ?::uuid AND action = 'JUSTIFICATION_MAPPING_CREEE' AND entreprise_id IS NULL", id));
    }

    // === Non-régression de CritereBailleurResource ===========================

    /** Les trois routes du mapping, voisines des nouvelles, répondent comme avant. */
    @Test
    void routesDuMapping_restentInchangees() {
        Cadre cadre = cadreSansMapping();

        definirMapping(cadre, true)
                .statusCode(200)
                .body("bailleurCode", equalTo(cadre.bailleurCode()))
                .body("applicable", equalTo(true));

        consulter(cadre.jeton(), urlMapping(cadre.critereId()))
                .statusCode(200)
                .body("bailleurCode", hasItem(cadre.bailleurCode()));

        given().header("Authorization", "Bearer " + cadre.jeton())
                .when().delete(urlMapping(cadre.critereId()) + "/" + cadre.bailleurCode())
                .then().statusCode(204);

        consulter(cadre.jeton(), urlMapping(cadre.critereId()))
                .statusCode(200)
                .body("bailleurCode", not(hasItem(cadre.bailleurCode())));

        // Mapping retiré : plus rien à justifier.
        consulter(cadre.jeton(), cadre.url()).statusCode(404);
    }
}
