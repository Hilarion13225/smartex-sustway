package com.smartexsustway.api.resource;

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
import static org.hamcrest.core.Is.is;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Tests d'intégration du flux d'authentification (RG36).
 *
 * ATTENTION : ces tests tournent contre la vraie base PostgreSQL de dev
 * (voir application.properties, profil %test — TODO Testcontainers en
 * phase F pour une isolation propre). Chaque test génère un email unique
 * (UUID) pour rester rejouable sans collision ni pollution croisée.
 */
@QuarkusTest
class AuthResourceTest {

    @Inject
    JwtService jwtService;

    private String emailUnique() {
        return "test-" + UUID.randomUUID() + "@example.com";
    }

    private String inscrireEtRecupererId(String email, String motDePasse) {
        return given()
                .contentType(ContentType.JSON)
                .body(Map.of("nom", "Test", "prenom", "User", "email", email, "motDePasse", motDePasse))
                .when().post("/api/v1/auth/inscription")
                .then()
                .statusCode(201)
                .body("email", equalTo(email))
                .body("emailVerifie", is(false))
                .body("statut", equalTo("EN_ATTENTE_VERIFICATION"))
                .extract().path("id");
    }

    @Test
    void inscriptionVerificationConnexion_fluxComplet() {
        String email = emailUnique();
        String motDePasse = "motdepasse123";

        String utilisateurId = inscrireEtRecupererId(email, motDePasse);
        assertNotNull(utilisateurId);

        // RG36 : le compte n'est activé qu'après vérification de l'email.
        // On génère le token directement via JwtService plutôt que de scraper
        // les logs (équivalent fonctionnel du lien envoyé par email).
        String tokenVerification = jwtService.genererTokenVerificationEmail(UUID.fromString(utilisateurId));

        given()
                .queryParam("token", tokenVerification)
                .when().get("/api/v1/auth/verification-email")
                .then()
                .statusCode(200)
                .body("emailVerifie", is(true))
                .body("statut", equalTo("ACTIF"));

        given()
                .contentType(ContentType.JSON)
                .body(Map.of("email", email, "motDePasse", motDePasse))
                .when().post("/api/v1/auth/connexion")
                .then()
                .statusCode(200)
                .body("token", notNullValue())
                .body("typeToken", equalTo("Bearer"));
    }

    @Test
    void connexion_avantVerificationEmail_estRefusee() {
        String email = emailUnique();
        inscrireEtRecupererId(email, "motdepasse123");

        given()
                .contentType(ContentType.JSON)
                .body(Map.of("email", email, "motDePasse", "motdepasse123"))
                .when().post("/api/v1/auth/connexion")
                .then()
                .statusCode(403);
    }

    @Test
    void connexion_motDePasseIncorrect_estRefusee() {
        String email = emailUnique();
        String id = inscrireEtRecupererId(email, "motdepasse123");
        String token = jwtService.genererTokenVerificationEmail(UUID.fromString(id));
        given().queryParam("token", token).when().get("/api/v1/auth/verification-email").then().statusCode(200);

        given()
                .contentType(ContentType.JSON)
                .body(Map.of("email", email, "motDePasse", "mauvais_mot_de_passe"))
                .when().post("/api/v1/auth/connexion")
                .then()
                .statusCode(401);
    }

    @Test
    void inscription_emailDejaUtilise_estRefusee() {
        String email = emailUnique();
        inscrireEtRecupererId(email, "motdepasse123");

        given()
                .contentType(ContentType.JSON)
                .body(Map.of("nom", "Autre", "prenom", "Personne", "email", email, "motDePasse", "autremotdepasse123"))
                .when().post("/api/v1/auth/inscription")
                .then()
                .statusCode(409);
    }

    @Test
    void inscription_motDePasseTropCourt_estRejeteeParValidation() {
        given()
                .contentType(ContentType.JSON)
                .body(Map.of("nom", "Test", "prenom", "User", "email", emailUnique(), "motDePasse", "court"))
                .when().post("/api/v1/auth/inscription")
                .then()
                .statusCode(400);
    }
}
