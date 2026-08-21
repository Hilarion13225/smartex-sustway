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

import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.equalTo;

/**
 * Module 4 (back-office) : domaines, critères et criticité sectorielle —
 * réservé à SUPER_ADMIN. Voir UtilisateurDeTest.creerAvecRole pour le
 * contournement d'attribution de rôle (aucun endpoint dédié, CDC phase F).
 */
@QuarkusTest
class BackOfficeReferentielResourceTest {

    @Inject JwtService jwtService;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject UtilisateurRepository utilisateurRepository;

    private record Contexte(String token, String referentielCode, String domaineCode) {}

    private Contexte creerContexteAvecReferentielDeTest() {
        String token = UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository, utilisateurEntrepriseRepository).token;

        String referentielCode = "TEST_BO_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of("code", referentielCode, "nom", "Référentiel back-office test", "type", "SMARTEX"))
                .when().post("/api/v1/referentiels")
                .then().statusCode(201);

        given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of("code", "DOM1", "nom", "Domaine Un"))
                .when().post("/api/v1/referentiels/" + referentielCode + "/domaines")
                .then().statusCode(201);

        return new Contexte(token, referentielCode, "DOM1");
    }

    @Test
    void creerDomaine_codeDejaExistant_estRejeteAvec409() {
        var ctx = creerContexteAvecReferentielDeTest();

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("code", "DOM1", "nom", "Doublon"))
                .when().post("/api/v1/referentiels/" + ctx.referentielCode() + "/domaines")
                .then()
                .statusCode(409);
    }

    @Test
    void creerCritere_estCreeAvecSucces() {
        var ctx = creerContexteAvecReferentielDeTest();

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("code", "DOM1-01", "libelle", "Premier critère"))
                .when().post("/api/v1/referentiels/" + ctx.referentielCode() + "/domaines/" + ctx.domaineCode() + "/criteres")
                .then()
                .statusCode(201)
                .body("code", equalTo("DOM1-01"))
                .body("actif", equalTo(true));
    }

    /** Régression : la persistance laissait auparavant remonter la ContraintViolationException brute en 500. */
    @Test
    void creerCritere_codeDejaExistantDansLeDomaine_estRejeteAvec409() {
        var ctx = creerContexteAvecReferentielDeTest();

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("code", "DOM1-01", "libelle", "Premier critère"))
                .when().post("/api/v1/referentiels/" + ctx.referentielCode() + "/domaines/" + ctx.domaineCode() + "/criteres")
                .then().statusCode(201);

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("code", "DOM1-01", "libelle", "Doublon"))
                .when().post("/api/v1/referentiels/" + ctx.referentielCode() + "/domaines/" + ctx.domaineCode() + "/criteres")
                .then()
                .statusCode(409);
    }

    @Test
    void listerCriteres_incluLesCriteresDesactives() {
        var ctx = creerContexteAvecReferentielDeTest();

        String critereId = given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("code", "DOM1-01", "libelle", "Premier critère"))
                .when().post("/api/v1/referentiels/" + ctx.referentielCode() + "/domaines/" + ctx.domaineCode() + "/criteres")
                .then().statusCode(201)
                .extract().path("id");

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("actif", false))
                .when().put("/api/v1/referentiels/criteres/" + critereId)
                .then().statusCode(200)
                .body("actif", equalTo(false));

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/referentiels/" + ctx.referentielCode() + "/criteres")
                .then()
                .statusCode(200)
                .body("actif", org.hamcrest.Matchers.hasItem(false));
    }

    @Test
    void criticiteSecteur_definirPuisSupprimer() {
        var ctx = creerContexteAvecReferentielDeTest();

        String critereId = given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("code", "DOM1-01", "libelle", "Premier critère", "criticiteCode", "MOYENNE"))
                .when().post("/api/v1/referentiels/" + ctx.referentielCode() + "/domaines/" + ctx.domaineCode() + "/criteres")
                .then().statusCode(201)
                .extract().path("id");

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("secteurCode", "AGRO_INDUSTRIE", "criticiteCode", "CRITIQUE"))
                .when().put("/api/v1/referentiels/criteres/" + critereId + "/criticite-secteur")
                .then()
                .statusCode(200)
                .body("secteurCode", equalTo("AGRO_INDUSTRIE"))
                .body("criticiteCode", equalTo("CRITIQUE"));

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/referentiels/criteres/" + critereId + "/criticite-secteur")
                .then()
                .statusCode(200)
                .body("secteurCode", org.hamcrest.Matchers.hasItem("AGRO_INDUSTRIE"));

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().delete("/api/v1/referentiels/criteres/" + critereId + "/criticite-secteur/AGRO_INDUSTRIE")
                .then()
                .statusCode(204);

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/referentiels/criteres/" + critereId + "/criticite-secteur")
                .then()
                .statusCode(200)
                .body("$", org.hamcrest.Matchers.empty());
    }
}
