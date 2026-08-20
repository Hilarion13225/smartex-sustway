package com.smartexsustway.api.resource;

import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.equalTo;
import static org.hamcrest.Matchers.hasItem;

/**
 * RG15 — association de preuves aux critères d'une mission.
 *
 * Toute cette classe nécessite MinIO ET ClamAV réellement démarrés
 * (docker compose up -d minio clamav) : une preuve pointe obligatoirement
 * vers un document déjà téléversé et scanné SAIN (voir DocumentResource).
 */
@QuarkusTest
class PreuveResourceTest {

    @Inject
    JwtService jwtService;

    private record Contexte(String token, String entrepriseId, String auditId) {}

    private Contexte creerContexteComplet() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);

        String entrepriseId = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Preuve Test",
                        "identifiantLegal", "RCCM-PRV-" + UUID.randomUUID(),
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
                        "nom", "Audit Preuves",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201)
                .extract().path("id");

        return new Contexte(utilisateur.token, entrepriseId, auditId);
    }

    @Test
    void creerPreuve_associeUnDocumentAPlusieursCriteres() {
        var ctx = creerContexteComplet();

        String documentId = given()
                .header("Authorization", "Bearer " + ctx.token())
                .multiPart("fichier", "politique-anti-corruption.pdf", "%PDF-1.4 contenu de test".getBytes(), "application/pdf")
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/documents")
                .then().statusCode(201)
                .extract().path("id");

        List<Map<String, Object>> criteres = given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/criteres")
                .then().statusCode(200)
                .extract().jsonPath().getList("$");

        // RG15 : un même document peut couvrir plusieurs critères (ici GOUV-07 et GOUV-08).
        List<String> auditCritereIds = criteres.stream()
                .filter(c -> "GOUV-07".equals(c.get("critereCode")) || "GOUV-08".equals(c.get("critereCode")))
                .map(c -> (String) c.get("id"))
                .toList();

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "documentId", documentId,
                        "description", "Politique anti-corruption signée par la direction",
                        "type", "JUSTIFICATIF",
                        "auditCritereIds", auditCritereIds))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/preuves")
                .then()
                .statusCode(201)
                .body("documentId", equalTo(documentId))
                .body("critereCodes", hasItem("GOUV-07"))
                .body("critereCodes", hasItem("GOUV-08"));

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/preuves")
                .then()
                .statusCode(200)
                .body("$", org.hamcrest.Matchers.hasSize(1));
    }

    @Test
    void creerPreuve_critereHorsDeLaMission_estRejete() {
        var ctx = creerContexteComplet();

        String documentId = given()
                .header("Authorization", "Bearer " + ctx.token())
                .multiPart("fichier", "document.pdf", "%PDF-1.4 x".getBytes(), "application/pdf")
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/documents")
                .then().statusCode(201)
                .extract().path("id");

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "documentId", documentId,
                        "auditCritereIds", List.of(UUID.randomUUID().toString())))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/preuves")
                .then()
                .statusCode(400);
    }
}
