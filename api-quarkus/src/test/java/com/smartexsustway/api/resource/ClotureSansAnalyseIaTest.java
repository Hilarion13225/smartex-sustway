package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.RoleRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.ia.EvaluerCritereRequestDto;
import com.smartexsustway.api.ia.EvaluerCritereResponseDto;
import com.smartexsustway.api.ia.IaEvaluationClient;
import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import io.restassured.http.ContentType;
import io.restassured.response.ValidatableResponse;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Clôturer et analyser sont deux capacités indépendantes.
 *
 * Jusqu'ici la clôture lançait elle-même la passe d'analyse : les permissions
 * étaient séparées, mais quiconque détenait `audit:cloturer` provoquait
 * indirectement des appels au modèle sans détenir `analyse:executer`. Ces
 * tests éprouvent la séparation là où elle compte — non pas sur le code de
 * retour, mais sur le client du service d'agents lui-même, remplacé par un
 * double dont on vérifie qu'il n'est jamais sollicité par une clôture.
 *
 * Un 403 ne prouverait rien ici : c'est `verify(..., never())` qui prouve
 * qu'aucun appel n'est parti.
 */
@QuarkusTest
@TestProfile(ClotureSansAnalyseIaTest.SansTemporisation.class)
class ClotureSansAnalyseIaTest {

    /**
     * La temporisation entre analyses protège le quota du fournisseur du
     * modèle. Les tests ne l'appellent jamais — le client est un double — donc
     * attendre plusieurs secondes par critère n'achèterait rien.
     */
    public static class SansTemporisation implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of(
                    "smartex.analyse.delai-entre-analyses-ms", "0",
                    "smartex.analyse.delai-seconde-tentative-ms", "0");
        }
    }

    @Inject JwtService jwtService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject EntityManager entityManager;

    @InjectMock
    @RestClient
    IaEvaluationClient iaEvaluationClient;

    /** Rôle technique ne portant que la clôture — aucun rôle du produit n'est dans ce cas. */
    private static final String ROLE_CLOTURE_SEULE = "TEST_CLOTURE_SEULE";

    private record Mission(String entrepriseId, String auditId, String critereId,
                           String questionId, String tokenProprietaire) {
    }

    // --- Construction d'une mission ------------------------------------------

    /** Mission neuve : aucun critère renseigné, donc rien en attente d'analyse. */
    private Mission missionVierge(String libelle) {
        var proprietaire = UtilisateurDeTest.creerEtConnecter(jwtService);

        String entrepriseId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise " + libelle,
                        "identifiantLegal", "RCCM-CSA-" + UUID.randomUUID(),
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
                        "nom", "Mission " + libelle,
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201)
                .extract().path("id");

        String critereId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .when().get("/api/v1/entreprises/" + entrepriseId + "/audits/" + auditId + "/criteres")
                .then().statusCode(200)
                .extract().path("[0].id");

        String questionId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .when().get("/api/v1/entreprises/" + entrepriseId + "/audits/" + auditId
                        + "/criteres/" + critereId + "/questions")
                .then().statusCode(200)
                .extract().path("questions[0].auditQuestionId");

        return new Mission(entrepriseId, auditId, critereId, questionId, proprietaire.token);
    }

    /** Pose une déclaration sur le premier critère : il passe en DECLARE, en attente d'analyse. */
    private void declarer(Mission m) {
        given()
                .header("Authorization", "Bearer " + m.tokenProprietaire())
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "scenario", "Politique formalisée et diffusée en 2025.",
                        "reponses", List.of(Map.of("auditQuestionId", m.questionId(), "niveau", 4))))
                .when().put("/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId()
                        + "/criteres/" + m.critereId() + "/questions")
                .then().statusCode(200);
    }

    // --- Appels ---------------------------------------------------------------

    private ValidatableResponse cloturer(String jeton, Mission m) {
        return given()
                .header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body("{}")
                .when().post("/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId() + "/cloture")
                .then();
    }

    private ValidatableResponse lancerAnalyse(String jeton, Mission m) {
        return given()
                .header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body("{}")
                .when().post("/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId() + "/analyse")
                .then();
    }

    /** Attend la fin de la passe lancée en arrière-plan, ou échoue au bout du délai. */
    private void attendreFinDAnalyse(String jeton, Mission m) {
        Instant limite = Instant.now().plus(Duration.ofSeconds(90));
        while (Instant.now().isBefore(limite)) {
            Boolean terminee = given()
                    .header("Authorization", "Bearer " + jeton)
                    .when().get("/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId() + "/analyse")
                    .then().statusCode(200)
                    .extract().path("terminee");
            if (Boolean.TRUE.equals(terminee)) {
                return;
            }
            try {
                Thread.sleep(500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
        throw new AssertionError("La passe d'analyse ne s'est pas terminée dans le délai imparti.");
    }

    // --- Identités ------------------------------------------------------------

    /** Rattache un utilisateur neuf à l'entreprise de la mission, avec le rôle demandé. */
    private String jetonAvecRole(Mission m, String roleCode) {
        var candidat = UtilisateurDeTest.creerEtConnecter(jwtService);
        rattacher(UUID.fromString(candidat.id), UUID.fromString(m.entrepriseId()), roleCode);
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
        utilisateurEntrepriseRepository.persist(new UtilisateurEntreprise(
                utilisateurRepository.findById(utilisateurId),
                entrepriseRepository.findById(entrepriseId),
                null, role));
    }

    @Transactional
    void creerRoleCloturerSeul() {
        entityManager.createNativeQuery(
                        "INSERT INTO role (code, nom, description) VALUES (?1, ?2, ?3) "
                                + "ON CONFLICT (code) DO NOTHING")
                .setParameter(1, ROLE_CLOTURE_SEULE)
                .setParameter(2, "Rôle de test — clôture seule")
                .setParameter(3, "Créé par les tests pour isoler la capacité de clôture.")
                .executeUpdate();
        entityManager.createNativeQuery(
                        "INSERT INTO role_permission (role_id, permission_id) "
                                + "SELECT r.id, p.id FROM role r, permission p "
                                + "WHERE r.code = ?1 AND p.code = ?2 "
                                + "AND NOT EXISTS (SELECT 1 FROM role_permission rp "
                                + "                WHERE rp.role_id = r.id AND rp.permission_id = p.id)")
                .setParameter(1, ROLE_CLOTURE_SEULE).setParameter(2, "audit:cloturer")
                .executeUpdate();
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

    // === A ====================================================================

    /** Un collaborateur ne clôture pas, et sa tentative ne fait rien travailler. */
    @Test
    void a_collaborateur_cloture_refusee_et_aucunAppelIa() {
        Mission m = missionVierge("Cloture A");

        cloturer(jetonAvecRole(m, "COLLABORATEUR"), m).statusCode(403);

        verify(iaEvaluationClient, never()).evaluerCritere(any());
    }

    // === B ====================================================================

    /**
     * Le responsable d'entreprise clôture sa propre mission — conditions
     * satisfaites, plus rien en attente d'analyse — et le modèle n'est pas
     * appelé pour autant. C'est le cœur de la correction.
     */
    @Test
    void b_responsableEntreprise_clotureSaMission_sansAucunAppelIa() {
        Mission m = missionVierge("Cloture B");

        cloturer(m.tokenProprietaire(), m).statusCode(200).body("statut", org.hamcrest.Matchers.equalTo("TERMINE"));

        verify(iaEvaluationClient, never()).evaluerCritere(any());
    }

    // === C ====================================================================

    /** La mission d'une autre organisation reste hors d'atteinte, sans appel IA. */
    @Test
    void c_responsableEntreprise_neCloturePasLaMissionDUneAutre() {
        Mission m = missionVierge("Cloture C");

        var etranger = UtilisateurDeTest.creerEtConnecter(jwtService);
        given()
                .header("Authorization", "Bearer " + etranger.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Cloture C voisine",
                        "identifiantLegal", "RCCM-CSA-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201);

        cloturer(etranger.token, m).statusCode(403);

        verify(iaEvaluationClient, never()).evaluerCritere(any());
    }

    // === D ====================================================================

    /** Un SUPER_ADMIN clôture selon les règles globales, sans appel IA non plus. */
    @Test
    void d_superAdmin_cloture_sansAucunAppelIa() {
        Mission m = missionVierge("Cloture D");

        cloturer(jetonAvecRole(m, "SUPER_ADMIN"), m).statusCode(200);

        verify(iaEvaluationClient, never()).evaluerCritere(any());
    }

    // === E ====================================================================

    /**
     * Le chemin d'analyse, lui, atteint bien le service : lancé explicitement
     * avec `analyse:executer`, sur une mission portant une déclaration.
     */
    @Test
    void e_responsableEntreprise_lanceLAnalyse_etLeServiceIaEstAppele() {
        Mission m = missionVierge("Analyse E");
        declarer(m);
        when(iaEvaluationClient.evaluerCritere(any()))
                .thenReturn(reponseSimulee(UUID.fromString(m.critereId())));

        lancerAnalyse(m.tokenProprietaire(), m).statusCode(202);
        attendreFinDAnalyse(m.tokenProprietaire(), m);

        var capture = ArgumentCaptor.forClass(EvaluerCritereRequestDto.class);
        verify(iaEvaluationClient, atLeastOnce()).evaluerCritere(capture.capture());
        assertTrue(capture.getAllValues().stream()
                        .anyMatch(r -> UUID.fromString(m.critereId()).equals(r.auditCritereId())),
                "La passe doit avoir soumis au service le critère renseigné.");
    }

    // === F ====================================================================

    /** Un collaborateur ne lance pas d'analyse, et rien ne part vers le service. */
    @Test
    void f_collaborateur_neLancePasDAnalyse_etAucunAppelIa() {
        Mission m = missionVierge("Analyse F");
        declarer(m);

        lancerAnalyse(jetonAvecRole(m, "COLLABORATEUR"), m).statusCode(403);

        verify(iaEvaluationClient, never()).evaluerCritere(any());
    }

    // === G ====================================================================

    /**
     * Le test décisif : une identité ne portant QUE `audit:cloturer`.
     *
     * Elle clôture — donc la clôture n'exige rien d'autre — et le service
     * d'agents n'est jamais sollicité — donc elle n'obtient pas par la bande
     * la capacité que `analyse:executer` gouverne. Avant cette correction, ce
     * même appel déclenchait une passe complète d'analyse.
     */
    @Test
    void g_cloturerSeule_cloture_maisNeDeclencheJamaisLIa() {
        Mission m = missionVierge("Cloture G");
        creerRoleCloturerSeul();

        String jeton = jetonAvecRole(m, ROLE_CLOTURE_SEULE);

        cloturer(jeton, m).statusCode(200);
        // La même identité se voit refuser le lancement explicite : la
        // capacité d'analyse ne lui a donc pas été concédée en douce.
        lancerAnalyse(jeton, m).statusCode(403);

        verify(iaEvaluationClient, never()).evaluerCritere(any());
    }

    // === Règle métier de clôture =============================================

    /**
     * Une mission dont un critère reste renseigné mais non analysé n'est pas
     * clôturable : la clôture ne lance plus l'analyse, elle constate qu'elle a
     * eu lieu. Sans cette règle, le découplage laisserait figer un score qui
     * ignore une partie du travail de l'organisation.
     */
    @Test
    void missionEnAttenteDAnalyse_nEstPasCloturable() {
        Mission m = missionVierge("Cloture en attente");
        declarer(m);

        cloturer(m.tokenProprietaire(), m).statusCode(409);

        given()
                .header("Authorization", "Bearer " + m.tokenProprietaire())
                .when().get("/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId() + "/cloture")
                .then().statusCode(200)
                .body("cloturable", org.hamcrest.Matchers.equalTo(false))
                .body("criteresEnAttenteDAnalyse", org.hamcrest.Matchers.equalTo(1));

        verify(iaEvaluationClient, never()).evaluerCritere(any());
    }

    /**
     * Et une fois l'analyse faite, la même mission devient clôturable : la
     * règle débloque bien, elle ne fait pas qu'interdire.
     */
    @Test
    void missionAnalysee_devientCloturable() {
        Mission m = missionVierge("Cloture apres analyse");
        declarer(m);
        when(iaEvaluationClient.evaluerCritere(any()))
                .thenReturn(reponseSimulee(UUID.fromString(m.critereId())));

        lancerAnalyse(m.tokenProprietaire(), m).statusCode(202);
        attendreFinDAnalyse(m.tokenProprietaire(), m);

        String statut = cloturer(m.tokenProprietaire(), m)
                .statusCode(200)
                .extract().path("statut");
        assertEquals("TERMINE", statut, "La mission analysée doit pouvoir être clôturée.");
    }
}
