package com.smartexsustway.api.resource;

import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;

/**
 * RG21/RG22/RG27/RG38 — évaluation IA d'un critère.
 *
 * Cette classe ne couvre QUE ce qui est vérifiable sans services-ia-python
 * réellement démarré (validations qui s'arrêtent avant tout appel au
 * pipeline IA). Le flux complet (appel réel à services-ia-python, lui-même
 * appelant Gemini) nécessite : MinIO + ClamAV + services-ia-python démarré
 * avec une clé SMARTEX_GEMINI_API_KEY valide — voir README, section
 * "Agents IA", pour la procédure de vérification manuelle.
 */
@QuarkusTest
class EvaluationResourceTest {

    @Inject
    JwtService jwtService;

    private record Contexte(String token, String entrepriseId, String auditId, String auditCritereId) {}

    private Contexte creerContexteSansPreuve() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);

        String entrepriseId = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Evaluation Test",
                        "identifiantLegal", "RCCM-EVL-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201)
                .extract().path("entreprise.id");

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of("fournisseur", "PI_SPI"))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/abonnement/paiements")
                .then().statusCode(201);

        String auditId = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "referentielCode", "SMARTEX_SUSTWAY",
                        "nom", "Audit Évaluation",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201)
                .extract().path("id");

        String auditCritereId = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().get("/api/v1/entreprises/" + entrepriseId + "/audits/" + auditId + "/criteres")
                .then().statusCode(200)
                .extract().jsonPath().getString("[0].id");

        return new Contexte(utilisateur.token, entrepriseId, auditId, auditCritereId);
    }

    @Test
    void evaluer_sansPreuveAssociee_estRejeteAvantAppelDuPipelineIa() {
        var ctx = creerContexteSansPreuve();

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId()
                        + "/criteres/" + ctx.auditCritereId() + "/evaluations")
                .then()
                .statusCode(400);
    }

    @Test
    void evaluer_sansAccesEntreprise_estRefuseAvantAppelDuPipelineIa() {
        var ctx = creerContexteSansPreuve();
        var utilisateurB = UtilisateurDeTest.creerEtConnecter(jwtService);

        given()
                .header("Authorization", "Bearer " + utilisateurB.token)
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId()
                        + "/criteres/" + ctx.auditCritereId() + "/evaluations")
                .then()
                .statusCode(403);
    }

    @Test
    void lister_isolationMultiTenant_estRefusee() {
        var ctx = creerContexteSansPreuve();
        var utilisateurB = UtilisateurDeTest.creerEtConnecter(jwtService);

        given()
                .header("Authorization", "Bearer " + utilisateurB.token)
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId()
                        + "/criteres/" + ctx.auditCritereId() + "/evaluations")
                .then()
                .statusCode(403);
    }
}
