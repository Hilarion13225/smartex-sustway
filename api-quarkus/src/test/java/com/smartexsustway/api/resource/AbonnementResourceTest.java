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
import static org.hamcrest.CoreMatchers.notNullValue;

/**
 * RG20/RG24 : une entreprise créée en formule payante démarre en
 * EN_ATTENTE_PAIEMENT ; le paiement (stub, cf. PaiementService) la fait
 * passer à ACTIF.
 */
@QuarkusTest
class AbonnementResourceTest {

    @Inject
    JwtService jwtService;

    private record EntrepriseCree(String token, String entrepriseId) {}

    private EntrepriseCree creerUtilisateurEtEntreprise(String formuleCode) {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);

        var corps = new java.util.HashMap<String, String>();
        corps.put("raisonSociale", "Entreprise Abonnement Test");
        corps.put("identifiantLegal", "RCCM-ABO-" + UUID.randomUUID());
        corps.put("formuleCode", formuleCode);

        String entrepriseId = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(corps)
                .when().post("/api/v1/entreprises")
                .then().statusCode(201)
                .extract().path("entreprise.id");

        return new EntrepriseCree(utilisateur.token, entrepriseId);
    }

    @Test
    void abonnement_creeAvecLEntreprise_estEnAttentePaiement() {
        var ctx = creerUtilisateurEtEntreprise("STANDARD");

        given()
                .header("Authorization", "Bearer " + ctx.token)
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId + "/abonnement")
                .then()
                .statusCode(200)
                .body("formuleCode", equalTo("STANDARD"))
                .body("statut", equalTo("EN_ATTENTE_PAIEMENT"));
    }

    @Test
    void payerAbonnement_leFaitPasserAActif() {
        var ctx = creerUtilisateurEtEntreprise("AVANCEES");

        given()
                .header("Authorization", "Bearer " + ctx.token)
                .contentType(ContentType.JSON)
                .body(Map.of("fournisseur", "PI_SPI"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId + "/abonnement/paiements")
                .then()
                .statusCode(201)
                .body("statut", equalTo("REUSSI"))
                .body("fournisseur", equalTo("PI_SPI"))
                .body("montant", notNullValue());

        given()
                .header("Authorization", "Bearer " + ctx.token)
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId + "/abonnement")
                .then()
                .statusCode(200)
                .body("statut", equalTo("ACTIF"))
                .body("dateFin", notNullValue());
    }

    @Test
    void payerAbonnement_dejaActif_estRefuse() {
        var ctx = creerUtilisateurEtEntreprise("STANDARD");

        given()
                .header("Authorization", "Bearer " + ctx.token)
                .contentType(ContentType.JSON)
                .body(Map.of("fournisseur", "WAVE"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId + "/abonnement/paiements")
                .then().statusCode(201);

        given()
                .header("Authorization", "Bearer " + ctx.token)
                .contentType(ContentType.JSON)
                .body(Map.of("fournisseur", "WAVE"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId + "/abonnement/paiements")
                .then().statusCode(409);
    }

    @Test
    void payerAbonnement_fournisseurInvalide_estRejete() {
        var ctx = creerUtilisateurEtEntreprise("STANDARD");

        given()
                .header("Authorization", "Bearer " + ctx.token)
                .contentType(ContentType.JSON)
                .body(Map.of("fournisseur", "PAYPAL"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId + "/abonnement/paiements")
                .then().statusCode(400);
    }

    @Test
    void listerFormules_estPubliqueEtNonVide() {
        given()
                .when().get("/api/v1/formules")
                .then()
                .statusCode(200)
                .body("code", org.hamcrest.Matchers.hasItems("FREE", "STANDARD", "AVANCEES"));
    }
}
