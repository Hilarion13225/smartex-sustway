package com.smartexsustway.api.resource;

import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.equalTo;

@QuarkusTest
class EntrepriseResourceTest {

    @Inject
    JwtService jwtService;

    @Test
    void creerEntreprise_puisLaRetrouverDansMesEntreprises() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String identifiantLegal = "RCCM-TEST-" + UUID.randomUUID();

        String entrepriseId = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of("raisonSociale", "Entreprise Test", "identifiantLegal", identifiantLegal))
                .when().post("/api/v1/entreprises")
                .then()
                .statusCode(201)
                .body("raisonSociale", equalTo("Entreprise Test"))
                .body("identifiantLegal", equalTo(identifiantLegal))
                .extract().path("id");

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().get("/api/v1/entreprises")
                .then()
                .statusCode(200)
                .body("id", org.hamcrest.Matchers.hasItem(entrepriseId));

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().get("/api/v1/entreprises/" + entrepriseId)
                .then()
                .statusCode(200)
                .body("identifiantLegal", equalTo(identifiantLegal));
    }

    @Test
    void creerEntreprise_identifiantLegalDuplique_estRefuse() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String identifiantLegal = "RCCM-TEST-" + UUID.randomUUID();

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of("raisonSociale", "Entreprise Test", "identifiantLegal", identifiantLegal))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201);

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of("raisonSociale", "Autre Raison Sociale", "identifiantLegal", identifiantLegal))
                .when().post("/api/v1/entreprises")
                .then().statusCode(409);
    }

    @Test
    void accederAuxEntreprises_sansToken_estRefuse() {
        given().when().get("/api/v1/entreprises").then().statusCode(401);
    }

    @Test
    void isolationMultiTenant_unUtilisateurNeVoitPasLEntrepriseDunAutre() {
        var utilisateurA = UtilisateurDeTest.creerEtConnecter(jwtService);
        var utilisateurB = UtilisateurDeTest.creerEtConnecter(jwtService);

        String entrepriseIdA = given()
                .header("Authorization", "Bearer " + utilisateurA.token)
                .contentType(ContentType.JSON)
                .body(Map.of("raisonSociale", "Entreprise A", "identifiantLegal", "RCCM-A-" + UUID.randomUUID()))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201)
                .extract().path("id");

        // B ne doit pas pouvoir consulter l'entreprise de A (exigence §1.4 —
        // isolation stricte, indépendante de toute permission accordée par ailleurs).
        given()
                .header("Authorization", "Bearer " + utilisateurB.token)
                .when().get("/api/v1/entreprises/" + entrepriseIdA)
                .then()
                .statusCode(403);
    }
}
