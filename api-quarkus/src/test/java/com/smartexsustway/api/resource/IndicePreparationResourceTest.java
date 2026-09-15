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
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * RG39/RG40/RG41/RG42/RG43 — indice de préparation bailleur (financements
 * verts), réservé à la formule Avancées. Le calcul réel (avec des
 * évaluations validées) dépend du pipeline IA — comme pour
 * EvaluationResourceTest/NonConformeResourceTest, cette classe couvre le
 * routage, les autorisations et le cas "aucun critère tagué" (score neutre),
 * sans dépendre du pipeline IA.
 */
@QuarkusTest
class IndicePreparationResourceTest {

    @Inject JwtService jwtService;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntityManager entityManager;

    private record Contexte(String token, String entrepriseId, String auditId) {}

    private String creerEntreprise(String token, String formuleCode) {
        return given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Indice Test",
                        "identifiantLegal", "RCCM-IDX-" + UUID.randomUUID(),
                        "formuleCode", formuleCode))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201)
                .extract().path("entreprise.id");
    }

    private Contexte creerContexte(String formuleCode) {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = creerEntreprise(utilisateur.token, formuleCode);

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of("fournisseur", "PI_SPI"))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/abonnement/paiements")
                .then().statusCode(201);

        String auditId = given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "referentielCode", "SMARTEX_SUSTWAY",
                        "nom", "Audit Indice Préparation",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201)
                .extract().path("id");

        return new Contexte(utilisateur.token, entrepriseId, auditId);
    }

    // === Décor ==============================================================

    private String jetonSuperAdmin() {
        return UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository, utilisateurEntrepriseRepository).token;
    }

    /** Un compte porteur d'un rôle donné sur l'entreprise de la mission éprouvée. */
    private String jetonAvecRoleSurEntreprise(String entrepriseId, String roleCode) {
        var candidat = UtilisateurDeTest.creerEtConnecter(jwtService);
        rattacher(UUID.fromString(candidat.id), UUID.fromString(entrepriseId), roleCode);
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

    /**
     * L'identifiant du critère de référentiel porté par le premier critère de
     * la mission.
     *
     * <p>Lu en base et non par l'API : {@code AuditCritereDto} expose
     * l'identifiant du critère <em>de mission</em> et le code du critère, mais
     * pas l'identifiant du critère de référentiel — or c'est lui qu'attend
     * {@code CritereBailleurResource}. Élargir ce DTO pour les besoins d'un
     * test changerait un contrat consommé ailleurs.
     */
    @Transactional
    String premierCritereDeLaMission(Contexte ctx) {
        return entityManager.createNativeQuery(
                        "SELECT ac.critere_id::text FROM audit_critere ac "
                                + "WHERE ac.audit_id = CAST(?1 AS uuid) ORDER BY ac.id LIMIT 1")
                .setParameter(1, ctx.auditId())
                .getSingleResult().toString();
    }

    private void taguer(String jetonAdmin, String critereId, boolean applicable) {
        given()
                .header("Authorization", "Bearer " + jetonAdmin)
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", "IFC_SFI", "applicable", applicable))
                .when().put("/api/v1/referentiels/criteres/" + critereId + "/bailleur")
                .then().statusCode(200);
    }

    private void detaguer(String jetonAdmin, String critereId) {
        given()
                .header("Authorization", "Bearer " + jetonAdmin)
                .when().delete("/api/v1/referentiels/criteres/" + critereId + "/bailleur/IFC_SFI")
                .then().statusCode(204);
    }

    /**
     * Pose une évaluation validée sur le critère de mission correspondant.
     *
     * <p>Écrite directement plutôt que produite par le pipeline : ce qui est
     * éprouvé ici est le périmètre du calcul, pas la qualité d'une analyse —
     * et le pipeline consommerait du quota chez le fournisseur.
     */
    @Transactional
    void poserEvaluationValidee(UUID auditId, UUID critereId) {
        entityManager.createNativeQuery(
                        "UPDATE audit_critere SET criticite_id = "
                                + "(SELECT id FROM criticite ORDER BY poids DESC LIMIT 1) "
                                + "WHERE audit_id = ?1 AND critere_id = ?2 AND criticite_id IS NULL")
                .setParameter(1, auditId).setParameter(2, critereId).executeUpdate();

        // Le validateur est obligatoire : la contrainte
        // `evaluation_v2_validee_porte_un_validateur` (phase 5.10) refuse une
        // évaluation V2 validée que personne n'aurait entérinée. Le décor s'y
        // plie plutôt que de la contourner — c'est elle qui a raison. Le
        // validateur retenu est le créateur de la mission.
        entityManager.createNativeQuery(
                        "INSERT INTO evaluation (audit_critere_id, probabilite_conforme, note, source, "
                                + "statut, contrat_version, justification, date_evaluation, validee_par, validee_le) "
                                + "SELECT ac.id, 0.8000, 4, 'IA', 'VALIDEE', '2.0', "
                                + "'Évaluation posée pour éprouver le périmètre de l''indice.', now(), "
                                + "a.created_by, now() "
                                + "FROM audit_critere ac JOIN audit a ON a.id = ac.audit_id "
                                + "WHERE ac.audit_id = ?1 AND ac.critere_id = ?2")
                .setParameter(1, auditId).setParameter(2, critereId).executeUpdate();
    }

    /** Ramène la formule de la mission, pour éprouver une rétrogradation. */
    @Transactional
    void poserFormuleMission(UUID auditId, String codeFormule) {
        entityManager.createNativeQuery(
                        "UPDATE audit SET formule_abonnement_id = "
                                + "(SELECT id FROM formule_abonnement WHERE code = ?2) WHERE id = ?1")
                .setParameter(1, auditId).setParameter(2, codeFormule).executeUpdate();
    }

    @Test
    void listerBailleurs_contientIfcSfi() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);

        given()
                .when().get("/api/v1/bailleurs")
                .then()
                .statusCode(200)
                .body("code", org.hamcrest.Matchers.hasItem("IFC_SFI"));
    }

    @Test
    void calculer_formuleStandard_estRefuseParRG41() {
        var ctx = creerContexte("STANDARD");

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", "IFC_SFI"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                .then()
                .statusCode(403);
    }

    /**
     * Ce test attendait {@code score = 0.0} et nommait ce zéro « neutre ».
     * C'était précisément le défaut : rien ne distinguait « aucun critère
     * n'est rattaché à ce bailleur » de « cette organisation n'est pas
     * préparée ». Les deux appellent des décisions opposées — du paramétrage
     * d'un côté, de la mise en conformité de l'autre.
     *
     * <p>L'assertion est donc adaptée à la règle nouvelle, pas contournée :
     * l'indice porte maintenant la raison de son absence de score.
     */
    @Test
    void calculer_formuleAvancees_sansCritereTague_estNonCalculable() {
        var ctx = creerContexte("AVANCEES");

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", "IFC_SFI"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                .then()
                .statusCode(200)
                .body("bailleurCode", equalTo("IFC_SFI"))
                .body("statut", equalTo("NON_CALCULABLE"))
                .body("score", nullValue())
                .body("nombreCriteresTagues", equalTo(0))
                .body("nombreCriteresRetenus", equalTo(0));

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                .then()
                .statusCode(200)
                .body("$", hasSize(1));
    }

    /**
     * Un périmètre existe, mais rien n'y est encore opposable. Le score reste
     * nul : un critère rattaché mais non évalué ne vaut pas zéro, il ne vaut
     * rien du tout.
     *
     * <p>Le tag est retiré en {@code finally} : {@code critere_bailleur} est
     * une table globale au référentiel, pas à la mission. Un tag laissé en
     * place ferait basculer les autres tests de cette classe — et l'ordre
     * d'exécution ne garantit pas lequel.
     */
    @Test
    void calculer_avecTagMaisSansEvaluationValidee_estSansEvaluation() {
        var ctx = creerContexte("AVANCEES");
        String critereId = premierCritereDeLaMission(ctx);
        String jetonAdmin = jetonSuperAdmin();

        taguer(jetonAdmin, critereId, true);
        try {
            given()
                    .header("Authorization", "Bearer " + ctx.token())
                    .contentType(ContentType.JSON)
                    .body(Map.of("bailleurCode", "IFC_SFI"))
                    .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                    .then()
                    .statusCode(200)
                    .body("statut", equalTo("SANS_EVALUATION"))
                    .body("score", nullValue())
                    .body("nombreCriteresTagues", equalTo(1))
                    .body("nombreCriteresRetenus", equalTo(0));
        } finally {
            detaguer(jetonAdmin, critereId);
        }
    }

    /**
     * Le seul cas où un chiffre est produit. Le périmètre retenu est celui
     * du calcul, pas celui du bailleur : ici un unique critère tagué et
     * validé, sur une mission qui en compte beaucoup d'autres.
     */
    @Test
    void calculer_avecEvaluationValidee_estCalculeEtCompteSonPerimetre() {
        var ctx = creerContexte("AVANCEES");
        String jetonAdmin = jetonSuperAdmin();

        // V74-B : un mapping ne compte que si sa correspondance est justifiée
        // et validée. La justification rend le mapping définitivement non
        // supprimable (RESTRICT) : le décor emploie donc un bailleur fictif
        // propre à ce test, jamais IFC_SFI, que les autres cas de cette classe
        // supposent sans tag. Pour la même raison, le critère est choisi en fin
        // de catalogue (troisième en partant de la fin, D6-91 aujourd'hui) et
        // non au hasard : un mapping persistant sur le premier critère du
        // catalogue ferait échouer critereBailleur_definirListerSupprimer.
        String critereId = io.quarkus.narayana.jta.QuarkusTransaction.requiringNew().call(() -> entityManager.createNativeQuery(
                        "SELECT c.id::text FROM audit_critere ac "
                                + "JOIN critere c ON c.id = ac.critere_id JOIN domaine d ON d.id = c.domaine_id "
                                + "WHERE ac.audit_id = CAST(?1 AS uuid) AND ac.actif AND ac.applicable "
                                + "ORDER BY d.ordre DESC, c.code DESC OFFSET 2 LIMIT 1")
                .setParameter(1, ctx.auditId())
                .getSingleResult().toString());
        String bailleurCode = "ZZTEST_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        io.quarkus.narayana.jta.QuarkusTransaction.requiringNew().run(() -> entityManager.createNativeQuery(
                        "INSERT INTO bailleur (code, nom, description) VALUES (?1, ?2, ?3)")
                .setParameter(1, bailleurCode)
                .setParameter(2, "Bailleur fictif de test")
                .setParameter(3, "Décor de test V74-B, sans valeur réglementaire.")
                .executeUpdate());

        given()
                .header("Authorization", "Bearer " + jetonAdmin)
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", bailleurCode, "applicable", true))
                .when().put("/api/v1/referentiels/criteres/" + critereId + "/bailleur")
                .then().statusCode(200);

        String urlJustification = "/api/v1/referentiels/criteres/" + critereId + "/bailleur/" + bailleurCode + "/justification";
        String justificationId = given()
                .header("Authorization", "Bearer " + jetonAdmin)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "documentNom", "Document fictif de test",
                        "documentEdition", "Édition de test",
                        "documentOrganisme", "Organisme fictif",
                        "referenceOfficielle", "REF-TEST-1",
                        "texteSource", "Passage fictif rédigé pour le test.",
                        "correspondance", "EXACTE",
                        "justification", "Justification fictive de test."))
                .when().post(urlJustification)
                .then().statusCode(201)
                .extract().path("id");
        given()
                .header("Authorization", "Bearer " + jetonAdmin)
                .when().post(urlJustification + "/" + justificationId + "/validation")
                .then().statusCode(200);

        poserEvaluationValidee(UUID.fromString(ctx.auditId()), UUID.fromString(critereId));

        // Un seul critère retenu, probabilité 0,80 -> niveau 4 : le score vaut
        // 4 x coefficient / coefficient, soit 4,00, quel que soit le coefficient.
        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", bailleurCode))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                .then()
                .statusCode(200)
                .body("statut", equalTo("CALCULE"))
                .body("score", equalTo(4.0f))
                .body("nombreCriteresTagues", equalTo(1))
                .body("nombreCriteresRetenus", equalTo(1));
    }

    /**
     * La réponse ne porte que le chiffre et son périmètre. Aucune
     * justification, aucune piste, aucun élément de raisonnement du modèle :
     * un indice n'est pas une restitution d'analyse.
     */
    @Test
    void laReponse_nExposeAucunRaisonnementIa() {
        var ctx = creerContexte("AVANCEES");

        var champs = given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", "IFC_SFI"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                .then().statusCode(200)
                .extract().jsonPath().getMap("$").keySet();

        for (String interdit : new String[] {
                "justification", "justificationRisque", "justificationCouverture",
                "pistesAmelioration", "raisonnement", "prompt", "responseId", "servedModel"}) {
            assertFalse(champs.contains(interdit), "Champ exposé à tort : " + interdit);
        }
    }

    // === La garde de formule s'applique aussi en lecture =====================

    @Test
    void lister_formuleAvancees_estAutorise() {
        var ctx = creerContexte("AVANCEES");

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                .then().statusCode(200);
    }

    @Test
    void lister_formuleStandard_estRefuse() {
        var ctx = creerContexte("STANDARD");

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                .then().statusCode(403);
    }

    /**
     * Le cas qui a motivé la correction : l'indice a été calculé du temps où
     * l'organisation payait Avancées, puis la formule de la mission est
     * ramenée à Standard. La lecture doit se fermer — sans quoi la
     * restriction ne tiendrait que le jour de l'écriture.
     */
    @Test
    void lister_apresRetrogradation_estRefuse() {
        var ctx = creerContexte("AVANCEES");

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", "IFC_SFI"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                .then().statusCode(200);

        poserFormuleMission(UUID.fromString(ctx.auditId()), "STANDARD");

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                .then().statusCode(403);
    }

    /**
     * Le personnel Smartex n'échappe pas à la formule du client : décision
     * déjà prise pour le calcul, reconduite ici pour la lecture.
     */
    @Test
    void lister_superAdminEnFormuleStandard_estRefuse() {
        var ctx = creerContexte("STANDARD");
        String jeton = jetonAvecRoleSurEntreprise(ctx.entrepriseId(), "SUPER_ADMIN");

        given()
                .header("Authorization", "Bearer " + jeton)
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                .then().statusCode(403);
    }

    /** Le collaborateur ne porte pas bailleur:consulter : le refus vient du rôle, avant la formule. */
    @Test
    void lister_collaborateur_estRefuse() {
        var ctx = creerContexte("AVANCEES");
        String jeton = jetonAvecRoleSurEntreprise(ctx.entrepriseId(), "COLLABORATEUR");

        given()
                .header("Authorization", "Bearer " + jeton)
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                .then().statusCode(403);
    }

    @Test
    void critereBailleur_definirListerSupprimer() {
        String token = UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository, utilisateurEntrepriseRepository).token;

        String critereId = given()
                .header("Authorization", "Bearer " + token)
                .when().get("/api/v1/referentiels/SMARTEX_SUSTWAY/criteres")
                .then().statusCode(200)
                .extract().jsonPath().getString("[0].id");

        given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", "IFC_SFI", "applicable", true))
                .when().put("/api/v1/referentiels/criteres/" + critereId + "/bailleur")
                .then()
                .statusCode(200)
                .body("bailleurCode", equalTo("IFC_SFI"))
                .body("applicable", equalTo(true));

        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/api/v1/referentiels/criteres/" + critereId + "/bailleur")
                .then()
                .statusCode(200)
                .body("bailleurCode", org.hamcrest.Matchers.hasItem("IFC_SFI"));

        given()
                .header("Authorization", "Bearer " + token)
                .when().delete("/api/v1/referentiels/criteres/" + critereId + "/bailleur/IFC_SFI")
                .then()
                .statusCode(204);

        given()
                .header("Authorization", "Bearer " + token)
                .when().get("/api/v1/referentiels/criteres/" + critereId + "/bailleur")
                .then()
                .statusCode(200)
                .body("$", org.hamcrest.Matchers.empty());
    }

    @Test
    void calculer_isolationMultiTenant_estRefusee() {
        var ctx = creerContexte("AVANCEES");
        var utilisateurB = UtilisateurDeTest.creerEtConnecter(jwtService);

        given()
                .header("Authorization", "Bearer " + utilisateurB.token)
                .contentType(ContentType.JSON)
                .body(Map.of("bailleurCode", "IFC_SFI"))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + ctx.auditId() + "/indice-preparation")
                .then()
                .statusCode(403);
    }
}
