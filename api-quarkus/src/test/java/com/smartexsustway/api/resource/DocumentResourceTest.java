package com.smartexsustway.api.resource;

import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;

/**
 * RG15 / exigence sécurité §1.4 — upload de documents.
 *
 * ⚠️ {@link #televerser_flotComplet_documentSainEstStocke()} nécessite un
 * vrai MinIO ET un vrai ClamAV démarrés (docker compose up -d minio
 * clamav) — c'est le seul test de cette classe dans ce cas. Les deux
 * autres (rejet de type, isolation multi-tenant) s'arrêtent avant tout
 * appel réseau au stockage ou à l'antivirus et passent sans infrastructure
 * externe.
 */
@QuarkusTest
class DocumentResourceTest {

    @Inject
    JwtService jwtService;

    private String creerEntreprise(String token) {
        return given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Document Test",
                        "identifiantLegal", "RCCM-DOC-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201)
                .extract().path("entreprise.id");
    }

    @Test
    void televerser_typeNonAutorise_estRejeteAvantToutAppelExterne() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = creerEntreprise(utilisateur.token);

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .multiPart("fichier", "script.exe", "contenu-quelconque".getBytes(), "application/x-msdownload")
                .when().post("/api/v1/entreprises/" + entrepriseId + "/documents")
                .then()
                .statusCode(415);
    }

    @Test
    void televerser_sansAccesEntreprise_estRefuseAvantToutAppelExterne() {
        var utilisateurA = UtilisateurDeTest.creerEtConnecter(jwtService);
        var utilisateurB = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = creerEntreprise(utilisateurA.token);

        given()
                .header("Authorization", "Bearer " + utilisateurB.token)
                .multiPart("fichier", "rapport.pdf", "contenu-pdf-factice".getBytes(), "application/pdf")
                .when().post("/api/v1/entreprises/" + entrepriseId + "/documents")
                .then()
                .statusCode(403);
    }

    /**
     * ⚠️ Nécessite MinIO et ClamAV réellement démarrés et prêts à répondre
     * (le premier démarrage de ClamAV peut prendre plusieurs minutes —
     * relancez ce test isolément si besoin une fois les conteneurs stables :
     * mvn test -Dtest=DocumentResourceTest#televerser_flotComplet_documentSainEstStocke
     */
    @Test
    void televerser_flotComplet_documentSainEstStocke() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = creerEntreprise(utilisateur.token);

        String documentId = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .multiPart("fichier", "rapport-rse.pdf", "%PDF-1.4 contenu de test inoffensif".getBytes(), "application/pdf")
                .when().post("/api/v1/entreprises/" + entrepriseId + "/documents")
                .then()
                .statusCode(201)
                .body("statutScan", org.hamcrest.CoreMatchers.equalTo("SAIN"))
                .body("nomOriginal", org.hamcrest.CoreMatchers.equalTo("rapport-rse.pdf"))
                .extract().path("id");

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().get("/api/v1/entreprises/" + entrepriseId + "/documents")
                .then()
                .statusCode(200)
                .body("id", org.hamcrest.Matchers.hasItem(documentId));

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .when().get("/api/v1/entreprises/" + entrepriseId + "/documents/" + documentId + "/telechargement")
                .then()
                .statusCode(200)
                .header("Content-Type", org.hamcrest.CoreMatchers.equalTo("application/pdf"));
    }
}
