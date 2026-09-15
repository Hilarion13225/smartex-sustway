package com.smartexsustway.api.resource;

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
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Le responsable d'entreprise valide ses propres évaluations.
 *
 * <p>Jusqu'ici, aucune mission ne pouvait aller à son terme sans qu'un compte
 * Smartex valide chaque critère : le score, les non-conformités et le rapport
 * sont tous en aval de ce geste. Le produit n'était donc pas utilisable en
 * autonomie.
 *
 * <p>Ce qui est éprouvé ici tient en trois points. Le responsable valide —
 * mais seulement chez lui, et seulement une évaluation en revue. Le
 * collaborateur reste dehors. Et une mission close ne bouge plus : y faire
 * entrer une évaluation après coup changerait un score déjà rendu.
 */
@QuarkusTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ValidationResponsableTest {

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

    private Mission construireMission(String raisonSociale) {
        var proprietaire = UtilisateurDeTest.creerEtConnecter(jwtService);

        String entrepriseId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of("raisonSociale", raisonSociale,
                        "identifiantLegal", "RCCM-VALID-" + UUID.randomUUID(),
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
                        "nom", "Mission validation responsable",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201).extract().path("id");

        String critereId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .when().get("/api/v1/entreprises/" + entrepriseId + "/audits/" + auditId + "/criteres")
                .then().statusCode(200).extract().path("[0].id");

        // Le propriétaire est RESPONSABLE_ENTREPRISE : c'est exactement le
        // rôle éprouvé ici.
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

    /** Une évaluation IA en revue, telle que le pipeline V2 en produit. */
    @Transactional
    UUID evaluationEnRevue(UUID auditCritereId, int note) {
        assurerCriticite(auditCritereId);
        AuditCritere ac = auditCritereRepository.findById(auditCritereId);
        Evaluation e = new Evaluation(ac, BigDecimal.valueOf(note)
                .divide(BigDecimal.valueOf(5), 4, java.math.RoundingMode.HALF_UP), (short) note);
        e.setSource(SourceEvaluation.IA);
        e.setStatut(StatutEvaluation.EN_REVUE);
        e.setJustification("Le document ne porte ni date ni signature.");
        e.setPistesAmelioration("Faire signer et dater le document.");
        evaluationRepository.persistAndFlush(e);

        // Le cycle de vie fait passer la mission en EN_COURS dès la première
        // évaluation (CycleVieMissionService) ; la fixture écrit l'évaluation
        // directement et doit donc reproduire cet état, sans quoi elle
        // testerait une situation qui ne se produit pas.
        entityManager.createNativeQuery(
                        "UPDATE audit SET statut = 'EN_COURS' WHERE id = "
                                + "(SELECT audit_id FROM audit_critere WHERE id = ?1)")
                .setParameter(1, auditCritereId).executeUpdate();
        return e.getId();
    }

    @Transactional
    void assurerCriticite(UUID auditCritereId) {
        entityManager.createNativeQuery(
                        "UPDATE audit_critere SET criticite_id = "
                                + "(SELECT id FROM criticite ORDER BY poids DESC LIMIT 1) "
                                + "WHERE id = ?1 AND criticite_id IS NULL")
                .setParameter(1, auditCritereId).executeUpdate();
    }

    @Transactional
    void poserStatutEvaluation(UUID evaluationId, String statut) {
        entityManager.createNativeQuery(
                        "UPDATE evaluation SET statut = CAST(?2 AS statut_evaluation) WHERE id = ?1")
                .setParameter(1, evaluationId).setParameter(2, statut).executeUpdate();
    }

    @Transactional
    void poserStatutMission(UUID auditId, String statut) {
        entityManager.createNativeQuery(
                        "UPDATE audit SET statut = CAST(?2 AS statut_audit) WHERE id = ?1")
                .setParameter(1, auditId).setParameter(2, statut).executeUpdate();
    }

    /**
     * Ramène une mission à une formule donnée. La mission est d'abord créée
     * par le chemin normal : seule la formule change, pas la manière dont la
     * mission est née.
     */
    @Transactional
    void poserFormuleMission(UUID auditId, String codeFormule) {
        entityManager.createNativeQuery(
                        "UPDATE audit SET formule_abonnement_id = "
                                + "(SELECT id FROM formule_abonnement WHERE code = ?2) WHERE id = ?1")
                .setParameter(1, auditId).setParameter(2, codeFormule).executeUpdate();
    }

    @Transactional
    Evaluation relire(UUID evaluationId) {
        entityManager.clear();
        return evaluationRepository.findById(evaluationId);
    }

    @Transactional
    long compter(String sql, Object parametre) {
        return ((Number) entityManager.createNativeQuery(sql)
                .setParameter(1, parametre).getSingleResult()).longValue();
    }

    private String urlValidation(Mission m, UUID evaluationId) {
        return "/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId()
                + "/criteres/" + m.critereId() + "/evaluations/" + evaluationId + "/validation";
    }

    // === Permission ======================================================

    @Test
    void leResponsableValideUneEvaluationDeSonEntreprise() {
        Mission m = construireMission("Entreprise Validation Responsable");
        UUID evalId = evaluationEnRevue(UUID.fromString(m.critereId()), 2);

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .when().post(urlValidation(m, evalId))
                .then().statusCode(200)
                .body("statut", equalTo("VALIDEE"))
                .body("valideePar", not(nullValue()))
                .body("valideeLe", not(nullValue()));
    }

    /**
     * La restriction par formule, éprouvée par l'API et non par le service :
     * c'est le code que l'utilisateur rencontre.
     *
     * <p>La mission est créée par le chemin normal puis sa formule est
     * ramenée à FREE — l'état d'une entreprise rétrogradée, le seul par
     * lequel une mission peut se retrouver en FREE puisque {@code
     * audit:creer} y est déjà retirée.
     *
     * <p>Le refus doit être un 403 de formule et non de rôle : le rôle porte
     * la permission depuis V72, et le même appel réussit en STANDARD
     * ({@link #leResponsableValideUneEvaluationDeSonEntreprise()}).
     */
    @Test
    void enFormuleFree_leResponsableNeValidePlus() {
        Mission m = construireMission("Entreprise Validation Free");
        UUID evalId = evaluationEnRevue(UUID.fromString(m.critereId()), 2);
        poserFormuleMission(UUID.fromString(m.auditId()), "FREE");

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .when().post(urlValidation(m, evalId))
                .then().statusCode(403);

        // Le refus n'a rien écrit : c'est ce qui sépare un refus d'un échec.
        assertEquals(StatutEvaluation.EN_REVUE, relire(evalId).getStatut());
        assertNull(relire(evalId).getValideePar());
    }

    /**
     * Le pendant du précédent : le personnel Smartex n'est jamais bridé par
     * la formule souscrite par un client (ROLES_INTERNES_SMARTEX). Sans ce
     * test, une restriction trop large passerait inaperçue.
     */
    @Test
    void enFormuleFree_leSuperAdminValideToujours() {
        Mission m = construireMission("Entreprise Validation Free Admin");
        UUID evalId = evaluationEnRevue(UUID.fromString(m.critereId()), 2);
        poserFormuleMission(UUID.fromString(m.auditId()), "FREE");
        String jeton = jetonAvecRole(m, "SUPER_ADMIN");

        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .when().post(urlValidation(m, evalId))
                .then().statusCode(200)
                .body("statut", equalTo("VALIDEE"));
    }

    @Test
    void leCollaborateurNeValidePas() {
        Mission m = construireMission("Entreprise Validation Collaborateur");
        UUID evalId = evaluationEnRevue(UUID.fromString(m.critereId()), 2);
        String jeton = jetonAvecRole(m, "COLLABORATEUR");

        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .when().post(urlValidation(m, evalId))
                .then().statusCode(403);
    }

    @Test
    void leSuperAdminConserveSonAcces() {
        Mission m = construireMission("Entreprise Validation Staff");
        UUID evalId = evaluationEnRevue(UUID.fromString(m.critereId()), 2);
        String staff = UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository,
                utilisateurEntrepriseRepository).token;

        given().header("Authorization", "Bearer " + staff)
                .contentType(ContentType.JSON)
                .when().post(urlValidation(m, evalId))
                .then().statusCode(200).body("statut", equalTo("VALIDEE"));
    }

    // === Isolation multi-tenant ==========================================

    @Test
    void unResponsableNeValidePasChezUnAutre() {
        Mission chezNous = construireMission("Entreprise Validation A");
        Mission ailleurs = construireMission("Entreprise Validation B");
        UUID evalId = evaluationEnRevue(UUID.fromString(chezNous.critereId()), 2);

        given().header("Authorization", "Bearer " + ailleurs.token())
                .contentType(ContentType.JSON)
                .when().post(urlValidation(chezNous, evalId))
                .then().statusCode(403);
    }

    @Test
    void lUuidDUneEvaluationDUneAutreMissionNeContournePasLIsolation() {
        Mission a = construireMission("Entreprise Validation UUID A");
        Mission b = construireMission("Entreprise Validation UUID B");
        UUID evalChezA = evaluationEnRevue(UUID.fromString(a.critereId()), 2);

        // Le propriétaire de B, avec son propre chemin, mais l'identifiant
        // d'une évaluation de A : la résolution passe par (critère, mission).
        given().header("Authorization", "Bearer " + b.token())
                .contentType(ContentType.JSON)
                .when().post(urlValidation(b, evalChezA))
                .then().statusCode(404);
    }

    @Test
    void uneEvaluationInexistanteRend404() {
        Mission m = construireMission("Entreprise Validation Inexistante");

        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .when().post(urlValidation(m, UUID.randomUUID()))
                .then().statusCode(404);
    }

    // === Cycle de vie ====================================================

    @Test
    void uneEvaluationDejaValideeEstRefusee() {
        Mission m = construireMission("Entreprise Validation Double");
        UUID evalId = evaluationEnRevue(UUID.fromString(m.critereId()), 2);

        given().header("Authorization", "Bearer " + m.token()).contentType(ContentType.JSON)
                .when().post(urlValidation(m, evalId)).then().statusCode(200);

        given().header("Authorization", "Bearer " + m.token()).contentType(ContentType.JSON)
                .when().post(urlValidation(m, evalId))
                .then().statusCode(409);
    }

    @Test
    void uneEvaluationProvisoireEstRefusee() {
        Mission m = construireMission("Entreprise Validation Provisoire");
        UUID evalId = evaluationEnRevue(UUID.fromString(m.critereId()), 2);
        poserStatutEvaluation(evalId, "PROVISOIRE");

        given().header("Authorization", "Bearer " + m.token()).contentType(ContentType.JSON)
                .when().post(urlValidation(m, evalId))
                .then().statusCode(409);
    }

    @Test
    void uneMissionClotureeNAccepteAucuneValidation() {
        Mission m = construireMission("Entreprise Validation Cloturee");
        UUID evalId = evaluationEnRevue(UUID.fromString(m.critereId()), 2);
        poserStatutMission(UUID.fromString(m.auditId()), "TERMINE");

        // Le score d'une mission close est rendu : y faire entrer une
        // évaluation après coup le changerait.
        given().header("Authorization", "Bearer " + m.token()).contentType(ContentType.JSON)
                .when().post(urlValidation(m, evalId))
                .then().statusCode(409);

        assertEquals(StatutEvaluation.EN_REVUE, relire(evalId).getStatut());
    }

    @Test
    void uneMissionEnBrouillonNAccepteAucuneValidation() {
        Mission m = construireMission("Entreprise Validation Brouillon");
        UUID evalId = evaluationEnRevue(UUID.fromString(m.critereId()), 2);
        poserStatutMission(UUID.fromString(m.auditId()), "BROUILLON");

        given().header("Authorization", "Bearer " + m.token()).contentType(ContentType.JSON)
                .when().post(urlValidation(m, evalId))
                .then().statusCode(409);
    }

    // === Effets métier ===================================================

    @Test
    void laValidationProduitLaNonConformiteEtLInstantaneDeScore() {
        Mission m = construireMission("Entreprise Validation Effets");
        UUID auditId = UUID.fromString(m.auditId());
        UUID evalId = evaluationEnRevue(UUID.fromString(m.critereId()), 2);

        long ncAvant = compter("SELECT count(*) FROM non_conforme n JOIN evaluation e ON e.id=n.evaluation_id "
                + "JOIN audit_critere ac ON ac.id=e.audit_critere_id WHERE ac.audit_id = ?1", auditId);
        long scoresAvant = compter("SELECT count(*) FROM score_historique WHERE audit_id = ?1", auditId);

        given().header("Authorization", "Bearer " + m.token()).contentType(ContentType.JSON)
                .when().post(urlValidation(m, evalId)).then().statusCode(200);

        assertEquals(ncAvant + 1, compter("SELECT count(*) FROM non_conforme n JOIN evaluation e ON e.id=n.evaluation_id "
                + "JOIN audit_critere ac ON ac.id=e.audit_critere_id WHERE ac.audit_id = ?1", auditId));
        assertTrue(compter("SELECT count(*) FROM score_historique WHERE audit_id = ?1", auditId) > scoresAvant);
    }

    @Test
    void laValidationNeDeclencheNiAnalyseNiPlanNiCloture() {
        Mission m = construireMission("Entreprise Validation Sans Effets Bord");
        UUID auditId = UUID.fromString(m.auditId());
        UUID evalId = evaluationEnRevue(UUID.fromString(m.critereId()), 2);

        long analysesAvant = compter("SELECT count(*) FROM analyse_ia WHERE audit_id = ?1", auditId);
        long plansAvant = compter("SELECT count(*) FROM plan_action WHERE audit_id = ?1", auditId);
        long axesAvant = compter("SELECT count(*) FROM axe_amelioration WHERE audit_id = ?1", auditId);

        given().header("Authorization", "Bearer " + m.token()).contentType(ContentType.JSON)
                .when().post(urlValidation(m, evalId)).then().statusCode(200);

        // Valider, c'est accepter un résultat — rien d'autre.
        assertEquals(analysesAvant, compter("SELECT count(*) FROM analyse_ia WHERE audit_id = ?1", auditId));
        assertEquals(plansAvant, compter("SELECT count(*) FROM plan_action WHERE audit_id = ?1", auditId));
        assertEquals(axesAvant, compter("SELECT count(*) FROM axe_amelioration WHERE audit_id = ?1", auditId));

        // La mission reste ouverte : clore relève d'`audit:cloturer`.
        given().header("Authorization", "Bearer " + m.token())
                .when().get("/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId())
                .then().statusCode(200).body("statut", equalTo("EN_COURS"));
    }

    @Test
    void leReferentielNEstPasTouche() {
        Mission m = construireMission("Entreprise Validation Referentiel");
        UUID evalId = evaluationEnRevue(UUID.fromString(m.critereId()), 2);

        long criteres = compterTout("SELECT count(*) FROM critere");
        long exigences = compterTout("SELECT count(*) FROM exigence");

        given().header("Authorization", "Bearer " + m.token()).contentType(ContentType.JSON)
                .when().post(urlValidation(m, evalId)).then().statusCode(200);

        assertEquals(criteres, compterTout("SELECT count(*) FROM critere"));
        assertEquals(exigences, compterTout("SELECT count(*) FROM exigence"));
    }

    @Transactional
    long compterTout(String sql) {
        return ((Number) entityManager.createNativeQuery(sql).getSingleResult()).longValue();
    }

    // === Journal et traçabilité ==========================================

    @Test
    void leValidateurEtLaDateSontPersistes() {
        Mission m = construireMission("Entreprise Validation Tracabilite");
        UUID evalId = evaluationEnRevue(UUID.fromString(m.critereId()), 2);

        given().header("Authorization", "Bearer " + m.token()).contentType(ContentType.JSON)
                .when().post(urlValidation(m, evalId)).then().statusCode(200);

        Evaluation apres = relire(evalId);
        assertNotNull(apres.getValideePar(), "l'identité du validateur est enregistrée");
        assertNotNull(apres.getValideeLe());
        assertEquals(StatutEvaluation.VALIDEE, apres.getStatut());
    }

    @Test
    void lEvenementDAuditNommeCeluiQuiAValide() {
        Mission m = construireMission("Entreprise Validation Journal");
        UUID evalId = evaluationEnRevue(UUID.fromString(m.critereId()), 2);

        given().header("Authorization", "Bearer " + m.token()).contentType(ContentType.JSON)
                .when().post(urlValidation(m, evalId)).then().statusCode(200);

        assertEquals(1, compter(
                "SELECT count(*) FROM audit_log WHERE action = 'EVALUATION_VALIDEE' "
                        + "AND entite_id = ?1 AND utilisateur_id IS NOT NULL", evalId));
    }

    // === D1 ==============================================================

    @Test
    void laValidationNExposeAucuneDonneeTechniqueInterne() {
        Mission m = construireMission("Entreprise Validation D1");
        UUID evalId = evaluationEnRevue(UUID.fromString(m.critereId()), 2);

        String corps = given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .when().post(urlValidation(m, evalId))
                .then().statusCode(200).extract().asString();

        // Le responsable reçoit la justification métier — c'est voulu — mais
        // rien de l'exécution interne des agents.
        assertFalse(corps.contains("responseId"));
        assertFalse(corps.contains("servedModel"));
        assertFalse(corps.contains("prompt"));
        assertFalse(corps.contains("jetons"));
        assertFalse(corps.contains("dureeMs"));
    }

    @Test
    void leCollaborateurNeGagneAucunAcces() {
        Mission m = construireMission("Entreprise Validation D1 Collaborateur");
        UUID evalId = evaluationEnRevue(UUID.fromString(m.critereId()), 2);
        String jeton = jetonAvecRole(m, "COLLABORATEUR");

        given().header("Authorization", "Bearer " + m.token()).contentType(ContentType.JSON)
                .when().post(urlValidation(m, evalId)).then().statusCode(200);

        // Après validation, il lit le résultat — jamais le raisonnement.
        String corps = given().header("Authorization", "Bearer " + jeton)
                .when().get("/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId()
                        + "/criteres/" + m.critereId() + "/evaluations")
                .then().statusCode(200).extract().asString();

        assertFalse(corps.contains("Le document ne porte ni date ni signature"));
        assertTrue(corps.contains("justificationsMasquees"));

        // Et le détail V2 lui reste fermé.
        given().header("Authorization", "Bearer " + jeton)
                .when().get("/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId()
                        + "/criteres/" + m.critereId() + "/evaluations/" + evalId + "/detail")
                .then().statusCode(403);
    }

    @Test
    void leResponsableContinueDeVoirLaJustificationMetier() {
        Mission m = construireMission("Entreprise Validation Justification");
        UUID evalId = evaluationEnRevue(UUID.fromString(m.critereId()), 2);

        // C'est la matière de sa décision : sans elle, il validerait à
        // l'aveugle.
        given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .when().post(urlValidation(m, evalId))
                .then().statusCode(200)
                .body("justification", equalTo("Le document ne porte ni date ni signature."))
                .body("justificationsMasquees", equalTo(false));
    }
}
