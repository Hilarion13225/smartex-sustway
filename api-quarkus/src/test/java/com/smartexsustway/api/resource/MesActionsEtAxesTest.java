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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * « Mes actions » et la modification des axes d'une action.
 *
 * <p>Deux ajouts qui répondent à la même dette : le collaborateur lit tout le
 * plan mais ne retrouvait pas son propre travail, et une action créée gardait
 * ses axes pour toujours.
 *
 * <p>Le point de sécurité central est que le filtrage de « mes actions » se
 * fait <strong>en base, sur l'identité du jeton</strong>. Les tests le
 * vérifient de la seule façon qui compte : en demandant la liste avec
 * plusieurs jetons et en comparant ce que chacun reçoit.
 */
@QuarkusTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class MesActionsEtAxesTest {

    @Inject JwtService jwtService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;

    private record Mission(String entrepriseId, String auditId, String critereId, String token) {
    }

    private record Membre(String id, String token) {
    }

    private Mission mission;
    private Mission etrangere;

    private Mission mission() {
        if (mission == null) mission = construireMission("Entreprise Mes Actions");
        return mission;
    }

    private Mission etrangere() {
        if (etrangere == null) etrangere = construireMission("Entreprise Mes Actions Etrangere");
        return etrangere;
    }

    private Mission construireMission(String raisonSociale) {
        var proprietaire = UtilisateurDeTest.creerEtConnecter(jwtService);

        String entrepriseId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of("raisonSociale", raisonSociale,
                        "identifiantLegal", "RCCM-MESACT-" + UUID.randomUUID(),
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
                        "nom", "Mission mes actions",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201).extract().path("id");

        String critereId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .when().get("/api/v1/entreprises/" + entrepriseId + "/audits/" + auditId + "/criteres")
                .then().statusCode(200).extract().path("[0].id");

        return new Mission(entrepriseId, auditId, critereId, proprietaire.token);
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

    private String urlPlans(Mission m) {
        return "/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId() + "/plans-action";
    }

    private String urlMesActions(Mission m) {
        return "/api/v1/entreprises/" + m.entrepriseId() + "/mes-actions";
    }

    private String creerPlan(Mission m, String titre) {
        return given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("titre", titre))
                .when().post(urlPlans(m))
                .then().statusCode(201).extract().path("id");
    }

    /** Un axe validé, prêt à être planifié. */
    private String axeValide(Mission m, String libelle) {
        String axeId = given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("libelle", libelle, "auditCritereId", m.critereId()))
                .when().post("/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId()
                        + "/axes-amelioration")
                .then().statusCode(201).extract().path("id");
        given().header("Authorization", "Bearer " + m.token()).contentType(ContentType.JSON)
                .when().post("/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId()
                        + "/axes-amelioration/" + axeId + "/validation")
                .then().statusCode(200);
        return axeId;
    }

    private String axePropose(Mission m, String libelle) {
        return given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("libelle", libelle, "auditCritereId", m.critereId()))
                .when().post("/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId()
                        + "/axes-amelioration")
                .then().statusCode(201).extract().path("id");
    }

    private static Map<String, Object> corps(String cle, Object valeur) {
        Map<String, Object> m = new HashMap<>();
        m.put(cle, valeur);
        return m;
    }

    // === B : « Mes actions » =============================================

    @Test
    void chacunNeRecoitQueSesPropresActions() {
        Mission m = mission();
        Membre a = membre(m, "COLLABORATEUR");
        Membre b = membre(m, "COLLABORATEUR");
        String planId = creerPlan(m, "Plan mes actions");

        actionAffectee(m, planId, "Tâche de A", a.id());
        actionAffectee(m, planId, "Tâche de B", b.id());

        List<String> titresDeA = given().header("Authorization", "Bearer " + a.token())
                .when().get(urlMesActions(m))
                .then().statusCode(200)
                .extract().jsonPath().getList("titre", String.class);

        assertTrue(titresDeA.contains("Tâche de A"));
        assertFalse(titresDeA.contains("Tâche de B"),
                "la tâche d'un autre n'a rien à faire dans « mes actions »");
    }

    @Test
    void uneActionNonAffecteeNApparaitDansAucuneListe() {
        Mission m = mission();
        Membre a = membre(m, "COLLABORATEUR");
        String planId = creerPlan(m, "Plan action orpheline");
        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("titre", "Tâche sans responsable"))
                .when().post(urlPlans(m) + "/" + planId + "/actions").then().statusCode(201);

        List<String> titres = given().header("Authorization", "Bearer " + a.token())
                .when().get(urlMesActions(m))
                .then().statusCode(200).extract().jsonPath().getList("titre", String.class);

        assertFalse(titres.contains("Tâche sans responsable"));
    }

    @Test
    void aucuneActionDUneAutreEntrepriseNApparait() {
        Mission m = mission();
        Mission autre = etrangere();
        Membre partage = membre(m, "COLLABORATEUR");
        rattacher(UUID.fromString(partage.id()), UUID.fromString(autre.entrepriseId()), "COLLABORATEUR");

        String planIci = creerPlan(m, "Plan ici");
        actionAffectee(m, planIci, "Tâche ici", partage.id());
        String planAilleurs = creerPlan(autre, "Plan ailleurs");
        actionAffectee(autre, planAilleurs, "Tâche ailleurs", partage.id());

        // La même personne, rattachée aux deux entreprises : chaque liste est
        // bornée à son entreprise, jamais cumulée.
        List<String> ici = given().header("Authorization", "Bearer " + partage.token())
                .when().get(urlMesActions(m))
                .then().statusCode(200).extract().jsonPath().getList("titre", String.class);

        assertTrue(ici.contains("Tâche ici"));
        assertFalse(ici.contains("Tâche ailleurs"));
    }

    @Test
    void unIntrusNAccedePasALaListeDUneAutreEntreprise() {
        Mission m = mission();
        Mission autre = etrangere();

        given().header("Authorization", "Bearer " + autre.token())
                .when().get(urlMesActions(m))
                .then().statusCode(403);
    }

    @Test
    void laListePorteLeContextePlanEtMission() {
        Mission m = mission();
        Membre a = membre(m, "COLLABORATEUR");
        String planId = creerPlan(m, "Plan contexte");
        String axeId = axeValide(m, "Axe pour le contexte");
        String actionId = actionAffectee(m, planId, "Tâche contextualisée", a.id());
        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("axeIds", List.of(axeId)))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/axes")
                .then().statusCode(200);

        given().header("Authorization", "Bearer " + a.token())
                .when().get(urlMesActions(m))
                .then().statusCode(200)
                .body("find { it.titre == 'Tâche contextualisée' }.planTitre", equalTo("Plan contexte"))
                .body("find { it.titre == 'Tâche contextualisée' }.auditNom",
                        equalTo("Mission mes actions"))
                .body("find { it.titre == 'Tâche contextualisée' }.axes", hasSize(1));
    }

    @Test
    void aucunRaisonnementIaDansMesActions() {
        Mission m = mission();
        Membre a = membre(m, "COLLABORATEUR");
        String planId = creerPlan(m, "Plan sans IA");
        actionAffectee(m, planId, "Tâche neutre", a.id());

        String corps = given().header("Authorization", "Bearer " + a.token())
                .when().get(urlMesActions(m))
                .then().statusCode(200).extract().asString();

        assertFalse(corps.contains("justification"));
        assertFalse(corps.contains("prompt"));
        assertFalse(corps.contains("responseId"));
        assertFalse(corps.contains("servedModel"));
    }

    @Test
    void leResponsableVoitAussiSesPropresActions() {
        Mission m = mission();
        Membre resp = membre(m, "RESPONSABLE_ENTREPRISE");
        String planId = creerPlan(m, "Plan du responsable");
        actionAffectee(m, planId, "Tâche du responsable", resp.id());

        // La route ne réserve rien à un rôle : elle rend le travail de qui
        // la demande.
        given().header("Authorization", "Bearer " + resp.token())
                .when().get(urlMesActions(m))
                .then().statusCode(200)
                .body("find { it.titre == 'Tâche du responsable' }.planStatut",
                        equalTo("BROUILLON"));
    }

    private String actionAffectee(Mission m, String planId, String titre, String responsableId) {
        return given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("titre", titre, "responsableId", responsableId))
                .when().post(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(201).extract().path("id");
    }

    // === C : axes d'une action existante =================================

    @Test
    void lesAxesDUneActionSeRemplacent() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan axes remplaçables");
        String a1 = axeValide(m, "Premier axe planifiable");
        String a2 = axeValide(m, "Deuxième axe planifiable");
        String actionId = given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("titre", "Action à rattacher"))
                .when().post(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(201).extract().path("id");

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("axeIds", List.of(a1, a2)))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/axes")
                .then().statusCode(200).body("axeIds", hasSize(2));

        // Remplacement, pas ajout : la nouvelle liste est celle qui vaut.
        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("axeIds", List.of(a1)))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/axes")
                .then().statusCode(200).body("axeIds", hasSize(1));
    }

    @Test
    void uneListeVideDetacheTousLesAxes() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan détachement");
        String axeId = axeValide(m, "Axe à détacher");
        String actionId = given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "Action détachable", "axeIds", List.of(axeId)))
                .when().post(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(201).extract().path("id");

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(corps("axeIds", List.of()))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/axes")
                .then().statusCode(200).body("axeIds", hasSize(0));
    }

    @Test
    void unAxeProposeNePeutPasEtreRattacheApresCoup() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan axe proposé");
        String propose = axePropose(m, "Axe encore proposé");
        String actionId = given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("titre", "Action"))
                .when().post(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(201).extract().path("id");

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("axeIds", List.of(propose)))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/axes")
                .then().statusCode(409);
    }

    @Test
    void leStatutDeLAxeNeChangePasQuandOnLePlanifie() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan statut d'axe");
        String axeId = axeValide(m, "Axe dont le statut ne bouge pas");
        String actionId = given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("titre", "Action"))
                .when().post(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(201).extract().path("id");

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("axeIds", List.of(axeId)))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/axes")
                .then().statusCode(200);
        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(corps("axeIds", List.of()))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/axes")
                .then().statusCode(200);

        // Un axe reste VALIDE qu'il soit planifié, déplanifié, ou traité par
        // plusieurs plans : son cycle est indépendant de celui des plans.
        given().header("Authorization", "Bearer " + m.token())
                .when().get("/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId()
                        + "/axes-amelioration/" + axeId)
                .then().statusCode(200).body("statut", equalTo("VALIDE"));
    }

    @Test
    void unAxeDUneAutreMissionEstRefuse() {
        Mission m = mission();
        Mission autre = etrangere();
        String axeAilleurs = axeValide(autre, "Axe d'ailleurs");
        String planId = creerPlan(m, "Plan axe étranger");
        String actionId = given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("titre", "Action"))
                .when().post(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(201).extract().path("id");

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("axeIds", List.of(axeAilleurs)))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/axes")
                .then().statusCode(404);
    }

    @Test
    void unPlanGeleRefuseToutChangementDAxes() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan gelé axes");
        String axeId = axeValide(m, "Axe sur plan gelé");
        String actionId = given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("titre", "Action"))
                .when().post(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(201).extract().path("id");
        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("motif", "Terminé."))
                .when().post(urlPlans(m) + "/" + planId + "/cloture").then().statusCode(200);

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("axeIds", List.of(axeId)))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/axes")
                .then().statusCode(409);
    }

    @Test
    void leCollaborateurNeChangePasLesAxesDeLActionDUnAutre() {
        Mission m = mission();
        Membre titulaire = membre(m, "COLLABORATEUR");
        Membre tiers = membre(m, "COLLABORATEUR");
        String planId = creerPlan(m, "Plan axes d'autrui");
        String axeId = axeValide(m, "Axe convoité");
        String actionId = actionAffectee(m, planId, "Tâche du titulaire", titulaire.id());

        given().header("Authorization", "Bearer " + tiers.token())
                .contentType(ContentType.JSON).body(Map.of("axeIds", List.of(axeId)))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/axes")
                .then().statusCode(403);
    }

    @Test
    void laProgressionNEstPasAffecteeParUnChangementDAxes() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan progression stable");
        String axeId = axeValide(m, "Axe neutre pour la progression");
        String a1 = given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("titre", "Action 1"))
                .when().post(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(201).extract().path("id");
        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("titre", "Action 2"))
                .when().post(urlPlans(m) + "/" + planId + "/actions").then().statusCode(201);
        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("statut", "TERMINEE"))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + a1 + "/statut")
                .then().statusCode(200);

        int avant = given().header("Authorization", "Bearer " + m.token())
                .when().get(urlPlans(m) + "/" + planId)
                .then().statusCode(200).extract().path("progression");

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("axeIds", List.of(axeId)))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + a1 + "/axes")
                .then().statusCode(200);

        int apres = given().header("Authorization", "Bearer " + m.token())
                .when().get(urlPlans(m) + "/" + planId)
                .then().statusCode(200).extract().path("progression");

        // La progression compte des statuts, pas des rattachements.
        assertEquals(avant, apres);
        assertEquals(50, apres);
    }
}
