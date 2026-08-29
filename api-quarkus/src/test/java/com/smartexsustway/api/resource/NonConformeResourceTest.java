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

/**
 * RG17/RG18 — non-conformités et actions correctives.
 *
 * La création automatique d'une non-conformité (NonConformiteService,
 * déclenchée quand une évaluation devient VALIDEE) dépend du pipeline
 * d'agents IA réel (services-ia-python + Gemini) — comme pour
 * EvaluationResourceTest, ce chemin n'est donc pas couvert ici et relève
 * de la vérification manuelle (voir README). Cette classe couvre le
 * routage, les autorisations et la gestion des cas introuvables des deux
 * ressources REST, sans dépendre du pipeline IA.
 */
@QuarkusTest
class NonConformeResourceTest {

    @Inject
    JwtService jwtService;

    private record Contexte(String token, String entrepriseId, String auditId) {}

    private Contexte creerContexte() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);

        String entrepriseId = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Non-Conformité Test",
                        "identifiantLegal", "RCCM-NC-" + UUID.randomUUID(),
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
                        "nom", "Audit Non-Conformité",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201)
                .extract().path("id");

        return new Contexte(utilisateur.token, entrepriseId, auditId);
    }

    @Test
    void lister_auditSansEvaluation_retourneListeVide() {
        var ctx = creerContexte();

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/non-conformites")
                .then()
                .statusCode(200)
                .body("$", equalTo(java.util.List.of()));
    }

    @Test
    void lister_isolationMultiTenant_estRefusee() {
        var ctx = creerContexte();
        var utilisateurB = UtilisateurDeTest.creerEtConnecter(jwtService);

        given()
                .header("Authorization", "Bearer " + utilisateurB.token)
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/non-conformites")
                .then()
                .statusCode(403);
    }

    @Test
    void detail_nonConformeInconnue_retourne404() {
        var ctx = creerContexte();

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId()
                        + "/non-conformites/" + UUID.randomUUID())
                .then()
                .statusCode(404);
    }

    @Test
    void changerStatut_nonConformeInconnue_retourne404() {
        var ctx = creerContexte();

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("statut", "CLOTUREE"))
                .when().put("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId()
                        + "/non-conformites/" + UUID.randomUUID() + "/statut")
                .then()
                .statusCode(404);
    }

    @Test
    void creerActionCorrective_nonConformeInconnue_retourne404() {
        var ctx = creerContexte();

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "Corriger le défaut"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId()
                        + "/non-conformites/" + UUID.randomUUID() + "/actions")
                .then()
                .statusCode(404);
    }
}
