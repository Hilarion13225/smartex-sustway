package com.smartexsustway.api.resource.support;

import com.smartexsustway.api.security.JwtService;
import io.restassured.http.ContentType;

import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;

/**
 * Helper partagé entre les tests d'intégration : inscrit, vérifie l'email
 * et connecte un utilisateur de test fraîchement créé, pour obtenir un
 * token JWT utilisable dans les tests d'endpoints protégés
 * (EntrepriseResource, SiteResource...).
 *
 * Chaque appel utilise un email unique (UUID) — voir AuthResourceTest pour
 * le pourquoi (tests exécutés contre la vraie base de dev).
 */
public final class UtilisateurDeTest {

    public final String email;
    public final String motDePasse;
    public final String id;
    public final String token;

    private UtilisateurDeTest(String email, String motDePasse, String id, String token) {
        this.email = email;
        this.motDePasse = motDePasse;
        this.id = id;
        this.token = token;
    }

    public static UtilisateurDeTest creerEtConnecter(JwtService jwtService) {
        String email = "test-" + UUID.randomUUID() + "@example.com";
        String motDePasse = "motdepasse123";

        String id = given()
                .contentType(ContentType.JSON)
                .body(Map.of("nom", "Test", "prenom", "User", "email", email, "motDePasse", motDePasse))
                .when().post("/api/v1/auth/inscription")
                .then().statusCode(201)
                .extract().path("id");

        String tokenVerification = jwtService.genererTokenVerificationEmail(UUID.fromString(id));
        given().queryParam("token", tokenVerification)
                .when().get("/api/v1/auth/verification-email")
                .then().statusCode(200);

        String token = given()
                .contentType(ContentType.JSON)
                .body(Map.of("email", email, "motDePasse", motDePasse))
                .when().post("/api/v1/auth/connexion")
                .then().statusCode(200)
                .extract().path("token");

        return new UtilisateurDeTest(email, motDePasse, id, token);
    }
}
