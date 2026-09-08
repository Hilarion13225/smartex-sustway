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
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;

/**
 * Qui peut déclencher le moteur IA, et qui peut clôturer.
 *
 * Trois capacités que le produit distingue et que le code confondait :
 * déposer une preuve (`preuve:deposer`) est le travail quotidien d'un
 * collaborateur ; exécuter une analyse (`analyse:executer`) engage un coût
 * et écrit des résultats ; clôturer (`audit:cloturer`) fige la mission.
 *
 * Ces tests attaquent l'API directement, avec un jeton valide et l'URL
 * exacte : le masquage d'un bouton côté React ne les ferait pas passer.
 *
 * Convention de lecture des codes sur l'analyse d'un critère vierge :
 * 403 signifie refusé par l'autorisation, 400 signifie autorisation
 * franchie mais rien à analyser. C'est ce qui permet d'éprouver le contrôle
 * d'accès sans consommer de quota ni écrire d'évaluation.
 */
@QuarkusTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class AutorisationAnalyseTest {

    @Inject JwtService jwtService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;

    private record Mission(String entrepriseId, String auditId, String critereId, String tokenProprietaire) {
    }

    private Mission mission;

    private Mission mission() {
        if (mission == null) {
            mission = construireMission();
        }
        return mission;
    }

    private Mission construireMission() {
        var proprietaire = UtilisateurDeTest.creerEtConnecter(jwtService);

        String entrepriseId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Autorisation Analyse",
                        "identifiantLegal", "RCCM-AUT-" + UUID.randomUUID(),
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
                        "nom", "Mission d'autorisation",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201)
                .extract().path("id");

        String critereId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .when().get("/api/v1/entreprises/" + entrepriseId + "/audits/" + auditId + "/criteres")
                .then().statusCode(200)
                .extract().path("[0].id");

        return new Mission(entrepriseId, auditId, critereId, proprietaire.token);
    }

    /** Rattache un utilisateur neuf à la mission de référence, avec le rôle demandé. */
    private String jetonAvecRole(String roleCode) {
        var candidat = UtilisateurDeTest.creerEtConnecter(jwtService);
        rattacher(UUID.fromString(candidat.id), UUID.fromString(mission().entrepriseId()), roleCode);

        return given()
                .contentType(ContentType.JSON)
                .body(Map.of("email", candidat.email, "motDePasse", candidat.motDePasse))
                .when().post("/api/v1/auth/connexion")
                .then().statusCode(200)
                .extract().path("token");
    }

    @Transactional
    void rattacher(UUID utilisateurId, UUID entrepriseId, String roleCode) {
        var role = roleRepository.parCode(roleCode).orElseThrow();
        var utilisateur = utilisateurRepository.findById(utilisateurId);
        var entreprise = entrepriseRepository.findById(entrepriseId);
        utilisateurEntrepriseRepository.persist(
                new com.smartexsustway.api.domain.entity.UtilisateurEntreprise(utilisateur, entreprise, null, role));
    }

    private io.restassured.response.ValidatableResponse analyser(String jeton, Mission m) {
        return given()
                .header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body("{}")
                .when().post("/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId()
                        + "/criteres/" + m.critereId() + "/evaluations")
                .then();
    }

    private io.restassured.response.ValidatableResponse cloturer(String jeton, Mission m) {
        return given()
                .header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body("{}")
                .when().post("/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId() + "/cloture")
                .then();
    }

    // --- Exécution d'une analyse --------------------------------------------

    @Test
    void collaborateur_neePeutPasLancerUneAnalyse() {
        analyser(jetonAvecRole("COLLABORATEUR"), mission()).statusCode(403);
    }

    @Test
    void responsableEntreprise_peutLancerUneAnalyseSurSaMission() {
        // 400 : l'autorisation est franchie, le critère n'a simplement rien à
        // analyser. C'est le passage du contrôle d'accès qui est éprouvé ici.
        analyser(jetonAvecRole("RESPONSABLE_ENTREPRISE"), mission()).statusCode(400);
    }

    @Test
    void superAdmin_peutLancerUneAnalyse() {
        analyser(jetonAvecRole("SUPER_ADMIN"), mission()).statusCode(400);
    }

    @Test
    void responsableEntreprise_neePeutPasAnalyserLaMissionDUneAutre() {
        var etranger = UtilisateurDeTest.creerEtConnecter(jwtService);
        given()
                .header("Authorization", "Bearer " + etranger.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Autorisation Voisine",
                        "identifiantLegal", "RCCM-AUV-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201);

        analyser(etranger.token, mission()).statusCode(403);
    }

    // --- Clôture -------------------------------------------------------------

    @Test
    void collaborateur_neePeutPasCloturer() {
        cloturer(jetonAvecRole("COLLABORATEUR"), mission()).statusCode(403);
    }

    @Test
    void responsableEntreprise_neePeutPasCloturerLaMissionDUneAutre() {
        var etranger = UtilisateurDeTest.creerEtConnecter(jwtService);
        given()
                .header("Authorization", "Bearer " + etranger.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Cloture Voisine",
                        "identifiantLegal", "RCCM-CLV-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201);

        cloturer(etranger.token, mission()).statusCode(403);
    }

    /**
     * Clôture réellement lancée, sur une mission dédiée : elle traverse ses
     * critères sans rien trouver à analyser, ne consomme aucun appel au
     * modèle, et prouve que le responsable d'entreprise franchit désormais
     * un contrôle qui lui était fermé.
     */
    @Test
    void responsableEntreprise_peutCloturerSaPropreMission() {
        // Mission dédiée : la clôture est réellement lancée, et laisser la
        // mission de référence changer d'état perturberait les autres tests.
        // Elle traverse ses critères sans rien trouver à analyser, donc sans
        // consommer d'appel au modèle.
        Mission dediee = construireMission();

        // Le créateur d'une entreprise en devient RESPONSABLE_ENTREPRISE
        // (voir EntrepriseResource) : c'est bien ce rôle qui clôture ici,
        // sur une capacité qui lui était fermée avant cette phase.
        cloturer(dediee.tokenProprietaire(), dediee).statusCode(202);
    }

    // --- Dépôt de preuve : le collaborateur conserve sa capacité --------------

    @Test
    void collaborateur_peutDeposerUnDocument() {
        given()
                .header("Authorization", "Bearer " + jetonAvecRole("COLLABORATEUR"))
                .multiPart("fichier", "preuve-collaborateur.txt",
                        "Pièce déposée par un collaborateur".getBytes(), "text/plain")
                .when().post("/api/v1/entreprises/" + mission().entrepriseId() + "/documents")
                .then().statusCode(201);
    }
}
