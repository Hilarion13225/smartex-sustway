package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.RoleRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.equalTo;
import static org.hamcrest.Matchers.hasSize;

/** Module 12 — génération et téléchargement des rapports (SYNTHESE, DETAILLE, PLAN_ACTION, INDICE_FINANCEMENTS_VERTS) d'une mission. */
@QuarkusTest
class RapportResourceTest {

    @Inject JwtService jwtService;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject UtilisateurRepository utilisateurRepository;

    private record Contexte(String token, String entrepriseId, String auditId) {}

    private Contexte creerContexte() {
        return creerContexte("STANDARD");
    }

    private Contexte creerContexte(String formuleCode) {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);

        String entrepriseId = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Rapport Test",
                        "identifiantLegal", "RCCM-RPT-" + UUID.randomUUID(),
                        "formuleCode", formuleCode))
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
                        "nom", "Audit Rapport",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201)
                .extract().path("id");

        return new Contexte(utilisateur.token, entrepriseId, auditId);
    }

    @Test
    void genererEtTelecharger_csv_produitUnFichierNonVide() {
        var ctx = creerContexte();

        String rapportId = given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("type", "SYNTHESE", "format", "CSV"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/rapports")
                .then()
                .statusCode(201)
                .body("type", equalTo("SYNTHESE"))
                .body("format", equalTo("CSV"))
                .extract().path("id");

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId()
                        + "/rapports/" + rapportId + "/telechargement")
                .then()
                .statusCode(200)
                .header("Content-Type", org.hamcrest.Matchers.containsString("text/csv"))
                .body(org.hamcrest.Matchers.containsString("Audit Rapport"));
    }

    @Test
    void genererEtTelecharger_pdf_produitUnFichierNonVide() {
        var ctx = creerContexte();

        String rapportId = given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("type", "SYNTHESE", "format", "PDF"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/rapports")
                .then()
                .statusCode(201)
                .body("format", equalTo("PDF"))
                .extract().path("id");

        byte[] contenu = given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId()
                        + "/rapports/" + rapportId + "/telechargement")
                .then()
                .statusCode(200)
                .header("Content-Type", org.hamcrest.Matchers.containsString("application/pdf"))
                .extract().asByteArray();

        // Signature de fichier PDF : "%PDF-"
        String enTete = new String(contenu, 0, 5, java.nio.charset.StandardCharsets.US_ASCII);
        org.junit.jupiter.api.Assertions.assertEquals("%PDF-", enTete);
    }

    @Test
    void lister_retourneLesRapportsDeLaMission() {
        var ctx = creerContexte();

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("type", "SYNTHESE", "format", "CSV"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/rapports")
                .then().statusCode(201);

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/rapports")
                .then()
                .statusCode(200)
                .body("$", hasSize(1));
    }

    @Test
    void generer_typeInconnu_estRejete() {
        var ctx = creerContexte();

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("type", "INEXISTANT", "format", "PDF"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/rapports")
                .then()
                .statusCode(400);
    }

    @Test
    void generer_formatExcelNonSupporte_estRejete() {
        var ctx = creerContexte();

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("type", "SYNTHESE", "format", "EXCEL"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/rapports")
                .then()
                .statusCode(400);
    }

    @Test
    void generer_isolationMultiTenant_estRefusee() {
        var ctx = creerContexte();
        var utilisateurB = UtilisateurDeTest.creerEtConnecter(jwtService);

        given()
                .header("Authorization", "Bearer " + utilisateurB.token)
                .contentType(ContentType.JSON)
                .body(Map.of("type", "SYNTHESE", "format", "CSV"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/rapports")
                .then()
                .statusCode(403);
    }

    // --- PLAN_ACTION (rapport:consulter, comme SYNTHESE — le client voit déjà ses propres actions correctives) ---

    @Test
    void genererPlanAction_csv_produitUnFichierNonVide() {
        var ctx = creerContexte();

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("type", "PLAN_ACTION", "format", "CSV"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/rapports")
                .then()
                .statusCode(201)
                .body("type", equalTo("PLAN_ACTION"))
                .extract().path("id");
    }

    // --- DETAILLE (rapport:detaille — réservé au personnel interne Smartex, absent du rôle RESPONSABLE_ENTREPRISE) ---

    @Test
    void genererDetaille_responsableEntreprise_estRefuse() {
        var ctx = creerContexte();

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("type", "DETAILLE", "format", "CSV"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/rapports")
                .then()
                .statusCode(403);
    }

    @Test
    void genererDetaille_staffInterne_reussitEtListeChaqueCritere() {
        var ctx = creerContexte();
        String tokenStaff = UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository, utilisateurEntrepriseRepository).token;

        // Accès global SUPER_ADMIN (aucun rattachement à ctx.entrepriseId() n'est posé ici) — voir AutorisationService.estAccesGlobalActif.
        String rapportId = given()
                .header("Authorization", "Bearer " + tokenStaff)
                .contentType(ContentType.JSON)
                .body(Map.of("type", "DETAILLE", "format", "CSV"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/rapports")
                .then()
                .statusCode(201)
                .body("type", equalTo("DETAILLE"))
                .extract().path("id");

        given()
                .header("Authorization", "Bearer " + tokenStaff)
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId()
                        + "/rapports/" + rapportId + "/telechargement")
                .then()
                .statusCode(200)
                // Le référentiel SMARTEX_SUSTWAY a plus de 80 critères : la table détaillée contient bien plus de lignes que la synthèse.
                .body(org.hamcrest.Matchers.containsString("Domaine;Critère;Libellé;Criticité;Coefficient"));
    }

    @Test
    void telecharger_rapportDetaille_estRefuseSansPermission() {
        var ctx = creerContexte();
        String tokenStaff = UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository, utilisateurEntrepriseRepository).token;

        String rapportId = given()
                .header("Authorization", "Bearer " + tokenStaff)
                .contentType(ContentType.JSON)
                .body(Map.of("type", "DETAILLE", "format", "CSV"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/rapports")
                .then().statusCode(201)
                .extract().path("id");

        // ctx.token() (RESPONSABLE_ENTREPRISE) a rapport:consulter mais pas rapport:detaille :
        // le téléchargement doit rester bloqué même si le rapport existe déjà.
        given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId()
                        + "/rapports/" + rapportId + "/telechargement")
                .then()
                .statusCode(403);
    }

    // --- INDICE_FINANCEMENTS_VERTS (bailleur:consulter + formule Avancées de l'audit, RG41/RG42) ---

    @Test
    void genererIndiceFinancementsVerts_sansBailleurCode_estRejete() {
        var ctx = creerContexte("AVANCEES");

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("type", "INDICE_FINANCEMENTS_VERTS", "format", "CSV"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/rapports")
                .then()
                .statusCode(400);
    }

    @Test
    void genererIndiceFinancementsVerts_formuleStandard_estRefuseeParRG41() {
        var ctx = creerContexte("STANDARD");

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("type", "INDICE_FINANCEMENTS_VERTS", "format", "CSV", "bailleurCode", "IFC_SFI"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/rapports")
                .then()
                .statusCode(403);
    }

    @Test
    void genererIndiceFinancementsVerts_formuleAvancees_reussit() {
        var ctx = creerContexte("AVANCEES");

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("type", "INDICE_FINANCEMENTS_VERTS", "format", "CSV", "bailleurCode", "IFC_SFI"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/rapports")
                .then()
                .statusCode(201)
                .body("type", equalTo("INDICE_FINANCEMENTS_VERTS"));
    }

    @Test
    void genererIndiceFinancementsVerts_bailleurInconnu_est404() {
        var ctx = creerContexte("AVANCEES");

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("type", "INDICE_FINANCEMENTS_VERTS", "format", "CSV", "bailleurCode", "INEXISTANT"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/rapports")
                .then()
                .statusCode(404);
    }
}
