package com.smartexsustway.api.resource;

import com.smartexsustway.api.ia.EvaluerCritereRequestDto;
import com.smartexsustway.api.ia.EvaluerCritereResponseDto;
import com.smartexsustway.api.ia.IaEvaluationClient;
import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Le chemin d'analyse va-t-il réellement jusqu'au service d'agents ?
 *
 * Les autres tests d'autorisation s'arrêtent au code de retour : un 400 sur
 * un critère vierge prouve que le contrôle d'accès est franchi, mais pas que
 * le pipeline aurait été appelé. Ici le client du service est remplacé par
 * un double : le critère porte une réponse, l'appel part réellement, et l'on
 * vérifie qu'il transporte bien le bon critère — sans consommer de quota ni
 * dépendre du réseau.
 */
@QuarkusTest
class CheminAnalyseIaTest {

    @Inject JwtService jwtService;

    @InjectMock
    @RestClient
    IaEvaluationClient iaEvaluationClient;

    private record Contexte(String token, String entrepriseId, String auditId,
                            String auditCritereId, String questionId) {
    }

    /** Mission dont le premier critère porte une réponse, donc analysable. */
    private Contexte contexteAnalysable() {
        var proprietaire = UtilisateurDeTest.creerEtConnecter(jwtService);

        String entrepriseId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Chemin Analyse",
                        "identifiantLegal", "RCCM-CHA-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201)
                .extract().path("entreprise.id");

        given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of("fournisseur", "PI_SPI"))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/abonnement/paiements")
                .then().statusCode(201);

        String auditId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "referentielCode", "SMARTEX_SUSTWAY",
                        "nom", "Mission analysable",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201)
                .extract().path("id");

        String auditCritereId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .when().get("/api/v1/entreprises/" + entrepriseId + "/audits/" + auditId + "/criteres")
                .then().statusCode(200)
                .extract().path("[0].id");

        String questionId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .when().get("/api/v1/entreprises/" + entrepriseId + "/audits/" + auditId
                        + "/criteres/" + auditCritereId + "/questions")
                .then().statusCode(200)
                .extract().path("questions[0].auditQuestionId");

        // Sans déclaration ni preuve, l'analyse serait refusée en amont pour
        // absence de matière : ce n'est pas ce que ce test cherche à éprouver.
        given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "scenario", "Politique formalisée et diffusée en 2025.",
                        "reponses", List.of(Map.of("auditQuestionId", questionId, "niveau", 4))))
                .when().put("/api/v1/entreprises/" + entrepriseId + "/audits/" + auditId
                        + "/criteres/" + auditCritereId + "/questions")
                .then().statusCode(200);

        return new Contexte(proprietaire.token, entrepriseId, auditId, auditCritereId, questionId);
    }

    private EvaluerCritereResponseDto reponseSimulee(UUID auditCritereId) {
        return new EvaluerCritereResponseDto(
                auditCritereId,
                0.8250,   // probabilité -> niveau 4 via ScoringEngine
                0.9000,
                true,
                "Réponse confirmée par le document fourni.",
                List.of(new EvaluerCritereResponseDto.DocumentAnalyseDto(
                        "politique.pdf", "Politique environnementale, page 2.")),
                null, null, null, null, null);
    }

    /**
     * Le responsable d'entreprise déclenche l'analyse de sa propre mission :
     * l'appel atteint le service, et la requête transmise porte bien le
     * critère demandé.
     */
    @Test
    void responsableEntreprise_atteintReellementLeServiceDAnalyse() {
        Contexte ctx = contexteAnalysable();
        UUID critereId = UUID.fromString(ctx.auditCritereId());
        when(iaEvaluationClient.evaluerCritere(any())).thenReturn(reponseSimulee(critereId));

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body("{}")
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId()
                        + "/criteres/" + ctx.auditCritereId() + "/evaluations")
                .then()
                .statusCode(201)
                .body("source", equalTo("IA"))
                // RG27 : la note vient de ScoringEngine, jamais du modèle.
                .body("niveauEngagement", equalTo(4));

        var capture = ArgumentCaptor.forClass(EvaluerCritereRequestDto.class);
        verify(iaEvaluationClient).evaluerCritere(capture.capture());
        assertEquals(critereId, capture.getValue().auditCritereId(),
                "La requête transmise au service doit porter le critère analysé.");
        assertEquals("Politique formalisée et diffusée en 2025.", capture.getValue().scenario(),
                "Le scénario saisi par l'organisation doit accompagner la demande d'analyse.");
        assertNotNull(capture.getValue().reponses(),
                "La déclaration de l'organisation doit accompagner la demande d'analyse.");
    }

    /**
     * Un collaborateur ne doit pas seulement recevoir un 403 : le service ne
     * doit jamais être appelé. Sans cette vérification, un refus tardif
     * consommerait quand même le quota.
     */
    @Test
    void collaborateur_nAtteintJamaisLeServiceDAnalyse() {
        Contexte ctx = contexteAnalysable();
        when(iaEvaluationClient.evaluerCritere(any()))
                .thenReturn(reponseSimulee(UUID.fromString(ctx.auditCritereId())));

        var collaborateur = UtilisateurDeTest.creerEtConnecter(jwtService);

        given()
                .header("Authorization", "Bearer " + collaborateur.token)
                .contentType(ContentType.JSON)
                .body("{}")
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId()
                        + "/criteres/" + ctx.auditCritereId() + "/evaluations")
                .then()
                .statusCode(403);

        verify(iaEvaluationClient, never()).evaluerCritere(any());
    }
}
