package com.smartexsustway.api.resource;

import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static io.restassured.RestAssured.given;

/**
 * Vérifie que SessionPurposeFilter fait bien son travail : seul un token de
 * SESSION peut accéder à un endpoint protégé, même si un autre token est
 * par ailleurs parfaitement valide cryptographiquement. Sans ce filtre, un
 * token de vérification d'email intercepté pourrait servir à s'authentifier
 * n'importe où — c'est exactement le scénario que ces tests excluent.
 */
@QuarkusTest
class SessionPurposeFilterTest {

    @Inject
    JwtService jwtService;

    @Test
    void tokenSession_donneAccesAuxEndpointsProteges() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().get("/api/v1/utilisateurs/moi")
                .then().statusCode(200);
    }

    @Test
    void tokenVerificationEmail_neDonnePasAccesAuxEndpointsProteges() {
        UUID idQuelconque = UUID.randomUUID();
        String tokenVerification = jwtService.genererTokenVerificationEmail(idQuelconque);

        given()
                .header("Authorization", "Bearer " + tokenVerification)
                .when().get("/api/v1/utilisateurs/moi")
                .then().statusCode(401);
    }

    @Test
    void tokenPreAuth2fa_neDonnePasAccesAuxEndpointsProteges() {
        UUID idQuelconque = UUID.randomUUID();
        String tokenPreAuth = jwtService.genererTokenPreAuth2Fa(idQuelconque, null);

        given()
                .header("Authorization", "Bearer " + tokenPreAuth)
                .when().get("/api/v1/utilisateurs/moi")
                .then().statusCode(401);
    }

    @Test
    void tokenActivationSms_neDonnePasAccesAuxEndpointsProteges() {
        UUID idQuelconque = UUID.randomUUID();
        String tokenActivation = jwtService.genererTokenActivationSms(idQuelconque, "peu-importe-le-hash");

        given()
                .header("Authorization", "Bearer " + tokenActivation)
                .when().get("/api/v1/utilisateurs/moi")
                .then().statusCode(401);
    }

    @Test
    void endpointPublic_resteAccessibleSansToken() {
        // S'assure que le filtre ne casse rien pour les endpoints publics :
        // aucun token fourni = rien à vérifier, la requête doit passer.
        given()
                .when().get("/api/v1/secteurs")
                .then().statusCode(200);
    }
}
