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
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;

/** RG07/RG08/RG09/RG34 — référentiel Smartex Sustway (87 critères) et composition dynamique du questionnaire. */
@QuarkusTest
class ReferentielResourceTest {

    @Inject
    JwtService jwtService;

    @Test
    void listerReferentiels_contientSmartexSustway() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().get("/api/v1/referentiels")
                .then()
                .statusCode(200)
                .body("code", hasItem("SMARTEX_SUSTWAY"));
    }

    @Test
    void criteresSmartexSustway_retourneLes87Criteres() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().get("/api/v1/referentiels/SMARTEX_SUSTWAY/criteres")
                .then()
                .statusCode(200)
                .body("$", hasSize(87))
                .body("code", hasItem("GOUV-09"))
                .body("code", hasItem("ENV-01"));
    }

    @Test
    void criteresReferentielInconnu_estRejete() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().get("/api/v1/referentiels/INEXISTANT/criteres")
                .then()
                .statusCode(404);
    }

    @Test
    void questionnaireDynamique_retourneLes87CriteresGeneraux() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = creerEntreprise(utilisateur.token);

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .queryParam("referentiel", "SMARTEX_SUSTWAY")
                .when().get("/api/v1/entreprises/" + entrepriseId + "/questionnaire")
                .then()
                .statusCode(200)
                .body("referentielCode", equalTo("SMARTEX_SUSTWAY"))
                .body("nombreCriteres", equalTo(87))
                .body("criteres", hasSize(87));
    }

    @Test
    void questionnaire_isolationMultiTenant_estRefusePourUnAutreUtilisateur() {
        var utilisateurA = UtilisateurDeTest.creerEtConnecter(jwtService);
        var utilisateurB = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = creerEntreprise(utilisateurA.token);

        given()
                .header("Authorization", "Bearer " + utilisateurB.token)
                .queryParam("referentiel", "SMARTEX_SUSTWAY")
                .when().get("/api/v1/entreprises/" + entrepriseId + "/questionnaire")
                .then()
                .statusCode(403);
    }

    static String creerEntreprise(String token) {
        return given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Référentiel Test",
                        "identifiantLegal", "RCCM-REF-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201)
                .extract().path("entreprise.id");
    }
}
