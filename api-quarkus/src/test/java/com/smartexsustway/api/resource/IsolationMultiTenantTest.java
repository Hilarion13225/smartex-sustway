package com.smartexsustway.api.resource;

import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.hasItem;

/**
 * Isolation entre entreprises — un utilisateur de l'entreprise A ne doit
 * jamais atteindre une donnée de l'entreprise B.
 *
 * Ces tests attaquent l'API par substitution d'identifiant (IDOR) : le
 * jeton appartient bien à l'utilisateur B, mais l'URL désigne une ressource
 * de A. Un filtrage limité au frontend laisserait passer chacun d'eux.
 *
 * Ils sont écrits AVANT la migration des rôles, et non après : ils doivent
 * passer sur l'organisation actuelle des rôles comme sur la cible. C'est ce
 * qui en fait un filet de sécurité pour toutes les phases suivantes — une
 * régression d'isolation introduite par un changement de rôle se verra ici.
 *
 * L'entreprise de référence est construite une seule fois pour toute la
 * classe : chaque création déclenche la composition d'un questionnaire de
 * quatre-vingt-douze critères, trop coûteuse pour être répétée à chaque test.
 */
@QuarkusTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class IsolationMultiTenantTest {

    @Inject
    JwtService jwtService;

    /** Ressources de l'entreprise A, la cible convoitée. */
    private record EntrepriseA(String entrepriseId, String auditId, String auditCritereId,
                               String documentId, String token) {
    }

    private EntrepriseA a;
    /** Utilisateur d'une autre entreprise, sans aucun lien avec A. */
    private UtilisateurDeTest intrus;

    /**
     * Construction au premier test plutôt qu'en @BeforeAll : ce dernier
     * s'exécute avant que le serveur HTTP de test n'écoute, et toute requête
     * y échoue en « connection refused ». L'instance étant partagée par la
     * classe (PER_CLASS), le questionnaire de quatre-vingt-douze critères
     * n'est composé qu'une fois malgré tout.
     */
    private EntrepriseA a() {
        if (a == null) {
            a = construireEntrepriseA();
        }
        return a;
    }

    private String jetonIntrus() {
        if (intrus == null) {
            intrus = construireIntrus();
        }
        return intrus.token;
    }

    private EntrepriseA construireEntrepriseA() {
        var proprietaire = UtilisateurDeTest.creerEtConnecter(jwtService);

        String entrepriseId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Isolation A",
                        "identifiantLegal", "RCCM-ISO-A-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201)
                .extract().path("entreprise.id");

        // RG20 : sans abonnement actif, la mission ne peut pas être créée.
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
                        "nom", "Mission confidentielle A",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201)
                .extract().path("id");

        String auditCritereId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .when().get("/api/v1/entreprises/" + entrepriseId + "/audits/" + auditId + "/criteres")
                .then().statusCode(200)
                .extract().path("[0].id");

        String documentId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .multiPart("fichier", "secret-a.txt", "Document interne de l'entreprise A".getBytes(),
                        "text/plain")
                .when().post("/api/v1/entreprises/" + entrepriseId + "/documents")
                .then().statusCode(201)
                .extract().path("id");

        return new EntrepriseA(entrepriseId, auditId, auditCritereId, documentId, proprietaire.token);
    }

    /** Un utilisateur qui possède sa propre entreprise, donc authentifié et légitime ailleurs. */
    private UtilisateurDeTest construireIntrus() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Isolation B",
                        "identifiantLegal", "RCCM-ISO-B-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201);
        return utilisateur;
    }

    /** Toute lecture croisée doit être refusée — 403 attendu, jamais 200. */
    private void lectureRefusee(String chemin) {
        given()
                .header("Authorization", "Bearer " + jetonIntrus())
                .when().get(chemin)
                .then().statusCode(403);
    }

    // --- Entreprise ---------------------------------------------------------

    @Test
    void entreprise_dUneAutreOrganisation_estRefusee() {
        lectureRefusee("/api/v1/entreprises/" + a().entrepriseId());
    }

    @Test
    void listeDesEntreprises_neMontreQueLesSiennes() {
        given()
                .header("Authorization", "Bearer " + jetonIntrus())
                .when().get("/api/v1/entreprises")
                .then().statusCode(200)
                .body("id", not(hasItem(a().entrepriseId())))
                .body("raisonSociale", everyItem(not("Entreprise Isolation A")));
    }

    @Test
    void membres_dUneAutreOrganisation_sontRefuses() {
        lectureRefusee("/api/v1/entreprises/" + a().entrepriseId() + "/membres");
    }

    @Test
    void journalDAudit_dUneAutreOrganisation_estRefuse() {
        lectureRefusee("/api/v1/entreprises/" + a().entrepriseId() + "/journal");
    }

    // --- Missions et questionnaire ------------------------------------------

    @Test
    void missions_dUneAutreOrganisation_sontRefusees() {
        lectureRefusee("/api/v1/entreprises/" + a().entrepriseId() + "/audits");
    }

    @Test
    void mission_parSonIdentifiant_estRefusee() {
        lectureRefusee("/api/v1/entreprises/" + a().entrepriseId() + "/audits/" + a().auditId());
    }

    @Test
    void criteresDUneMission_dUneAutreOrganisation_sontRefuses() {
        lectureRefusee("/api/v1/entreprises/" + a().entrepriseId() + "/audits/" + a().auditId() + "/criteres");
    }

    @Test
    void questionnaireCompose_dUneAutreOrganisation_estRefuse() {
        lectureRefusee("/api/v1/entreprises/" + a().entrepriseId()
                + "/questionnaire?referentiel=SMARTEX_SUSTWAY");
    }

    @Test
    void reponsesDUnCritere_dUneAutreOrganisation_sontRefusees() {
        lectureRefusee("/api/v1/entreprises/" + a().entrepriseId() + "/audits/" + a().auditId()
                + "/criteres/" + a().auditCritereId() + "/questions");
    }

    /**
     * L'écriture est plus grave encore que la lecture : un intrus qui
     * répondrait au questionnaire d'une autre entreprise en fausserait
     * l'audit sans que personne ne le voie.
     */
    @Test
    void repondreAuQuestionnaire_dUneAutreOrganisation_estRefuse() {
        given()
                .header("Authorization", "Bearer " + jetonIntrus())
                .contentType(ContentType.JSON)
                .body(Map.of("scenario", "injection", "reponses", java.util.List.of()))
                .when().put("/api/v1/entreprises/" + a().entrepriseId() + "/audits/" + a().auditId()
                        + "/criteres/" + a().auditCritereId() + "/questions")
                .then().statusCode(403);
    }

    // --- Documents et preuves -----------------------------------------------

    @Test
    void documents_dUneAutreOrganisation_sontRefuses() {
        lectureRefusee("/api/v1/entreprises/" + a().entrepriseId() + "/documents");
    }

    @Test
    void telechargementDUnDocument_dUneAutreOrganisation_estRefuse() {
        lectureRefusee("/api/v1/entreprises/" + a().entrepriseId() + "/documents/"
                + a().documentId() + "/telechargement");
    }

    @Test
    void preuvesDUneMission_dUneAutreOrganisation_sontRefusees() {
        lectureRefusee("/api/v1/entreprises/" + a().entrepriseId() + "/audits/" + a().auditId() + "/preuves");
    }

    // --- Analyses et évaluations --------------------------------------------

    @Test
    void evaluationsDUnCritere_dUneAutreOrganisation_sontRefusees() {
        lectureRefusee("/api/v1/entreprises/" + a().entrepriseId() + "/audits/" + a().auditId()
                + "/criteres/" + a().auditCritereId() + "/evaluations");
    }

    /**
     * Lancer une analyse sur la mission d'autrui consommerait son quota IA et
     * écrirait dans ses résultats.
     */
    @Test
    void lancerUneAnalyse_surLaMissionDUnAutre_estRefuse() {
        given()
                .header("Authorization", "Bearer " + jetonIntrus())
                .contentType(ContentType.JSON)
                .body("{}")
                .when().post("/api/v1/entreprises/" + a().entrepriseId() + "/audits/" + a().auditId()
                        + "/criteres/" + a().auditCritereId() + "/evaluations")
                .then().statusCode(403);
    }

    @Test
    void score_dUneAutreOrganisation_estRefuse() {
        lectureRefusee("/api/v1/entreprises/" + a().entrepriseId() + "/audits/" + a().auditId() + "/score");
    }

    // --- Écarts, actions, rapports ------------------------------------------

    @Test
    void nonConformites_dUneAutreOrganisation_sontRefusees() {
        lectureRefusee("/api/v1/entreprises/" + a().entrepriseId() + "/audits/" + a().auditId()
                + "/non-conformites");
    }

    /**
     * Les actions correctives pendent à une non-conformité. L'identifiant
     * employé ici est arbitraire : le contrôle d'accès à l'entreprise passe
     * avant la résolution de la ressource, un intrus doit donc être arrêté
     * sans même savoir si la non-conformité existe.
     */
    @Test
    void plansDAction_dUneAutreOrganisation_sontRefuses() {
        lectureRefusee("/api/v1/entreprises/" + a().entrepriseId() + "/audits/" + a().auditId()
                + "/non-conformites/" + UUID.randomUUID() + "/actions");
    }

    @Test
    void rapports_dUneAutreOrganisation_sontRefuses() {
        lectureRefusee("/api/v1/entreprises/" + a().entrepriseId() + "/audits/" + a().auditId() + "/rapports");
    }

    @Test
    void genererUnRapport_pourUneAutreOrganisation_estRefuse() {
        given()
                .header("Authorization", "Bearer " + jetonIntrus())
                .contentType(ContentType.JSON)
                .body(Map.of("type", "SYNTHESE", "format", "CSV"))
                .when().post("/api/v1/entreprises/" + a().entrepriseId() + "/audits/" + a().auditId() + "/rapports")
                .then().statusCode(403);
    }

    // --- Financements --------------------------------------------------------

    @Test
    void indiceDePreparation_dUneAutreOrganisation_estRefuse() {
        lectureRefusee("/api/v1/entreprises/" + a().entrepriseId() + "/audits/" + a().auditId()
                + "/indice-preparation");
    }

    // --- Modification --------------------------------------------------------

    /**
     * Le corps est volontairement complet et valide : la validation des
     * champs s'exécute avant le corps de la méthode, donc avant le contrôle
     * d'accès. Une requête incomplète serait rejetée en 400 sans jamais
     * éprouver l'isolation — ce qui donnerait un test faussement rassurant.
     */
    @Test
    void modifierUneAutreOrganisation_estRefuse() {
        given()
                .header("Authorization", "Bearer " + jetonIntrus())
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise détournée",
                        "identifiantLegal", "RCCM-VOL-" + UUID.randomUUID()))
                .when().put("/api/v1/entreprises/" + a().entrepriseId())
                .then().statusCode(403);
    }

    @Test
    void creerUneMission_dansUneAutreOrganisation_estRefuse() {
        given()
                .header("Authorization", "Bearer " + jetonIntrus())
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "referentielCode", "SMARTEX_SUSTWAY",
                        "nom", "Mission injectée",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + a().entrepriseId() + "/audits")
                .then().statusCode(403);
    }
}
