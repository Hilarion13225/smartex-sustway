package com.smartexsustway.api.resource;

import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
import com.smartexsustway.api.security.PasswordService;
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
 * RG36 — 2FA méthode SMS.
 *
 * Le code envoyé par SMS n'est JAMAIS renvoyé par l'API (il est seulement
 * journalisé côté serveur, comme le lien de vérification email — voir
 * AuthResource/DeuxFaResource) : c'est le comportement correct, pas un
 * oubli. Ces tests ne peuvent donc pas passer par le flux HTTP complet
 * pour connaître le code à soumettre ; ils utilisent directement
 * JwtService/PasswordService — les mêmes classes que la production — pour
 * fabriquer un token équivalent à celui que /demarrer aurait produit, avec
 * un code choisi à l'avance. Ça teste réellement la logique de vérification
 * de /confirmer et /connexion/2fa, seule la portion "envoi du SMS" (non
 * testable sans vrai gateway) est court-circuitée.
 */
@QuarkusTest
class DeuxFaSmsResourceTest {

    @Inject
    JwtService jwtService;

    @Inject
    PasswordService passwordService;

    @Test
    void activationSms_avecCodeCorrect_active2FA() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);

        // /demarrer : vérifie juste que l'appel réussit et retourne un token.
        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of("telephone", "+225 07 00 00 00 00"))
                .when().post("/api/v1/auth/2fa/sms/demarrer")
                .then().statusCode(200)
                .body("tokenActivation", notNullValue());

        // On fabrique nous-mêmes un token équivalent avec un code connu,
        // pour pouvoir tester /confirmer de bout en bout.
        String code = "654321";
        String tokenActivation = jwtService.genererTokenActivationSms(UUID.fromString(utilisateur.id), passwordService.hacher(code));

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of("tokenActivation", tokenActivation, "code", code))
                .when().post("/api/v1/auth/2fa/sms/confirmer")
                .then().statusCode(200)
                .body("deuxfaActive", equalTo(true))
                .body("deuxfaMethode", equalTo("SMS"));
    }

    @Test
    void confirmerSms_codeIncorrect_estRefuse() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String tokenActivation = jwtService.genererTokenActivationSms(
                UUID.fromString(utilisateur.id), passwordService.hacher("111111"));

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of("tokenActivation", tokenActivation, "code", "999999"))
                .when().post("/api/v1/auth/2fa/sms/confirmer")
                .then().statusCode(401);
    }

    @Test
    void confirmerSms_pourUnAutreUtilisateur_estRefuse() {
        // Sécurité : un token d'activation SMS émis pour A ne doit pas
        // pouvoir être confirmé alors qu'on est authentifié en tant que B.
        var utilisateurA = UtilisateurDeTest.creerEtConnecter(jwtService);
        var utilisateurB = UtilisateurDeTest.creerEtConnecter(jwtService);

        String code = "123123";
        String tokenActivationPourA = jwtService.genererTokenActivationSms(
                UUID.fromString(utilisateurA.id), passwordService.hacher(code));

        given()
                .header("Authorization", "Bearer " + utilisateurB.token)
                .contentType(ContentType.JSON)
                .body(Map.of("tokenActivation", tokenActivationPourA, "code", code))
                .when().post("/api/v1/auth/2fa/sms/confirmer")
                .then().statusCode(403);
    }

    @Test
    void connexionAvec2faSms_fluxComplet() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);

        // Active la 2FA SMS (comme dans le premier test).
        String codeActivation = "222222";
        String tokenActivation = jwtService.genererTokenActivationSms(
                UUID.fromString(utilisateur.id), passwordService.hacher(codeActivation));
        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of("tokenActivation", tokenActivation, "code", codeActivation))
                .when().post("/api/v1/auth/2fa/sms/confirmer")
                .then().statusCode(200);

        // La connexion doit maintenant demander la 2FA (le vrai code est
        // généré côté serveur et journalisé — inconnu du test, cf. javadoc
        // de la classe). On vérifie au moins la forme de la réponse.
        given()
                .contentType(ContentType.JSON)
                .body(Map.of("email", utilisateur.email, "motDePasse", utilisateur.motDePasse))
                .when().post("/api/v1/auth/connexion")
                .then().statusCode(200)
                .body("deuxFaRequise", equalTo(true))
                .body("methode", equalTo("SMS"))
                .body("tokenPreAuth", notNullValue());

        // Pour vérifier la logique de /connexion/2fa elle-même (pas
        // seulement /connexion), on fabrique un token de pré-auth équivalent
        // avec un code connu, exactement comme la production le ferait.
        String codeConnexion = "333333";
        String tokenPreAuth = jwtService.genererTokenPreAuth2Fa(
                UUID.fromString(utilisateur.id), passwordService.hacher(codeConnexion));

        String token = given()
                .contentType(ContentType.JSON)
                .body(Map.of("tokenPreAuth", tokenPreAuth, "code", codeConnexion))
                .when().post("/api/v1/auth/connexion/2fa")
                .then().statusCode(200)
                .body("token", notNullValue())
                .extract().path("token");

        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/api/v1/utilisateurs/moi")
                .then().statusCode(200);
    }
}
