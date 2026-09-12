package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * À qui une action peut être confiée, et qui a le droit de le savoir.
 *
 * <p>Le besoin vient d'une tension réelle : le responsable d'entreprise doit
 * affecter des actions, mais la gestion des accès lui est fermée par décision
 * produit. La réponse retenue n'est pas de rouvrir cette gestion — elle reste
 * fermée — mais d'exposer le strict minimum que désigner quelqu'un demande.
 *
 * <p>Ce qui est éprouvé ici tient en une phrase : cette liste renseigne, elle
 * n'autorise pas. L'écriture revérifie le rattachement, quoi que le client ait
 * pu recevoir.
 */
@QuarkusTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ResponsablesAffectablesTest {

    @Inject JwtService jwtService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;

    private record Mission(String entrepriseId, String auditId, String token) {
    }

    private record Membre(String id, String token) {
    }

    private Mission mission;
    private Mission etrangere;

    private Mission mission() {
        if (mission == null) mission = construireMission("Entreprise Responsables");
        return mission;
    }

    private Mission etrangere() {
        if (etrangere == null) etrangere = construireMission("Entreprise Responsables Etrangere");
        return etrangere;
    }

    private Mission construireMission(String raisonSociale) {
        var proprietaire = UtilisateurDeTest.creerEtConnecter(jwtService);

        String entrepriseId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of("raisonSociale", raisonSociale,
                        "identifiantLegal", "RCCM-RESP-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201).extract().path("entreprise.id");

        given().header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON).body(Map.of("fournisseur", "PI_SPI"))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/abonnement/paiements")
                .then().statusCode(201);

        String auditId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of("referentielCode", "SMARTEX_SUSTWAY",
                        "nom", "Mission responsables",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201).extract().path("id");

        return new Mission(entrepriseId, auditId, proprietaire.token);
    }

    private Membre membre(Mission m, String roleCode) {
        var candidat = UtilisateurDeTest.creerEtConnecter(jwtService);
        rattacher(UUID.fromString(candidat.id), UUID.fromString(m.entrepriseId()), roleCode);
        String jeton = given().contentType(ContentType.JSON)
                .body(Map.of("email", candidat.email, "motDePasse", candidat.motDePasse))
                .when().post("/api/v1/auth/connexion")
                .then().statusCode(200).extract().path("token");
        return new Membre(candidat.id, jeton);
    }

    @Transactional
    void rattacher(UUID utilisateurId, UUID entrepriseId, String roleCode) {
        var role = roleRepository.parCode(roleCode).orElseThrow();
        utilisateurEntrepriseRepository.persist(new UtilisateurEntreprise(
                utilisateurRepository.findById(utilisateurId),
                entrepriseRepository.findById(entrepriseId), null, role));
    }

    private String urlResponsables(Mission m) {
        return "/api/v1/entreprises/" + m.entrepriseId() + "/responsables-affectables";
    }

    private String urlPlans(Mission m) {
        return "/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId() + "/plans-action";
    }

    // === 1 à 5 : qui peut lire cette liste ===============================

    @Test
    void leResponsableRecupereLesMembresDeSonEntreprise() {
        Mission m = mission();
        Membre responsable = membre(m, "RESPONSABLE_ENTREPRISE");
        Membre collaborateur = membre(m, "COLLABORATEUR");

        List<String> ids = given().header("Authorization", "Bearer " + responsable.token())
                .when().get(urlResponsables(m))
                .then().statusCode(200)
                .extract().jsonPath().getList("utilisateurId", String.class);

        assertTrue(ids.contains(collaborateur.id()),
                "le responsable doit voir les membres à qui il peut confier une action");
    }

    @Test
    void leResponsableNeRecuperePasLesMembresDUneAutreEntreprise() {
        Mission autre = etrangere();
        Membre responsable = membre(mission(), "RESPONSABLE_ENTREPRISE");

        given().header("Authorization", "Bearer " + responsable.token())
                .when().get(urlResponsables(autre))
                .then().statusCode(403);
    }

    @Test
    void cetteRouteNOuvrePasLaGestionDesMembres() {
        Mission m = mission();
        Membre responsable = membre(m, "RESPONSABLE_ENTREPRISE");

        // La décision produit tient : la gestion des accès reste fermée au
        // responsable. Seule la liste des noms lui est ouverte.
        given().header("Authorization", "Bearer " + responsable.token())
                .when().get("/api/v1/entreprises/" + m.entrepriseId() + "/membres")
                .then().statusCode(403);
    }

    @Test
    void laListeNePorteNiRoleNiPermissionNiStatut() {
        Mission m = mission();
        membre(m, "COLLABORATEUR");
        Membre responsable = membre(m, "RESPONSABLE_ENTREPRISE");

        String corps = given().header("Authorization", "Bearer " + responsable.token())
                .when().get(urlResponsables(m))
                .then().statusCode(200).extract().asString();

        // Désigner quelqu'un ne demande pas de connaître son compte.
        assertFalse(corps.contains("roleCode"));
        assertFalse(corps.contains("roleNom"));
        assertFalse(corps.contains("permission"));
        assertFalse(corps.contains("statut"));
        assertFalse(corps.contains("email"));
        assertFalse(corps.contains("deuxfa"));
    }

    @Test
    void leSuperAdminConserveSonAcces() {
        Mission m = mission();

        // Le propriétaire de la mission porte un rôle à accès global.
        given().header("Authorization", "Bearer " + m.token())
                .when().get(urlResponsables(m))
                .then().statusCode(200);
    }

    @Test
    void leCollaborateurNeGagneAucunDroit() {
        Mission m = mission();
        Membre collaborateur = membre(m, "COLLABORATEUR");

        // Qui ne peut pas affecter n'a pas besoin de savoir à qui.
        given().header("Authorization", "Bearer " + collaborateur.token())
                .when().get(urlResponsables(m))
                .then().statusCode(403);
    }

    // === 6 à 8 : la liste renseigne, elle n'autorise pas =================

    @Test
    void uneAffectationAUnMembreDeLaMemeEntrepriseEstAcceptee() {
        Mission m = mission();
        Membre destinataire = membre(m, "COLLABORATEUR");
        String planId = creerPlan(m, "Plan affectation légitime");

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "Action confiée", "responsableId", destinataire.id()))
                .when().post(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(201)
                .body("responsableId", equalTo(destinataire.id()))
                .body("responsableNom", not(nullValue()));
    }

    @Test
    void uneAffectationAUnMembreDUneAutreEntrepriseResteRefusee() {
        Mission m = mission();
        Membre intrus = membre(etrangere(), "COLLABORATEUR");
        String planId = creerPlan(m, "Plan affectation interdite");

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "Action", "responsableId", intrus.id()))
                .when().post(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(403);
    }

    @Test
    void uneReaffectationVersUneAutreEntrepriseResteRefusee() {
        Mission m = mission();
        Membre intrus = membre(etrangere(), "COLLABORATEUR");
        String planId = creerPlan(m, "Plan réaffectation interdite");
        String actionId = given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("titre", "Action"))
                .when().post(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(201).extract().path("id");

        // Le contrôle est côté serveur : que le client ait obtenu cet
        // identifiant d'une liste ou l'ait fabriqué ne change rien.
        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("responsableId", intrus.id()))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/responsable")
                .then().statusCode(403);
    }

    // === 9 : le nom est rendu ============================================

    @Test
    void leNomDuResponsableEstRenduSurLePlanEtSurLAction() {
        Mission m = mission();
        Membre destinataire = membre(m, "COLLABORATEUR");

        String planId = given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "Plan avec responsable", "responsableId", destinataire.id()))
                .when().post(urlPlans(m))
                .then().statusCode(201)
                .body("responsableNom", not(nullValue()))
                .extract().path("id");

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "Action nommée", "responsableId", destinataire.id()))
                .when().post(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(201)
                .body("responsableNom", not(nullValue()));
    }

    @Test
    void uneActionSansResponsableNAffichePasDeNom() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan sans responsable");

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("titre", "Action non affectée"))
                .when().post(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(201)
                .body("responsableId", nullValue())
                .body("responsableNom", nullValue());
    }

    // === 10 : IDOR =======================================================

    @Test
    void laListeDUneEntrepriseNEstPasAtteignableParUnTiers() {
        Mission m = mission();
        Mission autre = etrangere();

        // Le propriétaire d'une autre entreprise, avec l'URL exacte.
        given().header("Authorization", "Bearer " + autre.token())
                .when().get(urlResponsables(m))
                .then().statusCode(403);
    }

    @Test
    void laListeNeDeborteJamaisSurUneAutreEntreprise() {
        Mission m = mission();
        Membre chezNous = membre(m, "COLLABORATEUR");
        Membre ailleurs = membre(etrangere(), "COLLABORATEUR");

        List<String> ids = given().header("Authorization", "Bearer " + m.token())
                .when().get(urlResponsables(m))
                .then().statusCode(200)
                .extract().jsonPath().getList("utilisateurId", String.class);

        assertTrue(ids.contains(chezNous.id()));
        assertFalse(ids.contains(ailleurs.id()),
                "un membre d'une autre entreprise n'a rien à faire dans cette liste");
    }

    private String creerPlan(Mission m, String titre) {
        return given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("titre", titre))
                .when().post(urlPlans(m))
                .then().statusCode(201).extract().path("id");
    }
}
