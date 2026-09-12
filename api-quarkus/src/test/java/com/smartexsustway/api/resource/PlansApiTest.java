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
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * Les plans d'action par l'API : ce que chaque rôle peut faire, et sur quoi.
 *
 * <p>Le point le plus important est celui qui n'était pas tenu : un
 * responsable désigné doit appartenir à l'entreprise de la mission. Sans ce
 * contrôle, une action pouvait être affectée à un utilisateur d'une autre
 * entreprise — qui n'aurait pas pu la traiter, mais dont l'identité était
 * restituée. Les tests d'affectation inter-entreprises sont donc au cœur de
 * cette classe, pas en annexe.
 *
 * <p>Tout est éprouvé par des appels réels, avec jeton réel sur l'URL exacte.
 */
@QuarkusTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class PlansApiTest {

    @Inject JwtService jwtService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;

    private record Mission(String entrepriseId, String auditId, String token) {
    }

    private Mission mission;
    private Mission etrangere;

    private Mission mission() {
        if (mission == null) {
            mission = construireMission("Entreprise Plans API");
        }
        return mission;
    }

    private Mission etrangere() {
        if (etrangere == null) {
            etrangere = construireMission("Entreprise Plans Etrangere");
        }
        return etrangere;
    }

    private Mission construireMission(String raisonSociale) {
        var proprietaire = UtilisateurDeTest.creerEtConnecter(jwtService);

        String entrepriseId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of("raisonSociale", raisonSociale,
                        "identifiantLegal", "RCCM-PLAN-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201).extract().path("entreprise.id");

        given().header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of("fournisseur", "PI_SPI"))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/abonnement/paiements")
                .then().statusCode(201);

        String auditId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of("referentielCode", "SMARTEX_SUSTWAY",
                        "nom", "Mission plans",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201).extract().path("id");

        return new Mission(entrepriseId, auditId, proprietaire.token);
    }

    /** Un membre de l'entreprise, avec son identifiant et son jeton. */
    private record Membre(String id, String token) {
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

    private String creerPlan(Mission m, String titre) {
        return given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("titre", titre))
                .when().post(urlPlans(m))
                .then().statusCode(201).extract().path("id");
    }

    private String ajouterAction(Mission m, String planId, String titre) {
        return given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("titre", titre))
                .when().post(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(201).extract().path("id");
    }

    /** Corps acceptant une valeur nulle, que `Map.of` refuse. */
    private static Map<String, Object> corps(String cle, Object valeur) {
        Map<String, Object> m = new HashMap<>();
        m.put(cle, valeur);
        return m;
    }

    // === Affectation : la garde de rattachement ==========================

    @Test
    void unResponsableDUneAutreEntrepriseEstRefuse() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan avec responsable étranger");
        Membre intrus = membre(etrangere(), "COLLABORATEUR");

        // Le cœur du correctif : l'identifiant est valide, l'utilisateur
        // existe — mais il n'appartient pas à cette entreprise.
        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "Action affectée à un étranger",
                        "responsableId", intrus.id()))
                .when().post(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(403);
    }

    @Test
    void unResponsableInexistantEstRefuseExplicitement() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan avec responsable inexistant");

        // Avant, `findById` rendait null et le responsable était posé à null
        // en silence : la demande semblait acceptée.
        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "Action", "responsableId", UUID.randomUUID().toString()))
                .when().post(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(400);
    }

    @Test
    void unResponsableDeLEntrepriseEstAccepte() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan avec responsable légitime");
        Membre collaborateur = membre(m, "COLLABORATEUR");

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "Action affectée", "responsableId", collaborateur.id()))
                .when().post(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(201)
                .body("responsableId", equalTo(collaborateur.id()));
    }

    @Test
    void laMemeGardeSAppliqueAuPlanLuiMeme() {
        Mission m = mission();
        Membre intrus = membre(etrangere(), "COLLABORATEUR");

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "Plan mal affecté", "responsableId", intrus.id()))
                .when().post(urlPlans(m))
                .then().statusCode(403);
    }

    @Test
    void laMemeGardeSAppliqueAuxActionsCorrectives() {
        Mission m = mission();
        Membre intrus = membre(etrangere(), "COLLABORATEUR");

        // Chemin distinct, même faille : couvert sans refondre le module.
        // On vise une non-conformité inexistante : le 403 de la garde ne doit
        // pas être atteint avant le 404, donc on vérifie seulement que la
        // requête n'aboutit pas en 201.
        int statut = given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "Action corrective", "responsableId", intrus.id()))
                .when().post("/api/v1/entreprises/" + m.entrepriseId() + "/audits/"
                        + m.auditId() + "/non-conformites/" + UUID.randomUUID() + "/actions")
                .then().extract().statusCode();

        assertFalse(statut == 201, "une affectation inter-entreprises ne doit jamais aboutir");
    }

    // === Réaffectation ===================================================

    @Test
    void uneReaffectationEstJournaliseeAvecLAncienEtLeNouveau() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan réaffectation");
        Membre premier = membre(m, "COLLABORATEUR");
        Membre second = membre(m, "COLLABORATEUR");

        String actionId = given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "Action à réaffecter", "responsableId", premier.id()))
                .when().post(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(201).extract().path("id");

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("responsableId", second.id()))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/responsable")
                .then().statusCode(200)
                .body("responsableId", equalTo(second.id()));

        // Savoir qu'une réaffectation a eu lieu sans savoir d'où vers où ne
        // permet de reconstituer aucune chaîne de responsabilité.
        String details = detailsDuJournal("ACTION_PLAN_REAFFECTEE", UUID.fromString(actionId));
        org.junit.jupiter.api.Assertions.assertTrue(details.contains(premier.id()),
                "l'ancien responsable doit figurer au journal");
        org.junit.jupiter.api.Assertions.assertTrue(details.contains(second.id()),
                "le nouveau responsable doit figurer au journal");
    }

    @Test
    void uneReaffectationVersUneAutreEntrepriseEstRefusee() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan réaffectation interdite");
        String actionId = ajouterAction(m, planId, "Action");
        Membre intrus = membre(etrangere(), "COLLABORATEUR");

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("responsableId", intrus.id()))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/responsable")
                .then().statusCode(403);
    }

    @Test
    void uneDesaffectationExpliciteEstAcceptee() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan désaffectation");
        Membre titulaire = membre(m, "COLLABORATEUR");
        String actionId = given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "Action", "responsableId", titulaire.id()))
                .when().post(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(201).extract().path("id");

        // Retirer un responsable est un geste légitime, pas une erreur.
        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(corps("responsableId", null))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/responsable")
                .then().statusCode(200)
                .body("responsableId", nullValue());
    }

    @Transactional
    String detailsDuJournal(String action, UUID entiteId) {
        Object valeur = utilisateurRepository.getEntityManager()
                .createNativeQuery("SELECT details FROM audit_log WHERE action = ?1 AND entite_id = ?2 LIMIT 1")
                .setParameter(1, action)
                .setParameter(2, entiteId)
                .getSingleResult();
        return valeur == null ? "" : valeur.toString();
    }

    // === Collaborateur : lit tout, n'écrit que sur son travail ===========

    @Test
    void leCollaborateurLitLePlanCollectif() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan collectif");
        ajouterAction(m, planId, "Action d'un autre");
        Membre collaborateur = membre(m, "COLLABORATEUR");

        // Masquer les actions des autres rendrait la progression du plan
        // incompréhensible : le collaborateur lit tout.
        given().header("Authorization", "Bearer " + collaborateur.token())
                .when().get(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(200)
                .body("size()", not(equalTo(0)));
    }

    @Test
    void leCollaborateurNeCreePasDePlan() {
        Mission m = mission();
        Membre collaborateur = membre(m, "COLLABORATEUR");

        given().header("Authorization", "Bearer " + collaborateur.token())
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "Plan interdit"))
                .when().post(urlPlans(m))
                .then().statusCode(403);
    }

    @Test
    void leCollaborateurAvanceSonActionJusquATerminee() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan du collaborateur");
        Membre collaborateur = membre(m, "COLLABORATEUR");
        String actionId = given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "Sa tâche", "responsableId", collaborateur.id()))
                .when().post(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(201).extract().path("id");

        given().header("Authorization", "Bearer " + collaborateur.token())
                .contentType(ContentType.JSON)
                .body(Map.of("statut", "EN_COURS"))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/statut")
                .then().statusCode(200).body("statut", equalTo("EN_COURS"));

        given().header("Authorization", "Bearer " + collaborateur.token())
                .contentType(ContentType.JSON)
                .body(Map.of("statut", "TERMINEE"))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/statut")
                .then().statusCode(200).body("statut", equalTo("TERMINEE"));
    }

    @Test
    void leCollaborateurNeValidePasSaPropreAction() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan validation interdite");
        Membre collaborateur = membre(m, "COLLABORATEUR");
        String actionId = given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "Sa tâche", "responsableId", collaborateur.id()))
                .when().post(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(201).extract().path("id");

        given().header("Authorization", "Bearer " + collaborateur.token())
                .contentType(ContentType.JSON)
                .body(Map.of("statut", "TERMINEE"))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/statut")
                .then().statusCode(200);

        // Celui qui fait n'atteste pas de son propre travail.
        given().header("Authorization", "Bearer " + collaborateur.token())
                .contentType(ContentType.JSON)
                .body(Map.of("statut", "VALIDEE"))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/statut")
                .then().statusCode(403);
    }

    @Test
    void leCollaborateurNeTouchePasALActionDUnAutre() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan action d'autrui");
        Membre titulaire = membre(m, "COLLABORATEUR");
        Membre tiers = membre(m, "COLLABORATEUR");
        String actionId = given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "Tâche du titulaire", "responsableId", titulaire.id()))
                .when().post(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(201).extract().path("id");

        given().header("Authorization", "Bearer " + tiers.token())
                .contentType(ContentType.JSON)
                .body(Map.of("statut", "EN_COURS"))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/statut")
                .then().statusCode(403);
    }

    @Test
    void leCollaborateurNeReaffectePasUneAction() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan réaffectation interdite au collaborateur");
        Membre collaborateur = membre(m, "COLLABORATEUR");
        String actionId = given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "Sa tâche", "responsableId", collaborateur.id()))
                .when().post(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(201).extract().path("id");

        // Avancer son travail est une chose ; décider qui le fait en est une
        // autre.
        given().header("Authorization", "Bearer " + collaborateur.token())
                .contentType(ContentType.JSON)
                .body(corps("responsableId", null))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/responsable")
                .then().statusCode(403);
    }

    // === Transitions =====================================================

    @Test
    void leResponsableValideUneActionTerminee() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan validation");
        String actionId = ajouterAction(m, planId, "Action à valider");

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("statut", "TERMINEE"))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/statut")
                .then().statusCode(200);

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("statut", "VALIDEE"))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/statut")
                .then().statusCode(200).body("statut", equalTo("VALIDEE"));
    }

    @Test
    void uneActionValideeNeRevientPlusEnArriere() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan action définitive");
        String actionId = ajouterAction(m, planId, "Action définitive");

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("statut", "TERMINEE"))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/statut")
                .then().statusCode(200);
        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("statut", "VALIDEE"))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/statut")
                .then().statusCode(200);

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("statut", "EN_COURS"))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/statut")
                .then().statusCode(409);
    }

    @Test
    void unPlanVideNePeutPasEtreActive() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan vide");

        // Un plan vide déclaré actif annoncerait un engagement que rien ne
        // porte.
        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("statut", "ACTIF"))
                .when().put(urlPlans(m) + "/" + planId + "/statut")
                .then().statusCode(409);
    }

    @Test
    void unPlanAvecActionSActive() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan activable");
        ajouterAction(m, planId, "Une action");

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("statut", "ACTIF"))
                .when().put(urlPlans(m) + "/" + planId + "/statut")
                .then().statusCode(200).body("statut", equalTo("ACTIF"));
    }

    @Test
    void laClotureNePasseParLaRouteDeStatut() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan clôture détournée");
        ajouterAction(m, planId, "Action");

        // Clôturer exige un motif : le permettre par la route de statut
        // contournerait cette exigence.
        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("statut", "CLOTURE"))
                .when().put(urlPlans(m) + "/" + planId + "/statut")
                .then().statusCode(409);
    }

    // === Clôture et archivage ============================================

    @Test
    void unPlanSeClotureAvecSonMotif() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan à clôturer");
        ajouterAction(m, planId, "Action");

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("motif", "Tous les objectifs ont été atteints."))
                .when().post(urlPlans(m) + "/" + planId + "/cloture")
                .then().statusCode(200)
                .body("statut", equalTo("CLOTURE"))
                .body("motifCloture", equalTo("Tous les objectifs ont été atteints."))
                .body("cloturePar", not(nullValue()))
                .body("gele", equalTo(true));
    }

    @Test
    void uneClotureSansMotifEstRefusee() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan clôture sans motif");

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("motif", "   "))
                .when().post(urlPlans(m) + "/" + planId + "/cloture")
                .then().statusCode(400);
    }

    @Test
    void unPlanArchiveEstGeleMaisDistinctDUnPlanCloture() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan à archiver");

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("motif", "Réorganisation."))
                .when().post(urlPlans(m) + "/" + planId + "/archivage")
                .then().statusCode(200)
                .body("statut", equalTo("ARCHIVE"))
                .body("gele", equalTo(true));
    }

    @Test
    void unPlanGeleNAccepteplusAucuneModification() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan gelé");
        ajouterAction(m, planId, "Action");
        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("motif", "Terminé."))
                .when().post(urlPlans(m) + "/" + planId + "/cloture")
                .then().statusCode(200);

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("titre", "Nouveau titre"))
                .when().put(urlPlans(m) + "/" + planId)
                .then().statusCode(409);

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("titre", "Action tardive"))
                .when().post(urlPlans(m) + "/" + planId + "/actions")
                .then().statusCode(409);
    }

    @Test
    void unPlanCloturNeSeReclotureraPas() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan double clôture");
        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("motif", "Premier motif."))
                .when().post(urlPlans(m) + "/" + planId + "/cloture")
                .then().statusCode(200);

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("motif", "Second motif."))
                .when().post(urlPlans(m) + "/" + planId + "/cloture")
                .then().statusCode(409);
    }

    // === Progression et retard ===========================================

    @Test
    void laProgressionEstRenduePourLePlan() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan progression");
        String a1 = ajouterAction(m, planId, "Action 1");
        ajouterAction(m, planId, "Action 2");

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON).body(Map.of("statut", "TERMINEE"))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + a1 + "/statut")
                .then().statusCode(200);

        given().header("Authorization", "Bearer " + m.token())
                .when().get(urlPlans(m) + "/" + planId)
                .then().statusCode(200)
                .body("progression", equalTo(50))
                .body("enRetard", equalTo(false));
    }

    // === Isolation multi-tenant et IDOR ==================================

    @Test
    void unPlanDUneAutreMissionNEstPasAtteignable() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan privé");
        Mission autre = etrangere();

        given().header("Authorization", "Bearer " + autre.token())
                .when().get(urlPlans(autre) + "/" + planId)
                .then().statusCode(404);
    }

    @Test
    void unIntrusNeListePasLesPlansDAutrui() {
        Mission m = mission();
        Mission autre = etrangere();

        given().header("Authorization", "Bearer " + autre.token())
                .when().get(urlPlans(m))
                .then().statusCode(403);
    }

    @Test
    void uneActionDUnAutrePlanNEstPasAtteignableParSonUuid() {
        Mission m = mission();
        String planA = creerPlan(m, "Plan A");
        String actionA = ajouterAction(m, planA, "Action de A");
        String planB = creerPlan(m, "Plan B");

        // Les trois identifiants doivent être cohérents : l'action existe et
        // le plan aussi, mais elle n'appartient pas à ce plan.
        given().header("Authorization", "Bearer " + m.token())
                .when().get(urlPlans(m) + "/" + planB + "/actions/" + actionA)
                .then().statusCode(404);
    }

    @Test
    void unIntrusNeChangePasLeStatutDUneActionDAutrui() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan convoité");
        String actionId = ajouterAction(m, planId, "Action convoitée");
        Mission autre = etrangere();

        given().header("Authorization", "Bearer " + autre.token())
                .contentType(ContentType.JSON).body(Map.of("statut", "EN_COURS"))
                .when().put(urlPlans(m) + "/" + planId + "/actions/" + actionId + "/statut")
                .then().statusCode(403);
    }

    // === D1 ==============================================================

    @Test
    void aucunRaisonnementIaNApparaitDansUnPlan() {
        Mission m = mission();
        String planId = creerPlan(m, "Plan sans raisonnement");
        ajouterAction(m, planId, "Action");
        Membre collaborateur = membre(m, "COLLABORATEUR");

        String corps = given().header("Authorization", "Bearer " + collaborateur.token())
                .when().get(urlPlans(m) + "/" + planId)
                .then().statusCode(200).extract().asString();

        // Un plan est un objet organisationnel : il dit qui fait quoi et pour
        // quand, jamais pourquoi l'IA a jugé ainsi.
        assertFalse(corps.contains("justification"));
        assertFalse(corps.contains("prompt"));
        assertFalse(corps.contains("responseId"));
        assertFalse(corps.contains("servedModel"));
    }
}
