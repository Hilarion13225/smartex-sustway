package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.AxeAmelioration;
import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
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
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Les axes vus de l'extérieur : ce que l'API rend, et à qui.
 *
 * <p>Trois choses sont éprouvées par des appels réels, avec jeton réel sur
 * l'URL exacte — masquer un bouton côté React ne les ferait pas passer :
 * l'isolation entre entreprises, le refus des combinaisons incohérentes
 * (l'axe d'une mission demandé sur une autre), et l'absence de raisonnement IA
 * dans le corps de la réponse (D1).
 */
@QuarkusTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class AxesApiSecuriteTest {

    private static final String RAISONNEMENT_TEMOIN = "RAISONNEMENT-IA-AXE-TEMOIN";

    @Inject JwtService jwtService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject AuditRepository auditRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject AxeAmeliorationRepository axeRepository;

    private record Mission(String entrepriseId, String auditId, String critereId, String token) {
    }

    private Mission mission;
    private Mission etrangere;

    private Mission mission() {
        if (mission == null) {
            mission = construireMission("Entreprise Axes API");
        }
        return mission;
    }

    private Mission etrangere() {
        if (etrangere == null) {
            etrangere = construireMission("Entreprise Axes Etrangere");
        }
        return etrangere;
    }

    private Mission construireMission(String raisonSociale) {
        var proprietaire = UtilisateurDeTest.creerEtConnecter(jwtService);

        String entrepriseId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of("raisonSociale", raisonSociale,
                        "identifiantLegal", "RCCM-AXAPI-" + UUID.randomUUID(),
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
                        "nom", "Mission axes API",
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

    /** Un axe IA rattaché au critère de la mission. */
    @Transactional
    UUID poserAxe(Mission m, String libelle) {
        Audit audit = auditRepository.findById(UUID.fromString(m.auditId()));
        AuditCritere ac = auditCritereRepository.findById(UUID.fromString(m.critereId()));
        AxeAmelioration axe = AxeAmelioration.proposeParIa(audit, ac, null, libelle);
        axeRepository.persistAndFlush(axe);
        return axe.getId();
    }

    private String urlAxes(Mission m) {
        return "/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId() + "/axes-amelioration";
    }

    // === Restitution =====================================================

    @Test
    void laListeParCritereNeRendQueLesAxesDeCeCritere() {
        Mission m = mission();
        poserAxe(m, "Axe du critère filtré " + UUID.randomUUID());

        List<String> codes = given().header("Authorization", "Bearer " + m.token())
                .queryParam("auditCritereId", m.critereId())
                .when().get(urlAxes(m))
                .then().statusCode(200)
                .extract().jsonPath().getList("auditCritereId", String.class);

        assertTrue(codes.stream().allMatch(m.critereId()::equals),
                "le filtre par critère ne doit rendre que ce critère");
    }

    @Test
    void leCodeDuCritereAccompagneLAxe() {
        Mission m = mission();
        poserAxe(m, "Axe avec code critère " + UUID.randomUUID());

        given().header("Authorization", "Bearer " + m.token())
                .queryParam("auditCritereId", m.critereId())
                .when().get(urlAxes(m))
                .then().statusCode(200)
                .body("[0].critereCode", not(nullValue()));
    }

    @Test
    void unCritereDUneAutreMissionEstRefuseCommeFiltre() {
        Mission m = mission();
        Mission autre = etrangere();

        // Combinaison incohérente : critère de B, mission de A. Le critère est
        // résolu contre la mission, donc l'identifiant seul ne suffit pas.
        given().header("Authorization", "Bearer " + m.token())
                .queryParam("auditCritereId", autre.critereId())
                .when().get(urlAxes(m))
                .then().statusCode(404);
    }

    // === Isolation multi-tenant ==========================================

    @Test
    void unUtilisateurDUneAutreEntrepriseNeListePasLesAxes() {
        Mission m = mission();
        Mission autre = etrangere();

        given().header("Authorization", "Bearer " + autre.token())
                .when().get(urlAxes(m))
                .then().statusCode(403);
    }

    @Test
    void unAxeDUneAutreMissionNEstPasLisibleAvecSonUuid() {
        Mission m = mission();
        UUID axeId = poserAxe(m, "Axe privé " + UUID.randomUUID());
        Mission autre = etrangere();

        given().header("Authorization", "Bearer " + autre.token())
                .when().get(urlAxes(autre) + "/" + axeId)
                .then().statusCode(404);
    }

    @Test
    void unIntrusNeValideNiNeRejetteLAxeDAutrui() {
        Mission m = mission();
        UUID axeId = poserAxe(m, "Axe convoité " + UUID.randomUUID());
        Mission autre = etrangere();

        // Sur sa propre mission avec l'UUID d'autrui : 404.
        given().header("Authorization", "Bearer " + autre.token())
                .contentType(ContentType.JSON)
                .when().post(urlAxes(autre) + "/" + axeId + "/validation")
                .then().statusCode(404);

        // Sur la mission d'autrui : 403 avant même de résoudre l'axe.
        given().header("Authorization", "Bearer " + autre.token())
                .contentType(ContentType.JSON)
                .body(Map.of("motif", "Tentative"))
                .when().post(urlAxes(m) + "/" + axeId + "/rejet")
                .then().statusCode(403);
    }

    // === Décisions par l'API =============================================

    @Test
    void leCycleProposeValideSeJoueParLApi() {
        Mission m = mission();
        UUID axeId = poserAxe(m, "Axe à valider " + UUID.randomUUID());

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .when().post(urlAxes(m) + "/" + axeId + "/validation")
                .then().statusCode(200)
                .body("statut", equalTo("VALIDE"))
                .body("valideePar", not(nullValue()))
                .body("valideeLe", not(nullValue()))
                .body("motifRejet", nullValue());
    }

    @Test
    void unAxeValideNePeutPlusEtreRejeteParLApi() {
        Mission m = mission();
        UUID axeId = poserAxe(m, "Axe décidé " + UUID.randomUUID());

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .when().post(urlAxes(m) + "/" + axeId + "/validation")
                .then().statusCode(200);

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("motif", "Changement d'avis"))
                .when().post(urlAxes(m) + "/" + axeId + "/rejet")
                .then().statusCode(409);
    }

    @Test
    void unRejetSansMotifEstRefuse() {
        Mission m = mission();
        UUID axeId = poserAxe(m, "Axe sans motif " + UUID.randomUUID());

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("motif", "   "))
                .when().post(urlAxes(m) + "/" + axeId + "/rejet")
                .then().statusCode(400);
    }

    @Test
    void leCollaborateurNeDecidePasDUnAxe() {
        Mission m = mission();
        UUID axeId = poserAxe(m, "Axe hors de portée " + UUID.randomUUID());
        String jeton = jetonAvecRole(m, "COLLABORATEUR");

        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .when().post(urlAxes(m) + "/" + axeId + "/validation")
                .then().statusCode(403);
    }

    // === D1 : aucune fuite de raisonnement ===============================

    @Test
    void aucunRaisonnementIaNApparaitDansLaReponse() {
        Mission m = mission();
        poserAxe(m, "Axe sans raisonnement " + UUID.randomUUID());
        String jeton = jetonAvecRole(m, "COLLABORATEUR");

        String corps = given().header("Authorization", "Bearer " + jeton)
                .queryParam("auditCritereId", m.critereId())
                .when().get(urlAxes(m))
                .then().statusCode(200)
                .extract().asString();

        // Le DTO ne porte aucun champ de raisonnement : ni justification, ni
        // trace d'exécution, ni élément de prompt. L'assertion porte sur le
        // corps entier, pas sur un champ que l'on aurait pensé à regarder.
        assertFalse(corps.contains(RAISONNEMENT_TEMOIN));
        assertFalse(corps.contains("justification"));
        assertFalse(corps.contains("prompt"));
        assertFalse(corps.contains("responseId"));
        assertFalse(corps.contains("servedModel"));
        assertFalse(corps.contains("jetons"));
    }

    @Test
    void leCollaborateurConsulteLesAxesQuiLeConcernent() {
        Mission m = mission();
        poserAxe(m, "Axe opérationnel " + UUID.randomUUID());
        String jeton = jetonAvecRole(m, "COLLABORATEUR");

        // D1 ne ferme pas les axes au collaborateur : un axe dit quoi faire,
        // ce qui est opérationnel — c'est la justification qui relève de la
        // relecture, et elle n'est pas ici.
        given().header("Authorization", "Bearer " + jeton)
                .queryParam("auditCritereId", m.critereId())
                .when().get(urlAxes(m))
                .then().statusCode(200)
                .body("size()", not(equalTo(0)));
    }

    // === Historique ======================================================

    @Test
    void lesAxesDejaEnBaseNeSontNiSupprimesNiModifies() {
        Mission m = mission();
        UUID axeId = poserAxe(m, "Axe témoin " + UUID.randomUUID());

        int avant = axesDeLaMission(m).size();
        given().header("Authorization", "Bearer " + m.token())
                .queryParam("statut", "PROPOSE")
                .when().get(urlAxes(m))
                .then().statusCode(200);

        assertEquals(avant, axesDeLaMission(m).size(), "une lecture ne crée ni ne supprime rien");
        assertTrue(axesDeLaMission(m).stream().anyMatch(a -> a.getId().equals(axeId)));
    }

    @Transactional
    List<AxeAmelioration> axesDeLaMission(Mission m) {
        return axeRepository.parAudit(UUID.fromString(m.auditId()));
    }


    @Test
    void leFiltreParStatutEstHonore() {
        Mission m = construireMission("Entreprise Axes Statut");
        UUID aValider = poserAxe(m, "Sera validé " + UUID.randomUUID());
        poserAxe(m, "Restera proposé " + UUID.randomUUID());

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .when().post(urlAxes(m) + "/" + aValider + "/validation")
                .then().statusCode(200);

        given().header("Authorization", "Bearer " + m.token())
                .queryParam("statut", "VALIDE")
                .when().get(urlAxes(m))
                .then().statusCode(200)
                .body("$", hasSize(1))
                .body("[0].statut", equalTo("VALIDE"));
    }
}
