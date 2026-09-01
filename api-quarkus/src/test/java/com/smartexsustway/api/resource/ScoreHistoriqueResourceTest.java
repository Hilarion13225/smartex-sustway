package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.Secteur;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.ScoreHistoriqueRepository;
import com.smartexsustway.api.domain.repository.SecteurRepository;
import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.equalTo;
import static org.hamcrest.CoreMatchers.nullValue;
import static org.hamcrest.Matchers.hasSize;

/**
 * RG32 — évolution du score d'une mission dans le temps
 * (score_historique, alimenté par ScoreHistoriqueService, voir
 * EvaluationResource) et moyenne sectorielle anonymisée
 * (SecteurResource.benchmark, k-anonymat).
 *
 * Le pipeline d'agents IA n'est pas dépendable dans ces tests (même
 * contournement que EvaluationResourceTest/IndicePreparationResourceTest) :
 * les lignes score_historique sont donc persistées directement via le
 * repository plutôt que via un cycle d'évaluation complet.
 */
@QuarkusTest
class ScoreHistoriqueResourceTest {

    @Inject JwtService jwtService;
    @Inject AuditRepository auditRepository;
    @Inject SecteurRepository secteurRepository;
    @Inject ScoreHistoriqueRepository scoreHistoriqueRepository;

    private String creerEntreprise(String token, String identifiantLegal) {
        String entrepriseId = given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Score Historique",
                        "identifiantLegal", identifiantLegal,
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201)
                .extract().path("entreprise.id");

        // RG20 : abonnement actif requis avant de pouvoir créer un audit.
        given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of("fournisseur", "PI_SPI"))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/abonnement/paiements")
                .then().statusCode(201);

        return entrepriseId;
    }

    private String creerAudit(String token, String entrepriseId) {
        return given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of("referentielCode", "SMARTEX_SUSTWAY", "nom", "Audit Score Historique", "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201)
                .extract().path("id");
    }

    private void enregistrerScore(String auditId, LocalDate date, BigDecimal score) {
        QuarkusTransaction.requiringNew().run(() -> {
            Audit audit = auditRepository.findById(UUID.fromString(auditId));
            scoreHistoriqueRepository.persist(new com.smartexsustway.api.domain.entity.ScoreHistorique(audit, date, score));
        });
    }

    @Test
    void scoreHistorique_retourneLesPointsOrdonnesParDate() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = creerEntreprise(utilisateur.token, "RCCM-HIST-" + UUID.randomUUID());
        String auditId = creerAudit(utilisateur.token, entrepriseId);

        enregistrerScore(auditId, LocalDate.now().minusDays(2), new BigDecimal("2.50"));
        enregistrerScore(auditId, LocalDate.now(), new BigDecimal("3.75"));

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().get("/api/v1/entreprises/" + entrepriseId + "/audits/" + auditId + "/score-historique")
                .then()
                .statusCode(200)
                .body("$", hasSize(2))
                .body("[0].scoreGlobal", equalTo(2.5f))
                .body("[1].scoreGlobal", equalTo(3.75f));
    }

    @Test
    void scoreHistorique_isolationMultiTenant_estRefusee() {
        var utilisateurA = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = creerEntreprise(utilisateurA.token, "RCCM-HIST-" + UUID.randomUUID());
        String auditId = creerAudit(utilisateurA.token, entrepriseId);

        var utilisateurB = UtilisateurDeTest.creerEtConnecter(jwtService);
        given()
                .header("Authorization", "Bearer " + utilisateurB.token)
                .when().get("/api/v1/entreprises/" + entrepriseId + "/audits/" + auditId + "/score-historique")
                .then()
                .statusCode(403);
    }

    private String creerSecteurDeTest() {
        String code = "TEST_SECTEUR_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        QuarkusTransaction.requiringNew().run(() ->
                secteurRepository.persist(new Secteur(code, "Secteur de test", null)));
        return code;
    }

    private void creerEntrepriseScoreeDansSecteur(String secteurCode, BigDecimal score) {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = creerEntreprise(utilisateur.token, "RCCM-BENCH-" + UUID.randomUUID());
        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Benchmark",
                        "identifiantLegal", "RCCM-BENCH-" + UUID.randomUUID(),
                        "secteurCode", secteurCode,
                        "taille", "PME"))
                .when().put("/api/v1/entreprises/" + entrepriseId)
                .then().statusCode(200);
        String auditId = creerAudit(utilisateur.token, entrepriseId);
        enregistrerScore(auditId, LocalDate.now(), score);
    }

    @Test
    void benchmark_sousLeSeuilDeKAnonymat_masqueLaMoyenne() {
        String secteurCode = creerSecteurDeTest();
        creerEntrepriseScoreeDansSecteur(secteurCode, new BigDecimal("3.00"));
        creerEntrepriseScoreeDansSecteur(secteurCode, new BigDecimal("4.00"));

        given()
                .when().get("/api/v1/secteurs/" + secteurCode + "/benchmark")
                .then()
                // Sans authentification : réservé aux comptes connectés.
                .statusCode(401);

        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().get("/api/v1/secteurs/" + secteurCode + "/benchmark")
                .then()
                .statusCode(200)
                .body("secteurCode", equalTo(secteurCode))
                .body("nombreEntreprises", equalTo(2))
                .body("scoreMoyen", nullValue());
    }

    @Test
    void benchmark_auSeuilDeKAnonymat_reveleLaMoyenne() {
        String secteurCode = creerSecteurDeTest();
        for (int i = 0; i < 5; i++) {
            creerEntrepriseScoreeDansSecteur(secteurCode, new BigDecimal("3.00"));
        }

        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().get("/api/v1/secteurs/" + secteurCode + "/benchmark")
                .then()
                .statusCode(200)
                .body("nombreEntreprises", equalTo(5))
                .body("scoreMoyen", equalTo(3.0f));
    }

    @Test
    void benchmark_secteurInconnu_est404() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().get("/api/v1/secteurs/INEXISTANT/benchmark")
                .then()
                .statusCode(404);
    }
}
