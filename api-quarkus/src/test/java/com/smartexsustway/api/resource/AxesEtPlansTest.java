package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AxeAmelioration;
import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.AxeAmeliorationRepository;
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
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Les axes d'amélioration et les plans d'action, par l'API.
 *
 * <p>Ce qui est protégé ici : le fait qu'une proposition de l'IA ne devienne
 * pas un engagement par simple écoulement du temps. Un axe naît
 * {@code PROPOSE} ; il faut un geste humain pour qu'il soit retenu, un autre
 * pour qu'il soit planifié, et un axe écarté reste consultable avec son
 * motif.
 *
 * <p>Les contrôles d'accès sont éprouvés par des appels réels avec jeton et
 * URL exacte — masquer un bouton côté React ne les ferait pas passer.
 */
@QuarkusTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class AxesEtPlansTest {

    @Inject JwtService jwtService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject AuditRepository auditRepository;
    @Inject AxeAmeliorationRepository axeRepository;

    private record Mission(String entrepriseId, String auditId, String critereId, String token) {
    }

    private Mission mission;
    private Mission intruse;

    private Mission mission() {
        if (mission == null) {
            mission = construireMission("Entreprise Axes et Plans");
        }
        return mission;
    }

    /** Une seconde entreprise, sans aucun lien avec la première. */
    private Mission intruse() {
        if (intruse == null) {
            intruse = construireMission("Entreprise Intruse Axes");
        }
        return intruse;
    }

    private Mission construireMission(String raisonSociale) {
        var proprietaire = UtilisateurDeTest.creerEtConnecter(jwtService);

        String entrepriseId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of("raisonSociale", raisonSociale,
                        "identifiantLegal", "RCCM-AXE-" + UUID.randomUUID(),
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
                        "nom", "Mission axes et plans",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201).extract().path("id");

        String critereId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .when().get("/api/v1/entreprises/" + entrepriseId + "/audits/" + auditId + "/criteres")
                .then().statusCode(200).extract().path("[0].id");

        return new Mission(entrepriseId, auditId, critereId, proprietaire.token);
    }

    private String jetonAvecRole(Mission m, String roleCode) {
        var candidat = UtilisateurDeTest.creerEtConnecter(jwtService);
        rattacher(UUID.fromString(candidat.id), UUID.fromString(m.entrepriseId()), roleCode);
        return given().contentType(ContentType.JSON)
                .body(Map.of("email", candidat.email, "motDePasse", candidat.motDePasse))
                .when().post("/api/v1/auth/connexion")
                .then().statusCode(200).extract().path("token");
    }

    @Transactional
    void rattacher(UUID utilisateurId, UUID entrepriseId, String roleCode) {
        var role = roleRepository.parCode(roleCode).orElseThrow();
        utilisateurEntrepriseRepository.persist(new UtilisateurEntreprise(
                utilisateurRepository.findById(utilisateurId),
                entrepriseRepository.findById(entrepriseId), null, role));
    }

    /** Un axe d'origine IA, tel que le pipeline en produit. */
    @Transactional
    UUID poserAxeIa(UUID auditId, String libelle) {
        Audit audit = auditRepository.findById(auditId);
        AxeAmelioration axe = AxeAmelioration.proposeParIa(audit, null, null, libelle);
        axeRepository.persistAndFlush(axe);
        return axe.getId();
    }

    private String urlAxes(Mission m) {
        return "/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId() + "/axes-amelioration";
    }

    private String urlPlans(Mission m) {
        return "/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId() + "/plans-action";
    }

    // === Axes : cycle de vie ==============================================

    @Test
    void unAxeProduitParLIaNaitPropose() {
        UUID axeId = poserAxeIa(UUID.fromString(mission().auditId()), "Formaliser le code de conduite.");

        given().header("Authorization", "Bearer " + mission().token())
                .when().get(urlAxes(mission()) + "/" + axeId)
                .then().statusCode(200)
                .body("statut", org.hamcrest.Matchers.equalTo("PROPOSE"))
                .body("origine", org.hamcrest.Matchers.equalTo("IA"))
                .body("origineInitiale", org.hamcrest.Matchers.equalTo("IA"));
    }

    @Test
    void unAxeIaPeutEtreValideParUnGesteHumain() {
        UUID axeId = poserAxeIa(UUID.fromString(mission().auditId()), "Diffuser la politique RSE.");

        given().header("Authorization", "Bearer " + jetonAvecRole(mission(), "RESPONSABLE_ENTREPRISE"))
                .contentType(ContentType.JSON).body("{}")
                .when().post(urlAxes(mission()) + "/" + axeId + "/validation")
                .then().statusCode(200)
                .body("statut", org.hamcrest.Matchers.equalTo("VALIDE"))
                .body("valideePar", org.hamcrest.Matchers.notNullValue());
    }

    @Test
    void unAxeRejeteResteConsultableAvecSonMotif() {
        UUID axeId = poserAxeIa(UUID.fromString(mission().auditId()), "Suggestion hors périmètre.");

        given().header("Authorization", "Bearer " + jetonAvecRole(mission(), "RESPONSABLE_ENTREPRISE"))
                .contentType(ContentType.JSON)
                .body(Map.of("motif", "Déjà couvert par une démarche en cours."))
                .when().post(urlAxes(mission()) + "/" + axeId + "/rejet")
                .then().statusCode(200)
                .body("statut", org.hamcrest.Matchers.equalTo("REJETE"));

        // Effacer une recommandation écartée rendrait la relecture
        // invérifiable après coup.
        given().header("Authorization", "Bearer " + mission().token())
                .when().get(urlAxes(mission()) + "/" + axeId)
                .then().statusCode(200)
                .body("motifRejet", org.hamcrest.Matchers.equalTo("Déjà couvert par une démarche en cours."));
    }

    @Test
    void unRejetSansMotifEstRefuse() {
        UUID axeId = poserAxeIa(UUID.fromString(mission().auditId()), "Axe sans motif.");

        given().header("Authorization", "Bearer " + jetonAvecRole(mission(), "RESPONSABLE_ENTREPRISE"))
                .contentType(ContentType.JSON).body(Map.of("motif", "  "))
                .when().post(urlAxes(mission()) + "/" + axeId + "/rejet")
                .then().statusCode(400);
    }

    @Test
    void unAxeDejaValideNEstPasRevalide() {
        UUID axeId = poserAxeIa(UUID.fromString(mission().auditId()), "Axe à valider une fois.");
        String jeton = jetonAvecRole(mission(), "RESPONSABLE_ENTREPRISE");

        given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON).body("{}")
                .when().post(urlAxes(mission()) + "/" + axeId + "/validation").then().statusCode(200);
        given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON).body("{}")
                .when().post(urlAxes(mission()) + "/" + axeId + "/validation").then().statusCode(409);
    }

    @Test
    void unAxeCreeAlaMainEstToujoursDOrigineHumaine() {
        // L'origine n'est pas un paramètre : la laisser déclarer permettrait
        // de fabriquer une fausse provenance IA.
        given().header("Authorization", "Bearer " + jetonAvecRole(mission(), "RESPONSABLE_ENTREPRISE"))
                .contentType(ContentType.JSON)
                .body(Map.of("libelle", "Axe saisi par l'auditeur."))
                .when().post(urlAxes(mission()))
                .then().statusCode(201)
                .body("origine", org.hamcrest.Matchers.equalTo("HUMAIN"))
                .body("origineInitiale", org.hamcrest.Matchers.equalTo("HUMAIN"))
                .body("statut", org.hamcrest.Matchers.equalTo("PROPOSE"));
    }

    @Test
    void leCollaborateurNeValidePasUnAxe() {
        UUID axeId = poserAxeIa(UUID.fromString(mission().auditId()), "Axe protégé.");

        given().header("Authorization", "Bearer " + jetonAvecRole(mission(), "COLLABORATEUR"))
                .contentType(ContentType.JSON).body("{}")
                .when().post(urlAxes(mission()) + "/" + axeId + "/validation")
                .then().statusCode(403);
    }

    // === Plans et actions multi-axes ======================================

    @Test
    void uneActionPeutRepondreAPlusieursAxes() {
        String jeton = jetonAvecRole(mission(), "RESPONSABLE_ENTREPRISE");
        List<UUID> axes = List.of(
                poserAxeIa(UUID.fromString(mission().auditId()), "Formaliser la politique."),
                poserAxeIa(UUID.fromString(mission().auditId()), "Diffuser la politique."),
                poserAxeIa(UUID.fromString(mission().auditId()), "Former les encadrants."));
        axes.forEach(axeId -> given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON).body("{}")
                .when().post(urlAxes(mission()) + "/" + axeId + "/validation")
                .then().statusCode(200));

        String planId = given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "Plan RSE 2026"))
                .when().post(urlPlans(mission()))
                .then().statusCode(201).extract().path("id");

        // Une seule action, trois axes : c'est exactement ce qu'un
        // `axe_id` unique sur l'action aurait interdit.
        List<String> rattaches = given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "Formaliser et diffuser la politique RSE",
                        "axeIds", axes.stream().map(UUID::toString).toList()))
                .when().post(urlPlans(mission()) + "/" + planId + "/actions")
                .then().statusCode(201)
                .extract().path("axeIds");

        assertEquals(3, rattaches.size());
    }

    @Test
    void unAxeNonValideNePeutPasEtrePlanifie() {
        String jeton = jetonAvecRole(mission(), "RESPONSABLE_ENTREPRISE");
        UUID axeId = poserAxeIa(UUID.fromString(mission().auditId()), "Axe encore proposé.");

        String planId = given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON).body(Map.of("titre", "Plan prématuré"))
                .when().post(urlPlans(mission())).then().statusCode(201).extract().path("id");

        // Planifier une proposition non acceptée engagerait du travail sur
        // une décision que personne n'a prise.
        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "Action prématurée", "axeIds", List.of(axeId.toString())))
                .when().post(urlPlans(mission()) + "/" + planId + "/actions")
                .then().statusCode(409);
    }

    @Test
    void unPlanSuitSonCycleDeVie() {
        String jeton = jetonAvecRole(mission(), "RESPONSABLE_ENTREPRISE");
        String planId = given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON).body(Map.of("titre", "Plan à activer"))
                .when().post(urlPlans(mission())).then().statusCode(201)
                .body("statut", org.hamcrest.Matchers.equalTo("BROUILLON"))
                .extract().path("id");

        // Un plan vide ne s'active pas : il annoncerait un engagement que rien
        // ne porte. Cette règle est venue avec le socle des plans (D24) ; ce
        // test activait auparavant un plan sans aucune action.
        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON).body(Map.of("statut", "ACTIF"))
                .when().put(urlPlans(mission()) + "/" + planId + "/statut")
                .then().statusCode(409);

        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON).body(Map.of("titre", "Première action"))
                .when().post(urlPlans(mission()) + "/" + planId + "/actions")
                .then().statusCode(201);

        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON).body(Map.of("statut", "ACTIF"))
                .when().put(urlPlans(mission()) + "/" + planId + "/statut")
                .then().statusCode(200).body("statut", org.hamcrest.Matchers.equalTo("ACTIF"));
    }

    @Test
    void leCollaborateurNeCreePasDePlan() {
        given().header("Authorization", "Bearer " + jetonAvecRole(mission(), "COLLABORATEUR"))
                .contentType(ContentType.JSON).body(Map.of("titre", "Plan interdit"))
                .when().post(urlPlans(mission()))
                .then().statusCode(403);
    }

    // === Isolation multi-tenant / IDOR ====================================

    @Test
    void unAxeDUneAutreMissionNEstPasLisibleAvecSonUuid() {
        UUID axeVictime = poserAxeIa(UUID.fromString(mission().auditId()), "Axe confidentiel.");

        // L'intrus est administrateur chez lui, et connaît l'UUID exact.
        String jetonIntrus = intruse().token();

        // Par l'URL de la victime : refusé avant même de regarder l'axe.
        given().header("Authorization", "Bearer " + jetonIntrus)
                .when().get(urlAxes(mission()) + "/" + axeVictime)
                .then().statusCode(403);

        // Par sa propre URL : l'axe n'existe pas de son côté.
        given().header("Authorization", "Bearer " + jetonIntrus)
                .when().get(urlAxes(intruse()) + "/" + axeVictime)
                .then().statusCode(404);
    }

    @Test
    void unIntrusNeValidePasNiNeRejetteUnAxeDAutrui() {
        UUID axeVictime = poserAxeIa(UUID.fromString(mission().auditId()), "Axe à protéger.");
        String jetonIntrus = intruse().token();

        given().header("Authorization", "Bearer " + jetonIntrus)
                .contentType(ContentType.JSON).body("{}")
                .when().post(urlAxes(intruse()) + "/" + axeVictime + "/validation")
                .then().statusCode(404);

        given().header("Authorization", "Bearer " + jetonIntrus)
                .contentType(ContentType.JSON).body(Map.of("motif", "Tentative."))
                .when().post(urlAxes(intruse()) + "/" + axeVictime + "/rejet")
                .then().statusCode(404);

        // L'axe n'a pas bougé.
        given().header("Authorization", "Bearer " + mission().token())
                .when().get(urlAxes(mission()) + "/" + axeVictime)
                .then().statusCode(200).body("statut", org.hamcrest.Matchers.equalTo("PROPOSE"));
    }

    @Test
    void unPlanDUneAutreMissionNEstPasAtteignable() {
        String planVictime = given()
                .header("Authorization", "Bearer " + jetonAvecRole(mission(), "RESPONSABLE_ENTREPRISE"))
                .contentType(ContentType.JSON).body(Map.of("titre", "Plan privé"))
                .when().post(urlPlans(mission())).then().statusCode(201).extract().path("id");

        String jetonIntrus = intruse().token();

        given().header("Authorization", "Bearer " + jetonIntrus)
                .when().get(urlPlans(intruse()) + "/" + planVictime)
                .then().statusCode(404);

        given().header("Authorization", "Bearer " + jetonIntrus)
                .contentType(ContentType.JSON).body(Map.of("titre", "Détournement"))
                .when().put(urlPlans(intruse()) + "/" + planVictime)
                .then().statusCode(404);

        given().header("Authorization", "Bearer " + jetonIntrus)
                .contentType(ContentType.JSON).body(Map.of("titre", "Action pirate"))
                .when().post(urlPlans(intruse()) + "/" + planVictime + "/actions")
                .then().statusCode(404);
    }

    @Test
    void uneActionNePeutPasRattacherLAxeDUneAutreMission() {
        UUID axeVictime = poserAxeIa(UUID.fromString(mission().auditId()), "Axe d'autrui.");
        String jetonIntrus = jetonAvecRole(intruse(), "RESPONSABLE_ENTREPRISE");

        String planIntrus = given().header("Authorization", "Bearer " + jetonIntrus)
                .contentType(ContentType.JSON).body(Map.of("titre", "Plan de l'intrus"))
                .when().post(urlPlans(intruse())).then().statusCode(201).extract().path("id");

        // L'axe est résolu par (id, audit) : un identifiant valide venu
        // d'ailleurs ne suffit pas.
        given().header("Authorization", "Bearer " + jetonIntrus)
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "Action détournée", "axeIds", List.of(axeVictime.toString())))
                .when().post(urlPlans(intruse()) + "/" + planIntrus + "/actions")
                .then().statusCode(404);
    }

    @Test
    void laListeDesAxesNeMontreQueCeuxDeLaMission() {
        poserAxeIa(UUID.fromString(mission().auditId()), "Axe de la mission A.");
        poserAxeIa(UUID.fromString(intruse().auditId()), "Axe de la mission B.");

        List<String> libelles = given().header("Authorization", "Bearer " + intruse().token())
                .when().get(urlAxes(intruse()))
                .then().statusCode(200).extract().path("libelle");

        assertTrue(libelles.stream().noneMatch(l -> l.contains("mission A")),
                "la liste ne doit contenir que les axes de la mission demandée");
    }
}
