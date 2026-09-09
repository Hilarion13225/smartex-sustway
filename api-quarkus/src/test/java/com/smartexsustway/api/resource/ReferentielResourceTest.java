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

/** RG07/RG08/RG09/RG34 — référentiel Smartex Sustway (catalogue réel, 92 critères) et composition dynamique du questionnaire. */
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

    /**
     * Le catalogue servi est le catalogue réel, semé depuis
     * referentiel-source : 92 critères aux codes du questionnaire, et non les
     * 87 de la grille que semaient V11 et V20. Voir CatalogueReelTest pour la
     * comparaison exhaustive avec la source.
     */
    @Test
    void criteresSmartexSustway_retourneLeCatalogueReel() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().get("/api/v1/referentiels/SMARTEX_SUSTWAY/criteres")
                .then()
                .statusCode(200)
                .body("$", hasSize(92))
                .body("code", hasItem("D2-14"))
                .body("code", hasItem("D4-47"));
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
    void questionnaireDynamique_retourneLesCriteresGenerauxDuCatalogueReel() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = creerEntreprise(utilisateur.token);

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .queryParam("referentiel", "SMARTEX_SUSTWAY")
                .when().get("/api/v1/entreprises/" + entrepriseId + "/questionnaire")
                .then()
                .statusCode(200)
                .body("referentielCode", equalTo("SMARTEX_SUSTWAY"))
                .body("nombreCriteres", equalTo(92))
                .body("criteres", hasSize(92));
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
