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

@QuarkusTest
class SiteResourceTest {

    @Inject
    JwtService jwtService;

    private String creerEntreprise(String token) {
        return given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Sites Test",
                        "identifiantLegal", "RCCM-SITE-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD",
                        "periodicite", "ANNUELLE"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201)
                .extract().path("entreprise.id");
    }

    @Test
    void creerSite_puisLeRetrouverEnListe() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = creerEntreprise(utilisateur.token);

        String siteId = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of("nom", "Siège social", "ville", "Abidjan", "paysCodeIso2", "CI"))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/sites")
                .then()
                .statusCode(201)
                .body("nom", equalTo("Siège social"))
                .body("paysCodeIso2", equalTo("CI"))
                .body("statut", equalTo("ACTIF"))
                .extract().path("id");

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().get("/api/v1/entreprises/" + entrepriseId + "/sites")
                .then()
                .statusCode(200)
                .body("id", hasItem(siteId));
    }

    @Test
    void creerSite_paysInconnu_estRejete() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = creerEntreprise(utilisateur.token);

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of("nom", "Site invalide", "paysCodeIso2", "ZZ"))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/sites")
                .then()
                .statusCode(400);
    }

    @Test
    void modifierSite_metAJourLesChamps() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = creerEntreprise(utilisateur.token);

        String siteId = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of("nom", "Site initial", "paysCodeIso2", "CI"))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/sites")
                .then().statusCode(201)
                .extract().path("id");

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of("nom", "Site renommé", "ville", "Yamoussoukro", "paysCodeIso2", "CI"))
                .when().put("/api/v1/entreprises/" + entrepriseId + "/sites/" + siteId)
                .then()
                .statusCode(200)
                .body("nom", equalTo("Site renommé"))
                .body("ville", equalTo("Yamoussoukro"));
    }

    @Test
    void desactiverSite_lePasseEnStatutArchive() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = creerEntreprise(utilisateur.token);

        String siteId = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of("nom", "Site à désactiver", "paysCodeIso2", "CI"))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/sites")
                .then().statusCode(201)
                .extract().path("id");

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().delete("/api/v1/entreprises/" + entrepriseId + "/sites/" + siteId)
                .then().statusCode(204);

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().get("/api/v1/entreprises/" + entrepriseId + "/sites/" + siteId)
                .then()
                .statusCode(200)
                .body("statut", equalTo("ARCHIVE"));
    }

    @Test
    void reactiverSite_lePasseDeNouveauEnStatutActif() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = creerEntreprise(utilisateur.token);

        String siteId = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of("nom", "Site à réactiver", "paysCodeIso2", "CI"))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/sites")
                .then().statusCode(201)
                .extract().path("id");

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().delete("/api/v1/entreprises/" + entrepriseId + "/sites/" + siteId)
                .then().statusCode(204);

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().post("/api/v1/entreprises/" + entrepriseId + "/sites/" + siteId + "/reactivation")
                .then()
                .statusCode(200)
                .body("statut", equalTo("ACTIF"));

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().get("/api/v1/entreprises/" + entrepriseId + "/sites/" + siteId)
                .then()
                .statusCode(200)
                .body("statut", equalTo("ACTIF"));
    }

    @Test
    void isolationMultiTenant_unUtilisateurNeVoitPasLesSitesDunAutre() {
        var utilisateurA = UtilisateurDeTest.creerEtConnecter(jwtService);
        var utilisateurB = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseIdA = creerEntreprise(utilisateurA.token);

        given()
                .header("Authorization", "Bearer " + utilisateurB.token)
                .when().get("/api/v1/entreprises/" + entrepriseIdA + "/sites")
                .then()
                .statusCode(403);
    }
}
