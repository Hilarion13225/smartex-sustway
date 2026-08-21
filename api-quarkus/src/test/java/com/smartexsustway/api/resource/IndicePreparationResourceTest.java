package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.RoleRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
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
import static org.hamcrest.Matchers.hasSize;

/**
 * RG39/RG40/RG41/RG42/RG43 — indice de préparation bailleur (financements
 * verts), réservé à la formule Avancées. Le calcul réel (avec des
 * évaluations validées) dépend du pipeline IA — comme pour
 * EvaluationResourceTest/NonConformeResourceTest, cette classe couvre le
 * routage, les autorisations et le cas "aucun critère tagué" (score neutre),
 * sans dépendre du pipeline IA.
 */
@QuarkusTest
class IndicePreparationResourceTest {

    @Inject JwtService jwtService;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject UtilisateurRepository utilisateurRepository;

    private record Contexte(String token, String entrepriseId, String auditId) {}

    private String creerEntreprise(String token, String formuleCode) {
        return given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Indice Test",
                        "identifiantLegal", "RCCM-IDX-" + UUID.randomUUID(),
                        "formuleCode", formuleCode,
                        "periodicite", "ANNUELLE"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201)
                .extract().path("entreprise.id");
    }

    private Contexte creerContexte(String formuleCode) {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = creerEntreprise(utilisateur.token, formuleCode);

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
                        "nom", "Audit Indice Préparation",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201)
                .extract().path("id");

        return new Contexte(utilisateur.token, entrepriseId, auditId);
    }

    @Test
    void listerBailleurs_contientIfcSfi() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);

        given()
                .when().get("/api/v1/bailleurs")
                .then()
                .statusCode(200)
                .body("code", org.hamcrest.Matchers.hasItem("IFC_SFI"));
    }

    @Test
    void calculer_formuleStandard_estRefuseParRG41() {
        var ctx = creerContexte("STANDARD");

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", "IFC_SFI"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                .then()
                .statusCode(403);
    }

    @Test
    void calculer_formuleAvancees_sansCritereTague_donneUnScoreNeutre() {
        var ctx = creerContexte("AVANCEES");

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", "IFC_SFI"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                .then()
                .statusCode(200)
                .body("bailleurCode", equalTo("IFC_SFI"))
                .body("score", equalTo(0.0f));

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                .then()
                .statusCode(200)
                .body("$", hasSize(1));
    }

    @Test
    void critereBailleur_definirListerSupprimer() {
        String token = UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository, utilisateurEntrepriseRepository).token;

        String critereId = given()
                .header("Authorization", "Bearer " + token)
                .when().get("/api/v1/referentiels/SMARTEX_SUSTWAY/criteres")
                .then().statusCode(200)
                .extract().jsonPath().getString("[0].id");

        given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", "IFC_SFI", "applicable", true))
                .when().put("/api/v1/referentiels/criteres/" + critereId + "/bailleur")
                .then()
                .statusCode(200)
                .body("bailleurCode", equalTo("IFC_SFI"))
                .body("applicable", equalTo(true));

        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/api/v1/referentiels/criteres/" + critereId + "/bailleur")
                .then()
                .statusCode(200)
                .body("bailleurCode", org.hamcrest.Matchers.hasItem("IFC_SFI"));

        given()
                .header("Authorization", "Bearer " + token)
                .when().delete("/api/v1/referentiels/criteres/" + critereId + "/bailleur/IFC_SFI")
                .then()
                .statusCode(204);

        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/api/v1/referentiels/criteres/" + critereId + "/bailleur")
                .then()
                .statusCode(200)
                .body("$", org.hamcrest.Matchers.empty());
    }

    @Test
    void calculer_isolationMultiTenant_estRefusee() {
        var ctx = creerContexte("AVANCEES");
        var utilisateurB = UtilisateurDeTest.creerEtConnecter(jwtService);

        given()
                .header("Authorization", "Bearer " + utilisateurB.token)
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", "IFC_SFI"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                .then()
                .statusCode(403);
    }
}
