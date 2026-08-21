package com.smartexsustway.api.resource;

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
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;

/** Module 12 — génération et téléchargement du rapport de synthèse (CSV/PDF) d'une mission. */
@QuarkusTest
class RapportResourceTest {

    @Inject
    JwtService jwtService;

    private record Contexte(String token, String entrepriseId, String auditId) {}

    private Contexte creerContexte() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);

        String entrepriseId = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Rapport Test",
                        "identifiantLegal", "RCCM-RPT-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD",
                        "periodicite", "ANNUELLE"))
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
    void generer_typeNonSupporte_estRejete() {
        var ctx = creerContexte();

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("type", "PLAN_ACTION", "format", "PDF"))
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
}
