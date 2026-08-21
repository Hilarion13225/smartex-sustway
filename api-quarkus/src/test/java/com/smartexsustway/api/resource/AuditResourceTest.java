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
import static org.hamcrest.CoreMatchers.equalTo;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;

/**
 * RG10/RG11 : missions d'audit. RG20 : abonnement actif requis.
 * RG34/RG35 : le questionnaire composé dynamiquement est figé dans la
 * mission (AUDIT_CRITERE/AUDIT_QUESTION).
 */
@QuarkusTest
class AuditResourceTest {

    @Inject
    JwtService jwtService;

    private record Contexte(String token, String entrepriseId) {}

    private String creerEntreprise(String token) {
        return given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Audit Test",
                        "identifiantLegal", "RCCM-AUD-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD",
                        "periodicite", "ANNUELLE"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201)
                .extract().path("entreprise.id");
    }

    /** Crée une entreprise ET paie son abonnement — condition nécessaire pour RG20. */
    private Contexte creerEntrepriseAvecAbonnementActif() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = creerEntreprise(utilisateur.token);

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of("fournisseur", "PI_SPI"))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/abonnement/paiements")
                .then().statusCode(201);

        return new Contexte(utilisateur.token, entrepriseId);
    }

    @Test
    void creerAudit_composeEtFigeLeQuestionnaireComplet() {
        var ctx = creerEntrepriseAvecAbonnementActif();

        String auditId = given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "referentielCode", "SMARTEX_SUSTWAY",
                        "nom", "Audit RSE 2026",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits")
                .then()
                .statusCode(201)
                .body("referentielCode", equalTo("SMARTEX_SUSTWAY"))
                .body("statut", equalTo("BROUILLON"))
                .body("nombreCriteres", equalTo(87))
                .extract().path("id");

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + auditId + "/criteres")
                .then()
                .statusCode(200)
                .body("$", hasSize(87));
    }

    @Test
    void creerAudit_sansAbonnementActif_estRefuseParRG20() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = creerEntreprise(utilisateur.token); // pas de paiement -> EN_ATTENTE_PAIEMENT

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "referentielCode", "SMARTEX_SUSTWAY",
                        "nom", "Audit refusé",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then()
                .statusCode(403);
    }

    @Test
    void creerAudit_referentielInconnu_estRejete() {
        var ctx = creerEntrepriseAvecAbonnementActif();

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "referentielCode", "INEXISTANT",
                        "nom", "Audit invalide",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits")
                .then()
                .statusCode(400);
    }

    @Test
    void listerAudits_retourneLesMissionsDeLEntreprise() {
        var ctx = creerEntrepriseAvecAbonnementActif();

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "referentielCode", "SMARTEX_SUSTWAY",
                        "nom", "Audit à lister",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits")
                .then().statusCode(201);

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits")
                .then()
                .statusCode(200)
                .body("$", hasSize(1))
                .body("[0].nom", equalTo("Audit à lister"));
    }

    @Test
    void score_avantToutEvaluation_estNeutreEtRepartiParDomaine() {
        var ctx = creerEntrepriseAvecAbonnementActif();

        String auditId = given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "referentielCode", "SMARTEX_SUSTWAY",
                        "nom", "Audit Score",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits")
                .then().statusCode(201)
                .extract().path("id");

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + auditId + "/score")
                .then()
                .statusCode(200)
                .body("auditId", equalTo(auditId))
                .body("scoreGlobal", equalTo(0))
                .body("nombreCriteresTotal", equalTo(87))
                .body("nombreCriteresEvalues", equalTo(0))
                .body("nombreCriteresEnRevue", equalTo(0))
                .body("nombreCriteresNonEvalues", equalTo(87))
                .body("domaines.nombreCriteresTotal.sum()", equalTo(87))
                .body("domaines.nombreCriteresEvalues", everyItem(equalTo(0)));
    }

    @Test
    void score_isolationMultiTenant_unUtilisateurNeVoitPasLeScoreDunAutre() {
        var ctxA = creerEntrepriseAvecAbonnementActif();
        String auditId = given()
                .header("Authorization", "Bearer " + ctxA.token())
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "referentielCode", "SMARTEX_SUSTWAY",
                        "nom", "Audit Score Isolé",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + ctxA.entrepriseId() + "/audits")
                .then().statusCode(201)
                .extract().path("id");

        var utilisateurB = UtilisateurDeTest.creerEtConnecter(jwtService);

        given()
                .header("Authorization", "Bearer " + utilisateurB.token)
                .when().get("/api/v1/entreprises/" + ctxA.entrepriseId() + "/audits/" + auditId + "/score")
                .then()
                .statusCode(403);
    }

    @Test
    void isolationMultiTenant_unUtilisateurNeVoitPasLesAuditsDunAutre() {
        var ctxA = creerEntrepriseAvecAbonnementActif();
        var utilisateurB = UtilisateurDeTest.creerEtConnecter(jwtService);

        given()
                .header("Authorization", "Bearer " + utilisateurB.token)
                .when().get("/api/v1/entreprises/" + ctxA.entrepriseId() + "/audits")
                .then()
                .statusCode(403);
    }
}
