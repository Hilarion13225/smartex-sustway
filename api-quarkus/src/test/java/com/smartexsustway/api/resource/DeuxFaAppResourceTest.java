package com.smartexsustway.api.resource;

import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
import dev.samstevens.totp.code.CodeGenerator;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.time.TimeProvider;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.containsString;
import static org.hamcrest.CoreMatchers.equalTo;
import static org.hamcrest.CoreMatchers.notNullValue;

/**
 * RG36 — 2FA méthode application d'authentification (TOTP, RFC 6238).
 * Les codes attendus sont calculés indépendamment avec la même librairie
 * (dev.samstevens.totp), exactement comme le ferait une vraie application
 * d'authentification (Google Authenticator, Authy...) à partir du secret
 * partagé — pas de raccourci qui contournerait la logique testée.
 */
@QuarkusTest
class DeuxFaAppResourceTest {

    @Inject
    JwtService jwtService;

    private final CodeGenerator codeGenerator = new DefaultCodeGenerator();
    private final TimeProvider timeProvider = new SystemTimeProvider();

    private String codeValidePour(String secret) throws Exception {
        return codeGenerator.generate(secret, timeProvider.getTime() / 30);
    }

    @Test
    void activationEtConnexionAvec2faApp_fluxComplet() throws Exception {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);

        // 1. Démarrage : récupère le secret + l'URI de provisionnement
        String secret = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().post("/api/v1/auth/2fa/app/demarrer")
                .then().statusCode(200)
                .body("secret", notNullValue())
                .body("uriProvisionnement", containsString("otpauth://totp/"))
                .extract().path("secret");

        // 2. Confirmation avec un code TOTP valide
        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of("code", codeValidePour(secret)))
                .when().post("/api/v1/auth/2fa/app/confirmer")
                .then().statusCode(200)
                .body("deuxfaActive", equalTo(true))
                .body("deuxfaMethode", equalTo("APP"));

        // 3. La connexion normale doit maintenant exiger la 2FA
        String tokenPreAuth = given()
                .contentType(ContentType.JSON)
                .body(Map.of("email", utilisateur.email, "motDePasse", utilisateur.motDePasse))
                .when().post("/api/v1/auth/connexion")
                .then().statusCode(200)
                .body("deuxFaRequise", equalTo(true))
                .body("methode", equalTo("APP"))
                .body("tokenPreAuth", notNullValue())
                .body("token", org.hamcrest.Matchers.nullValue())
                .extract().path("tokenPreAuth");

        // 4. Soumission du code TOTP -> vrai token de session
        String token = given()
                .contentType(ContentType.JSON)
                .body(Map.of("tokenPreAuth", tokenPreAuth, "code", codeValidePour(secret)))
                .when().post("/api/v1/auth/connexion/2fa")
                .then().statusCode(200)
                .body("deuxFaRequise", equalTo(false))
                .body("token", notNullValue())
                .extract().path("token");

        // 5. Ce token doit fonctionner comme un token de session normal
        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/api/v1/utilisateurs/moi")
                .then().statusCode(200)
                .body("email", equalTo(utilisateur.email));
    }

    @Test
    void confirmerApp_codeInvalide_estRefuse() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().post("/api/v1/auth/2fa/app/demarrer")
                .then().statusCode(200);

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of("code", "000000"))
                .when().post("/api/v1/auth/2fa/app/confirmer")
                .then().statusCode(401);
    }

    /**
     * Sécurité (SessionPurposeFilter) : un token de pré-authentification 2FA
     * — pourtant valide cryptographiquement — ne doit jamais suffire à lui
     * seul à accéder à un endpoint protégé, avant même la soumission du code.
     */
    @Test
    void tokenPreAuth2fa_neDonnePasAccesAuxEndpointsProteges() throws Exception {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String secret = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().post("/api/v1/auth/2fa/app/demarrer")
                .then().statusCode(200).extract().path("secret");

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of("code", codeValidePour(secret)))
                .when().post("/api/v1/auth/2fa/app/confirmer")
                .then().statusCode(200);

        String tokenPreAuth = given()
                .contentType(ContentType.JSON)
                .body(Map.of("email", utilisateur.email, "motDePasse", utilisateur.motDePasse))
                .when().post("/api/v1/auth/connexion")
                .then().statusCode(200)
                .extract().path("tokenPreAuth");

        given()
                .header("Authorization", "Bearer " + tokenPreAuth)
                .when().get("/api/v1/utilisateurs/moi")
                .then().statusCode(401);
    }

    @Test
    void desactiverDeuxFa_remetLeCompteEnConnexionSimple() throws Exception {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String secret = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().post("/api/v1/auth/2fa/app/demarrer")
                .then().statusCode(200).extract().path("secret");
        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of("code", codeValidePour(secret)))
                .when().post("/api/v1/auth/2fa/app/confirmer")
                .then().statusCode(200);

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().post("/api/v1/auth/2fa/desactiver")
                .then().statusCode(200)
                .body("deuxfaActive", equalTo(false));

        given()
                .contentType(ContentType.JSON)
                .body(Map.of("email", utilisateur.email, "motDePasse", utilisateur.motDePasse))
                .when().post("/api/v1/auth/connexion")
                .then().statusCode(200)
                .body("deuxFaRequise", equalTo(false))
                .body("token", notNullValue());
    }
}
