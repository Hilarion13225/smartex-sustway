package com.smartexsustway.api.mission;

import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
import com.smartexsustway.api.domain.enums.SourceEvaluation;
import com.smartexsustway.api.domain.enums.StatutEvaluation;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.EvaluationRepository;
import com.smartexsustway.api.domain.repository.RoleRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * La validation humaine d'une évaluation produite par l'IA.
 *
 * <p>Ce que ces tests protègent : le fait qu'une sortie de modèle
 * n'entre pas d'elle-même dans le score officiel. Jusqu'ici l'analyse
 * écrivait {@code VALIDEE} directement (RG16) — les 44 évaluations de la
 * base de développement sont dans cet état, aucune ne portant de
 * validateur.
 *
 * <p>Les tests d'autorisation attaquent l'API avec un jeton réel et l'URL
 * exacte : masquer un bouton côté React ne les ferait pas passer.
 */
@QuarkusTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ValidationEvaluationTest {

    @Inject JwtService jwtService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject EvaluationRepository evaluationRepository;
    @Inject EntityManager entityManager;

    private record Mission(String entrepriseId, String auditId, String critereId, String token) {
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
                        "raisonSociale", "Entreprise Validation Evaluation",
                        "identifiantLegal", "RCCM-VAL-" + UUID.randomUUID(),
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
                        "nom", "Mission de validation",
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

    /**
     * Pose une évaluation V2 en revue, sans passer par le pipeline.
     *
     * <p>Le pipeline consommerait du quota et dépendrait du fournisseur ;
     * ce qui est éprouvé ici est la transition d'état et son contrôle
     * d'accès, pas la qualité d'une analyse.
     */
    @Transactional
    UUID poserEvaluationEnRevue(UUID auditCritereId, StatutEvaluation statut) {
        AuditCritere auditCritere = auditCritereRepository.findById(auditCritereId);
        Evaluation evaluation = new Evaluation(auditCritere, new BigDecimal("0.4000"), (short) 2);
        evaluation.setSource(SourceEvaluation.IA);
        evaluation.setStatut(statut);
        evaluation.setContratVersion("2.0");
        evaluation.setJustification("Évaluation posée pour éprouver la validation.");
        evaluationRepository.persistAndFlush(evaluation);

        // En usage réel, la mission passe à EN_COURS dès la première
        // évaluation (CycleVieMissionService). La fixture écrit l'évaluation
        // directement et laisserait donc la mission en BROUILLON : un état
        // qu'aucun parcours ne produit, et que la garde de
        // ValidationEvaluationService refuse désormais. Reproduire l'état
        // réel est la condition pour que ces tests éprouvent bien la
        // transition d'état et non cette garde.
        entityManager.createNativeQuery(
                        "UPDATE audit SET statut = 'EN_COURS' WHERE id = "
                                + "(SELECT audit_id FROM audit_critere WHERE id = ?1)")
                .setParameter(1, auditCritereId).executeUpdate();
        return evaluation.getId();
    }

    @Transactional
    StatutEvaluation statutDe(UUID evaluationId) {
        return evaluationRepository.findById(evaluationId).getStatut();
    }

    @Transactional
    UUID validateurDe(UUID evaluationId) {
        var validateur = evaluationRepository.findById(evaluationId).getValideePar();
        return validateur == null ? null : validateur.getId();
    }

    // --- Rôles techniques n'isolant qu'une capacité -------------------------

    private static final String ROLE_ANALYSE_SEULE = "TEST_VAL_ANALYSE_SEULE";
    private static final String ROLE_CLOTURE_SEULE = "TEST_VAL_CLOTURE_SEULE";
    private static final String ROLE_VALIDATION_SEULE = "TEST_VAL_VALIDATION_SEULE";

    @Transactional
    void creerRoleAvecPermission(String code, String permission) {
        entityManager.createNativeQuery(
                        "INSERT INTO role (code, nom, description) VALUES (?1, ?2, ?3) "
                                + "ON CONFLICT (code) DO NOTHING")
                .setParameter(1, code).setParameter(2, "Rôle de test — " + permission)
                .setParameter(3, "Créé par ValidationEvaluationTest pour isoler une capacité.")
                .executeUpdate();
        entityManager.createNativeQuery(
                        "INSERT INTO role_permission (role_id, permission_id) "
                                + "SELECT r.id, p.id FROM role r, permission p "
                                + "WHERE r.code = ?1 AND p.code = ?2 "
                                + "AND NOT EXISTS (SELECT 1 FROM role_permission rp "
                                + "                WHERE rp.role_id = r.id AND rp.permission_id = p.id)")
                .setParameter(1, code).setParameter(2, permission)
                .executeUpdate();
    }

    @Transactional
    void rattacher(UUID utilisateurId, UUID entrepriseId, String roleCode) {
        var role = roleRepository.parCode(roleCode).orElseThrow();
        utilisateurEntrepriseRepository.persist(new UtilisateurEntreprise(
                utilisateurRepository.findById(utilisateurId),
                entrepriseRepository.findById(entrepriseId), null, role));
    }

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

    private io.restassured.response.ValidatableResponse valider(String jeton, UUID evaluationId) {
        return valider(jeton, mission().entrepriseId(), mission().auditId(), mission().critereId(), evaluationId);
    }

    private io.restassured.response.ValidatableResponse valider(String jeton, String entrepriseId,
                                                                String auditId, String critereId,
                                                                UUID evaluationId) {
        return given()
                .header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body("{}")
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits/" + auditId
                        + "/criteres/" + critereId + "/evaluations/" + evaluationId + "/validation")
                .then();
    }

    // === Le cycle EN_REVUE -> VALIDEE =====================================

    @Test
    void uneEvaluationEnRevueDevientValideeEtPorteSonValidateur() {
        UUID evaluationId = poserEvaluationEnRevue(
                UUID.fromString(mission().critereId()), StatutEvaluation.EN_REVUE);

        valider(jetonAvecRole("SUPER_ADMIN"), evaluationId).statusCode(200);

        assertEquals(StatutEvaluation.VALIDEE, statutDe(evaluationId));
        // Une validation dont personne ne répondrait n'en serait pas une.
        assertNotNull(validateurDe(evaluationId), "la validation doit porter son auteur");
    }

    @Test
    void uneEvaluationDejaValideeEstRefusee() {
        UUID evaluationId = poserEvaluationEnRevue(
                UUID.fromString(mission().critereId()), StatutEvaluation.EN_REVUE);
        valider(jetonAvecRole("SUPER_ADMIN"), evaluationId).statusCode(200);

        // Revalider ré-instantanerait le score et réactualiserait la
        // non-conformité sans qu'aucune décision nouvelle n'ait été prise.
        valider(jetonAvecRole("SUPER_ADMIN"), evaluationId).statusCode(409);
    }

    @Test
    void uneEvaluationProvisoireNePeutPasEtreValidee() {
        UUID evaluationId = poserEvaluationEnRevue(
                UUID.fromString(mission().critereId()), StatutEvaluation.PROVISOIRE);

        valider(jetonAvecRole("SUPER_ADMIN"), evaluationId).statusCode(409);
        assertEquals(StatutEvaluation.PROVISOIRE, statutDe(evaluationId));
    }

    // === Le contrôle d'accès ==============================================

    /**
     * ADMIN_AUDIT reçoit la permission, mais ne peut être attribué à
     * personne : le rôle est {@code INACTIF} et un déclencheur en base
     * refuse tout rattachement.
     *
     * <p>Ce test fige ce constat plutôt que de le contourner. Il avait une
     * conséquence qui dépassait la technique : la permission n'étant
     * accordée qu'à SUPER_ADMIN et ADMIN_AUDIT, seul SUPER_ADMIN pouvait
     * effectivement valider une évaluation. La note concluait qu'il
     * faudrait, si le produit voulait autre chose, réactiver ADMIN_AUDIT ou
     * accorder la permission à un rôle actif — décision métier, pas
     * correction technique.
     *
     * <p>C'est la seconde branche qui a été retenue : V72 accorde
     * {@code evaluation:valider} à RESPONSABLE_ENTREPRISE. ADMIN_AUDIT reste
     * inactif, et ce test continue de le vérifier.
     */
    @Test
    void adminAuditPorteLaPermissionMaisNePeutPlusEtreAttribue() {
        var candidat = UtilisateurDeTest.creerEtConnecter(jwtService);

        boolean refuse = false;
        try {
            rattacher(UUID.fromString(candidat.id),
                    UUID.fromString(mission().entrepriseId()), "ADMIN_AUDIT");
        } catch (Exception e) {
            refuse = true;
        }

        assertTrue(refuse, "ADMIN_AUDIT est INACTIF : la base doit refuser le rattachement");
    }

    @Test
    void executerUneAnalyseNeDonnePasLeDroitDeValider() {
        // Le point de toute la séparation : celui qui produit le résultat
        // ne doit pas pouvoir l'entériner, sans quoi la revue humaine
        // n'est qu'une formalité automatique.
        creerRoleAvecPermission(ROLE_ANALYSE_SEULE, "analyse:executer");
        UUID evaluationId = poserEvaluationEnRevue(
                UUID.fromString(mission().critereId()), StatutEvaluation.EN_REVUE);

        valider(jetonAvecRole(ROLE_ANALYSE_SEULE), evaluationId).statusCode(403);
        assertEquals(StatutEvaluation.EN_REVUE, statutDe(evaluationId));
    }

    @Test
    void cloturerUneMissionNeDonnePasLeDroitDeValider() {
        creerRoleAvecPermission(ROLE_CLOTURE_SEULE, "audit:cloturer");
        UUID evaluationId = poserEvaluationEnRevue(
                UUID.fromString(mission().critereId()), StatutEvaluation.EN_REVUE);

        valider(jetonAvecRole(ROLE_CLOTURE_SEULE), evaluationId).statusCode(403);
    }

    /**
     * Ce test portait la règle inverse jusqu'à V72 : le responsable était
     * refusé, au motif qu'on ne peut être à la fois le sujet de l'évaluation
     * et celui qui l'entérine.
     *
     * <p>L'arbitrage a été renversé, et il faut dire pourquoi plutôt que de
     * réécrire l'assertion en silence. La conséquence de l'ancienne règle
     * était qu'aucune mission ne pouvait aller à son terme sans qu'un compte
     * Smartex valide chaque critère : le produit n'était pas utilisable en
     * autonomie. La séparation qui compte est maintenue ailleurs — produire
     * un résultat ({@code analyse:executer}), l'accepter
     * ({@code evaluation:valider}) et clore la mission
     * ({@code audit:cloturer}) restent trois capacités distinctes, et le
     * collaborateur reste exclu de la deuxième.
     */
    @Test
    void leResponsableDeLEntrepriseAuditeeValideDesormais() {
        UUID evaluationId = poserEvaluationEnRevue(
                UUID.fromString(mission().critereId()), StatutEvaluation.EN_REVUE);

        valider(jetonAvecRole("RESPONSABLE_ENTREPRISE"), evaluationId).statusCode(200);
        assertEquals(StatutEvaluation.VALIDEE, statutDe(evaluationId));
        assertNotNull(validateurDe(evaluationId), "la validation doit porter son auteur");
    }

    @Test
    void leCollaborateurNeValidePas() {
        UUID evaluationId = poserEvaluationEnRevue(
                UUID.fromString(mission().critereId()), StatutEvaluation.EN_REVUE);
        valider(jetonAvecRole("COLLABORATEUR"), evaluationId).statusCode(403);
    }

    @Test
    void laPermissionSeuleSuffit() {
        // Aucun rôle du produit n'est dans cette situation : le rôle
        // technique isole la capacité pour prouver que c'est bien elle, et
        // non l'appartenance à un rôle, qui ouvre la porte.
        creerRoleAvecPermission(ROLE_VALIDATION_SEULE, "evaluation:valider");
        UUID evaluationId = poserEvaluationEnRevue(
                UUID.fromString(mission().critereId()), StatutEvaluation.EN_REVUE);

        valider(jetonAvecRole(ROLE_VALIDATION_SEULE), evaluationId).statusCode(200);
    }

    // === Isolation multi-tenant ===========================================

    @Test
    void uneAutreEntrepriseNAtteintPasLEvaluationMemeAvecSonUuid() {
        UUID evaluationId = poserEvaluationEnRevue(
                UUID.fromString(mission().critereId()), StatutEvaluation.EN_REVUE);

        // Un tiers, administrateur de SA propre entreprise, connaissant
        // l'identifiant exact de l'évaluation d'une autre.
        var intrus = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseIntrus = given()
                .header("Authorization", "Bearer " + intrus.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Intruse",
                        "identifiantLegal", "RCCM-INT-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201)
                .extract().path("entreprise.id");

        // L'URL porte l'entreprise de la victime : le contrôle d'accès doit
        // refuser avant même de regarder l'évaluation.
        given()
                .header("Authorization", "Bearer " + intrus.token)
                .contentType(ContentType.JSON)
                .body("{}")
                .when().post("/api/v1/entreprises/" + mission().entrepriseId()
                        + "/audits/" + mission().auditId()
                        + "/criteres/" + mission().critereId()
                        + "/evaluations/" + evaluationId + "/validation")
                .then().statusCode(403);

        // Et par sa propre entreprise, l'évaluation n'existe pas.
        given()
                .header("Authorization", "Bearer " + intrus.token)
                .contentType(ContentType.JSON)
                .body("{}")
                .when().post("/api/v1/entreprises/" + entrepriseIntrus
                        + "/audits/" + mission().auditId()
                        + "/criteres/" + mission().critereId()
                        + "/evaluations/" + evaluationId + "/validation")
                .then().statusCode(404);

        assertEquals(StatutEvaluation.EN_REVUE, statutDe(evaluationId));
        assertNull(validateurDe(evaluationId));
    }

    @Test
    void uneEvaluationDUnAutreCritereNEstPasAtteignableParCeChemin() {
        UUID evaluationId = poserEvaluationEnRevue(
                UUID.fromString(mission().critereId()), StatutEvaluation.EN_REVUE);

        String autreCritereId = given()
                .header("Authorization", "Bearer " + mission().token())
                .when().get("/api/v1/entreprises/" + mission().entrepriseId()
                        + "/audits/" + mission().auditId() + "/criteres")
                .then().statusCode(200)
                .extract().path("[1].id");

        valider(jetonAvecRole("SUPER_ADMIN"), mission().entrepriseId(), mission().auditId(),
                autreCritereId, evaluationId)
                .statusCode(404);
    }
}
