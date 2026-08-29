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

/**
 * RG24 : toute création d'entreprise exige une formule d'abonnement valide
 * (formuleCode) — voir EntrepriseResource.creer. La réponse de création est désormais un DTO
 * combiné {entreprise, abonnement} (EntrepriseAvecAbonnementDto).
 */
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
                .body(Map.of(
                        "raisonSociale", "Entreprise Test",
                        "identifiantLegal", identifiantLegal,
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then()
                .statusCode(201)
                .body("entreprise.raisonSociale", equalTo("Entreprise Test"))
                .body("entreprise.identifiantLegal", equalTo(identifiantLegal))
                .body("abonnement.formuleCode", equalTo("STANDARD"))
                .body("abonnement.statut", equalTo("EN_ATTENTE_PAIEMENT"))
                .extract().path("entreprise.id");

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
                .body(Map.of(
                        "raisonSociale", "Entreprise Test",
                        "identifiantLegal", identifiantLegal,
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201);

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Autre Raison Sociale",
                        "identifiantLegal", identifiantLegal,
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(409);
    }

    @Test
    void creerEntreprise_formuleFree_estRefuseeParRG25() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Free",
                        "identifiantLegal", "RCCM-FREE-" + UUID.randomUUID(),
                        "formuleCode", "FREE"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(403);
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
                .body(Map.of(
                        "raisonSociale", "Entreprise A",
                        "identifiantLegal", "RCCM-A-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201)
                .extract().path("entreprise.id");

        // B ne doit pas pouvoir consulter l'entreprise de A (exigence §1.4 —
        // isolation stricte, indépendante de toute permission accordée par ailleurs).
        given()
                .header("Authorization", "Bearer " + utilisateurB.token)
                .when().get("/api/v1/entreprises/" + entrepriseIdA)
                .then()
                .statusCode(403);
    }
}
