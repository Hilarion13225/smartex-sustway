package com.smartexsustway.api.resource;

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
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Contenu métier du référentiel : exigences, preuves attendues et règles
 * d'analyse.
 *
 * Trois choses sont éprouvées ici, et pas une de plus. Que ce contenu suive
 * le régime d'immuabilité posé en phase 3A — sans quoi on aurait versionné
 * l'énoncé d'un critère tout en laissant réécrire ce qu'il exige. Qu'il
 * n'introduise aucune nouvelle unité d'évaluation : le score reste au
 * niveau du critère. Et qu'il atteigne réellement le service d'agents, car
 * un contenu qui reste en base ne sert à rien.
 */
@QuarkusTest
class ContenuMetierReferentielTest {

    @Inject JwtService jwtService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject EntityManager entityManager;

    @InjectMock
    @RestClient
    IaEvaluationClient iaEvaluationClient;

    /** Référentiel de test avec un critère, sa question et sa version de travail. */
    private record Cadre(String token, String code, String critereId, String questionId) {
    }

    // --- Construction ---------------------------------------------------

    private String jetonSuperAdmin() {
        return UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository,
                utilisateurEntrepriseRepository).token;
    }

    /**
     * Référentiel neuf, encore en brouillon, portant un critère et sa
     * question.
     *
     * La question est insérée en SQL : aucun endpoint ne les crée
     * aujourd'hui, elles ne viennent que des migrations de contenu. Sans
     * elle, la mission bâtie plus bas n'aurait rien à déclarer.
     */
    private Cadre cadreEnBrouillon(String suffixe) {
        String token = jetonSuperAdmin();
        String code = "TEST_" + suffixe + "_" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        given().header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of("code", code, "nom", "Référentiel contenu métier", "type", "SMARTEX"))
                .when().post("/api/v1/referentiels")
                .then().statusCode(201);

        given().header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of("code", "DOM1", "nom", "Environnement"))
                .when().post("/api/v1/referentiels/" + code + "/domaines")
                .then().statusCode(201);

        String critereId = given().header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of("code", "DOM1-01", "libelle", "Gérer les déchets dangereux"))
                .when().post("/api/v1/referentiels/" + code + "/domaines/DOM1/criteres")
                .then().statusCode(201)
                .extract().path("id");

        String questionId = creerQuestion(UUID.fromString(critereId)).toString();
        return new Cadre(token, code, critereId, questionId);
    }

    @Transactional
    UUID creerQuestion(UUID critereId) {
        UUID id = UUID.randomUUID();
        entityManager.createNativeQuery(
                        "INSERT INTO question (id, critere_id, referentiel_version_id, code, libelle, ordre) "
                                + "SELECT ?1, c.id, c.referentiel_version_id, 'DOM1-01-Q1', "
                                + "'Où en êtes-vous sur la gestion des déchets dangereux ?', 0 "
                                + "FROM critere c WHERE c.id = ?2")
                .setParameter(1, id).setParameter(2, critereId)
                .executeUpdate();
        return id;
    }

    private void publier(Cadre cadre, String numero) {
        given().header("Authorization", "Bearer " + cadre.token())
                .when().post("/api/v1/referentiels/" + cadre.code() + "/versions/" + numero + "/publication")
                .then().statusCode(200).body("statut", equalTo("PUBLIEE"));
    }

    private void ouvrirBrouillon(Cadre cadre, String numero) {
        given().header("Authorization", "Bearer " + cadre.token())
                .contentType(ContentType.JSON)
                .body(Map.of("numero", numero))
                .when().post("/api/v1/referentiels/" + cadre.code() + "/versions")
                .then().statusCode(201);
    }

    private String critereDeLaVersionDeTravail(Cadre cadre) {
        return given().header("Authorization", "Bearer " + cadre.token())
                .when().get("/api/v1/referentiels/" + cadre.code() + "/criteres")
                .then().statusCode(200)
                .extract().path("[0].id");
    }

    // --- Écritures de contenu -------------------------------------------

    private io.restassured.response.ValidatableResponse creerExigence(String token, String critereId,
                                                                      String intitule, String enonce) {
        return given().header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of("intitule", intitule, "enonce", enonce))
                .when().post("/api/v1/referentiels/criteres/" + critereId + "/exigences")
                .then();
    }

    private io.restassured.response.ValidatableResponse creerPreuveAttendue(String token, String exigenceId,
                                                                            String libelle) {
        return given().header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of("type", "PROCEDURE", "libelle", libelle,
                        "description", "Datée de moins de deux ans.", "obligatoire", true))
                .when().post("/api/v1/referentiels/exigences/" + exigenceId + "/preuves-attendues")
                .then();
    }

    private io.restassured.response.ValidatableResponse creerRegle(String token, String critereId,
                                                                   String code, Map<String, Object> corps) {
        return given().header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(corps)
                .when().post("/api/v1/referentiels/criteres/" + critereId + "/regles")
                .then();
    }

    private String premiereExigence(String token, String critereId) {
        return given().header("Authorization", "Bearer " + token)
                .when().get("/api/v1/referentiels/criteres/" + critereId + "/exigences")
                .then().statusCode(200)
                .extract().path("[0].id");
    }

    // === 1 ==================================================================

    /**
     * L'initialisation a doté chaque critère d'une exigence, et l'a marquée
     * comme telle : reprise du libellé, donc à réécrire.
     */
    @Test
    void un_chaqueCritereAUneExigenceInitiale() {
        Number sansExigence = (Number) entityManager.createNativeQuery(
                        "SELECT count(*) FROM critere c "
                                + "WHERE NOT EXISTS (SELECT 1 FROM exigence e WHERE e.critere_id = c.id)")
                .getSingleResult();
        assertEquals(0L, sansExigence.longValue(), "Tout critère doit porter au moins une exigence.");

        Number initiales = (Number) entityManager.createNativeQuery(
                "SELECT count(*) FROM exigence WHERE origine = 'CONTENU_INITIAL'").getSingleResult();
        assertTrue(initiales.longValue() > 0,
                "Les exigences semées par l'initialisation doivent être reconnaissables à leur origine.");

        // Leur énoncé reprend le libellé du critère : c'est un point de
        // départ, pas une exigence rédigée.
        Number divergentes = (Number) entityManager.createNativeQuery(
                        "SELECT count(*) FROM exigence e JOIN critere c ON c.id = e.critere_id "
                                + "WHERE e.origine = 'CONTENU_INITIAL' AND e.enonce <> c.libelle")
                .getSingleResult();
        assertEquals(0L, divergentes.longValue(),
                "Une exigence d'origine CONTENU_INITIAL reprend le libellé de son critère.");
    }

    // === 2, 4, 6 ============================================================

    /** Dans un brouillon, le contenu métier se crée et se modifie librement. */
    @Test
    void deux_quatre_six_contenuMetierCreeDansUnBrouillon() {
        Cadre cadre = cadreEnBrouillon("BROU");

        String exigenceId = creerExigence(cadre.token(), cadre.critereId(),
                "Procédure de gestion des déchets dangereux",
                "L'organisation doit disposer d'une procédure de gestion des déchets dangereux.")
                .statusCode(201)
                .body("origine", equalTo("CONTENU_HUMAIN"))
                .body("modifiable", equalTo(true))
                .extract().path("id");

        String preuveId = creerPreuveAttendue(cadre.token(), exigenceId, "Procédure officielle signée")
                .statusCode(201)
                .body("type", equalTo("PROCEDURE"))
                .body("obligatoire", equalTo(true))
                .extract().path("id");

        creerRegle(cadre.token(), cadre.critereId(), "R1", Map.of(
                "code", "DOM1-01-R1",
                "type", "DATE_VALIDITE",
                "libelle", "La procédure doit avoir été révisée récemment",
                "severite", "ELEVEE",
                "exigenceId", exigenceId,
                "preuveAttendueId", preuveId,
                "definition", Map.of("champ", "date de révision", "anciennete_maximale_mois", 24)))
                .statusCode(201)
                .body("type", equalTo("DATE_VALIDITE"))
                .body("severite", equalTo("ELEVEE"))
                .body("exigenceId", equalTo(exigenceId))
                .body("preuveAttendueId", equalTo(preuveId));

        // Modifications, toujours dans le brouillon.
        given().header("Authorization", "Bearer " + cadre.token())
                .contentType(ContentType.JSON)
                .body(Map.of("enonce", "Énoncé précisé."))
                .when().put("/api/v1/referentiels/exigences/" + exigenceId)
                .then().statusCode(200).body("enonce", equalTo("Énoncé précisé."));

        given().header("Authorization", "Bearer " + cadre.token())
                .contentType(ContentType.JSON)
                .body(Map.of("obligatoire", false))
                .when().put("/api/v1/referentiels/preuves-attendues/" + preuveId)
                .then().statusCode(200).body("obligatoire", equalTo(false));
    }

    /**
     * Réécrire l'énoncé d'une exigence initiale la fait passer en contenu
     * humain : la marque signalait ce travail, elle doit disparaître quand
     * il est fait.
     */
    @Test
    void reecrireUneExigenceInitiale_laFaitPasserEnContenuHumain() {
        Cadre cadre = cadreEnBrouillon("ORIG");
        String exigenceId = premiereExigence(cadre.token(), cadre.critereId());

        given().header("Authorization", "Bearer " + cadre.token())
                .when().get("/api/v1/referentiels/criteres/" + cadre.critereId() + "/exigences")
                .then().statusCode(200).body("[0].origine", equalTo("CONTENU_INITIAL"));

        given().header("Authorization", "Bearer " + cadre.token())
                .contentType(ContentType.JSON)
                .body(Map.of("enonce", "L'organisation doit tracer chaque enlèvement de déchets dangereux."))
                .when().put("/api/v1/referentiels/exigences/" + exigenceId)
                .then().statusCode(200).body("origine", equalTo("CONTENU_HUMAIN"));
    }

    // === 3, 5, 7 ============================================================

    /** Une fois la version publiée, aucun des trois objets ne bouge plus. */
    @Test
    void trois_cinq_sept_contenuMetierFigeApresPublication() {
        Cadre cadre = cadreEnBrouillon("FIGE");
        String exigenceId = creerExigence(cadre.token(), cadre.critereId(),
                "Procédure formalisée", "L'organisation doit formaliser sa procédure.")
                .statusCode(201).extract().path("id");
        String preuveId = creerPreuveAttendue(cadre.token(), exigenceId, "Procédure signée")
                .statusCode(201).extract().path("id");
        String regleId = creerRegle(cadre.token(), cadre.critereId(), "R1", Map.of(
                "code", "DOM1-01-R1", "type", "PRESENCE", "libelle", "La procédure doit être présente",
                "exigenceId", exigenceId,
                "definition", Map.of("elements", List.of("procédure de gestion"))))
                .statusCode(201).extract().path("id");

        publier(cadre, "1.0");

        // 3 — exigence
        given().header("Authorization", "Bearer " + cadre.token())
                .contentType(ContentType.JSON).body(Map.of("enonce", "Réécriture après publication"))
                .when().put("/api/v1/referentiels/exigences/" + exigenceId)
                .then().statusCode(409);
        given().header("Authorization", "Bearer " + cadre.token())
                .when().delete("/api/v1/referentiels/exigences/" + exigenceId)
                .then().statusCode(409);
        creerExigence(cadre.token(), cadre.critereId(), "Ajout après publication", "Énoncé")
                .statusCode(409);

        // 5 — preuve attendue
        given().header("Authorization", "Bearer " + cadre.token())
                .contentType(ContentType.JSON).body(Map.of("libelle", "Renommée après publication"))
                .when().put("/api/v1/referentiels/preuves-attendues/" + preuveId)
                .then().statusCode(409);
        given().header("Authorization", "Bearer " + cadre.token())
                .when().delete("/api/v1/referentiels/preuves-attendues/" + preuveId)
                .then().statusCode(409);
        creerPreuveAttendue(cadre.token(), exigenceId, "Ajout après publication").statusCode(409);

        // 7 — règle d'analyse
        given().header("Authorization", "Bearer " + cadre.token())
                .contentType(ContentType.JSON).body(Map.of("libelle", "Réécrite après publication"))
                .when().put("/api/v1/referentiels/regles/" + regleId)
                .then().statusCode(409);
        given().header("Authorization", "Bearer " + cadre.token())
                .when().delete("/api/v1/referentiels/regles/" + regleId)
                .then().statusCode(409);
        creerRegle(cadre.token(), cadre.critereId(), "R2", Map.of(
                "code", "DOM1-01-R2", "type", "PRESENCE", "libelle", "Ajout après publication",
                "definition", Map.of("elements", List.of("x")))).statusCode(409);
    }

    // === 8 ==================================================================

    /**
     * Le déplacement, sous ses deux formes : sortir une exigence d'une
     * version publiée, et y faire entrer une exigence de brouillon en la
     * rattachant à un critère publié. Les deux passent sous le radar d'un
     * simple contrôle d'immuabilité, d'où les déclencheurs dédiés (V53).
     */
    @Test
    void huit_deplacerUnContenuHorsOuVersUneVersionPubliee_estRefuse() {
        Cadre cadre = cadreEnBrouillon("DEPL");
        String exigencePubliee = creerExigence(cadre.token(), cadre.critereId(),
                "Exigence de la 1.0", "Énoncé de la 1.0").statusCode(201).extract().path("id");
        String criterePublie = cadre.critereId();
        publier(cadre, "1.0");
        ouvrirBrouillon(cadre, "2.0");

        UUID brouillonId = idDeLaVersion(cadre.code(), "2.0");

        // Sortir l'exigence de la version publiée vers le brouillon. Deux
        // déclencheurs s'y opposent — l'immuabilité de la version d'origine
        // et la cohérence avec le critère parent —, et celui qui parle en
        // premier dépend de leur ordre alphabétique. Ce qui compte est que
        // l'écriture soit refusée et que la ligne n'ait pas bougé.
        var sortie = org.junit.jupiter.api.Assertions.assertThrows(RuntimeException.class,
                () -> deplacerExigenceVersVersion(UUID.fromString(exigencePubliee), brouillonId));
        String motifSortie = racine(sortie).getMessage();
        assertTrue(motifSortie.contains("version PUBLIEE") || motifSortie.contains("version de son critère"),
                "Message reçu : " + motifSortie);
        assertEquals(idDeLaVersion(cadre.code(), "1.0"),
                versionDeLExigence(UUID.fromString(exigencePubliee)),
                "L'exigence doit être restée dans la version publiée.");

        // Faire entrer une exigence de brouillon sous un critère publié.
        var entree = org.junit.jupiter.api.Assertions.assertThrows(RuntimeException.class,
                () -> rattacherExigenceAuCritere(brouillonId, UUID.fromString(criterePublie)));
        assertTrue(racine(entree).getMessage().contains("version de son critère"),
                "Message reçu : " + racine(entree).getMessage());
    }

    @Transactional
    void deplacerExigenceVersVersion(UUID exigenceId, UUID versionCible) {
        entityManager.createNativeQuery(
                        "UPDATE exigence SET referentiel_version_id = ?1 WHERE id = ?2")
                .setParameter(1, versionCible).setParameter(2, exigenceId)
                .executeUpdate();
        entityManager.flush();
    }

    @Transactional
    void rattacherExigenceAuCritere(UUID versionBrouillon, UUID criterePublie) {
        entityManager.createNativeQuery(
                        "INSERT INTO exigence (referentiel_version_id, critere_id, code, intitule, enonce) "
                                + "VALUES (?1, ?2, 'INTRUS', 'Intrus', 'Intrus')")
                .setParameter(1, versionBrouillon).setParameter(2, criterePublie)
                .executeUpdate();
        entityManager.flush();
    }

    // === 9 ==================================================================

    /**
     * Le référentiel est commun à toutes les organisations : il n'appartient
     * à aucun tenant, et aucun utilisateur d'entreprise n'y écrit, quel que
     * soit son rattachement.
     */
    @Test
    void neuf_aucunUtilisateurDEntrepriseNecritDansLeReferentiel() {
        Cadre cadre = cadreEnBrouillon("IDOR");
        String exigenceId = premiereExigence(cadre.token(), cadre.critereId());
        var client = UtilisateurDeTest.creerEtConnecter(jwtService);

        creerExigence(client.token, cadre.critereId(), "Exigence imposée", "Énoncé").statusCode(403);

        given().header("Authorization", "Bearer " + client.token)
                .contentType(ContentType.JSON).body(Map.of("enonce", "Réécriture par un client"))
                .when().put("/api/v1/referentiels/exigences/" + exigenceId)
                .then().statusCode(403);

        given().header("Authorization", "Bearer " + client.token)
                .when().delete("/api/v1/referentiels/exigences/" + exigenceId)
                .then().statusCode(403);

        creerPreuveAttendue(client.token, exigenceId, "Pièce imposée").statusCode(403);

        creerRegle(client.token, cadre.critereId(), "R1", Map.of(
                "code", "DOM1-01-RX", "type", "PRESENCE", "libelle", "Règle imposée",
                "definition", Map.of("elements", List.of("x")))).statusCode(403);

        // Le contenu n'a pas bougé.
        given().header("Authorization", "Bearer " + cadre.token())
                .when().get("/api/v1/referentiels/criteres/" + cadre.critereId() + "/exigences")
                .then().statusCode(200).body("size()", equalTo(1));
    }

    // === 10 =================================================================

    /**
     * L'exigence n'est pas devenue une unité d'évaluation : le modèle ne
     * porte aucun lien d'une évaluation vers une exigence, et une analyse
     * produit toujours exactement un résultat par critère.
     */
    @Test
    void dix_leScoringResteAuNiveauDuCritere() {
        Number lienEvaluationExigence = (Number) entityManager.createNativeQuery(
                        "SELECT count(*) FROM information_schema.columns "
                                + "WHERE table_schema = 'public' AND table_name = 'evaluation' "
                                + "AND column_name LIKE '%exigence%'")
                .getSingleResult();
        assertEquals(0L, lienEvaluationExigence.longValue(),
                "Aucune colonne d'évaluation ne doit désigner une exigence.");

        Number tableAuditExigence = (Number) entityManager.createNativeQuery(
                        "SELECT count(*) FROM information_schema.tables "
                                + "WHERE table_schema = 'public' AND table_name = 'audit_exigence'")
                .getSingleResult();
        assertEquals(0L, tableAuditExigence.longValue(),
                "Aucune table audit_exigence ne doit exister dans cette phase.");

        // Une évaluation ne se rattache qu'au critère de mission. Plusieurs
        // évaluations coexistent sur un même critère — l'historique des
        // analyses successives, RG14 — mais aucune ne descend plus bas que le
        // critère, et c'est cela qui devait rester vrai après cette phase.
        Number porteesPlusFines = (Number) entityManager.createNativeQuery(
                        "SELECT count(*) FROM information_schema.columns "
                                + "WHERE table_schema = 'public' AND table_name = 'evaluation' "
                                + "AND column_name IN ('exigence_id', 'preuve_attendue_id')")
                .getSingleResult();
        assertEquals(0L, porteesPlusFines.longValue(),
                "Une évaluation se rattache au critère, à rien de plus fin.");

        Number sansCritere = (Number) entityManager.createNativeQuery(
                "SELECT count(*) FROM evaluation WHERE audit_critere_id IS NULL").getSingleResult();
        assertEquals(0L, sansCritere.longValue(),
                "Toute évaluation porte sur un critère de mission.");
    }

    // === 11 =================================================================

    /** Une mission sur le référentiel semé reste pleinement exploitable. */
    @Test
    void onze_missionExistanteResteFonctionnelle() {
        var mission = creerMission("SMARTEX_SUSTWAY", "Mission après contenu métier");

        String auditCritereId = given().header("Authorization", "Bearer " + mission.token())
                .when().get("/api/v1/entreprises/" + mission.entrepriseId()
                        + "/audits/" + mission.auditId() + "/criteres")
                .then().statusCode(200)
                .extract().path("[0].id");

        String questionId = given().header("Authorization", "Bearer " + mission.token())
                .when().get("/api/v1/entreprises/" + mission.entrepriseId() + "/audits/" + mission.auditId()
                        + "/criteres/" + auditCritereId + "/questions")
                .then().statusCode(200)
                .extract().path("questions[0].auditQuestionId");

        given().header("Authorization", "Bearer " + mission.token())
                .contentType(ContentType.JSON)
                .body(Map.of("scenario", "Situation décrite.",
                        "reponses", List.of(Map.of("auditQuestionId", questionId, "niveau", 3))))
                .when().put("/api/v1/entreprises/" + mission.entrepriseId() + "/audits/" + mission.auditId()
                        + "/criteres/" + auditCritereId + "/questions")
                .then().statusCode(200);
    }

    // === 12 =================================================================

    /**
     * Une version corrective enrichit les exigences sans toucher à celle
     * qu'elle remplace : la 1.0 garde son unique exigence, la 2.0 en compte
     * deux.
     */
    @Test
    void douze_versionCorrectiveEnrichitSansModifierLaPrecedente() {
        Cadre cadre = cadreEnBrouillon("CORR");
        String exigenceDeLa10 = creerExigence(cadre.token(), cadre.critereId(),
                "Exigence d'origine", "Énoncé d'origine").statusCode(201).extract().path("id");
        creerPreuveAttendue(cadre.token(), exigenceDeLa10, "Pièce d'origine").statusCode(201);
        publier(cadre, "1.0");

        ouvrirBrouillon(cadre, "2.0");
        String critereDeLa20 = critereDeLaVersionDeTravail(cadre);
        assertNotEquals(cadre.critereId(), critereDeLa20,
                "Le brouillon porte sa propre copie du critère.");

        // Deux exigences en 1.0 : celle que porte tout critère neuf, reprise
        // de son libellé, et celle qu'on a rédigée. La copie les emporte
        // toutes les deux, avec leurs preuves attendues.
        given().header("Authorization", "Bearer " + cadre.token())
                .when().get("/api/v1/referentiels/criteres/" + critereDeLa20 + "/exigences")
                .then().statusCode(200)
                .body("size()", equalTo(2))
                .body("intitule", hasItem("Exigence d'origine"))
                .body("find { it.intitule == \"Exigence d'origine\" }.preuvesAttendues.size()",
                        equalTo(1));

        creerExigence(cadre.token(), critereDeLa20, "Exigence ajoutée en 2.0",
                "Nouvel énoncé.").statusCode(201);
        publier(cadre, "2.0");

        // La 1.0 n'a pas bougé.
        Number exigencesDeLa10 = (Number) entityManager.createNativeQuery(
                        "SELECT count(*) FROM exigence WHERE critere_id = ?1")
                .setParameter(1, UUID.fromString(cadre.critereId()))
                .getSingleResult();
        assertEquals(2L, exigencesDeLa10.longValue(),
                "La version publiée précédente conserve exactement ses exigences.");

        given().header("Authorization", "Bearer " + cadre.token())
                .when().get("/api/v1/referentiels/criteres/" + critereDeLa20 + "/exigences")
                .then().statusCode(200)
                .body("size()", equalTo(3))
                .body("intitule", hasItem("Exigence ajoutée en 2.0"));
    }

    // === 13 =================================================================

    /**
     * Le contexte atteint réellement le service d'agents.
     *
     * Un contenu qui resterait en base ne servirait à rien : c'est le
     * contenu de la requête transmise qui est inspecté ici, avec un double
     * du client — sans consommer de quota ni dépendre du réseau.
     */
    @Test
    void treize_leContexteTransmisPorteExigencesPreuvesAttenduesEtRegles() {
        Cadre cadre = cadreEnBrouillon("CTX");
        String exigenceId = creerExigence(cadre.token(), cadre.critereId(),
                "Procédure de gestion des déchets dangereux",
                "L'organisation doit disposer d'une procédure de gestion des déchets dangereux.")
                .statusCode(201).extract().path("id");
        String preuveId = creerPreuveAttendue(cadre.token(), exigenceId, "Procédure officielle signée")
                .statusCode(201).extract().path("id");
        creerRegle(cadre.token(), cadre.critereId(), "R1", Map.of(
                "code", "DOM1-01-R1", "type", "SIGNATURE",
                "libelle", "La procédure doit être validée par la direction",
                "severite", "ELEVEE",
                "exigenceId", exigenceId, "preuveAttendueId", preuveId,
                "definition", Map.of("autorites_acceptees", List.of("Direction générale"))))
                .statusCode(201);
        publier(cadre, "1.0");

        var mission = creerMission(cadre.code(), "Mission contexte enrichi");
        String auditCritereId = given().header("Authorization", "Bearer " + mission.token())
                .when().get("/api/v1/entreprises/" + mission.entrepriseId()
                        + "/audits/" + mission.auditId() + "/criteres")
                .then().statusCode(200).extract().path("[0].id");
        String questionId = given().header("Authorization", "Bearer " + mission.token())
                .when().get("/api/v1/entreprises/" + mission.entrepriseId() + "/audits/" + mission.auditId()
                        + "/criteres/" + auditCritereId + "/questions")
                .then().statusCode(200).extract().path("questions[0].auditQuestionId");
        given().header("Authorization", "Bearer " + mission.token())
                .contentType(ContentType.JSON)
                .body(Map.of("scenario", "Procédure en place depuis 2025.",
                        "reponses", List.of(Map.of("auditQuestionId", questionId, "niveau", 4))))
                .when().put("/api/v1/entreprises/" + mission.entrepriseId() + "/audits/" + mission.auditId()
                        + "/criteres/" + auditCritereId + "/questions")
                .then().statusCode(200);

        when(iaEvaluationClient.evaluerCritere(any()))
                .thenReturn(reponseSimulee(UUID.fromString(auditCritereId)));

        given().header("Authorization", "Bearer " + mission.token())
                .contentType(ContentType.JSON).body("{}")
                .when().post("/api/v1/entreprises/" + mission.entrepriseId() + "/audits/" + mission.auditId()
                        + "/criteres/" + auditCritereId + "/evaluations")
                .then().statusCode(201);

        var capture = ArgumentCaptor.forClass(EvaluerCritereRequestDto.class);
        org.mockito.Mockito.verify(iaEvaluationClient).evaluerCritere(capture.capture());
        var requete = capture.getValue();

        assertEquals("DOM1-01", requete.critereCode());
        // Deux exigences : celle que porte tout critère neuf, et celle
        // rédigée pour ce test.
        assertEquals(2, requete.exigences().size(), "Le contexte doit porter les exigences du critère.");
        var exigenceRedigee = requete.exigences().stream()
                .filter(e -> e.enonce().startsWith("L'organisation doit disposer"))
                .findFirst()
                .orElseThrow(() -> new AssertionError(
                        "L'exigence rédigée doit figurer dans le contexte transmis."));

        assertEquals(1, requete.preuvesAttendues().size(),
                "Le contexte doit porter ce que l'audit attend en démonstration.");
        assertEquals("Procédure officielle signée", requete.preuvesAttendues().get(0).libelle());
        assertEquals(exigenceRedigee.code(), requete.preuvesAttendues().get(0).exigenceCode(),
                "La pièce attendue doit rester rattachée à son exigence.");

        assertEquals(1, requete.reglesAnalyse().size(), "Le contexte doit porter les règles d'analyse.");
        var regle = requete.reglesAnalyse().get(0);
        assertEquals("SIGNATURE", regle.type());
        assertEquals("ELEVEE", regle.severite());
        assertEquals("Procédure officielle signée", regle.preuveAttendueLibelle(),
                "La portée de la règle doit accompagner la règle.");
        assertTrue(regle.definition().containsKey("autorites_acceptees"),
                "La définition structurée doit être transmise telle quelle.");
    }

    /** La définition d'une règle est validée selon son type, pas acceptée telle quelle. */
    @Test
    void definitionDeRegleIncoherenteAvecSonType_estRefusee() {
        Cadre cadre = cadreEnBrouillon("VALID");

        creerRegle(cadre.token(), cadre.critereId(), "R1", Map.of(
                "code", "DOM1-01-R1", "type", "DATE_VALIDITE", "libelle", "Sans champ de date",
                "definition", Map.of())).statusCode(400);

        creerRegle(cadre.token(), cadre.critereId(), "R2", Map.of(
                "code", "DOM1-01-R2", "type", "PRESENCE", "libelle", "Clé inventée",
                "definition", Map.of("elements", List.of("x"), "cle_inventee", "valeur")))
                .statusCode(400);

        creerRegle(cadre.token(), cadre.critereId(), "R3", Map.of(
                "code", "DOM1-01-R3", "type", "PRESENCE", "libelle", "Définition correcte",
                "definition", Map.of("elements", List.of("procédure de gestion des déchets"))))
                .statusCode(201);
    }

    // --- Outils ---------------------------------------------------------

    private record Mission(String token, String entrepriseId, String auditId) {
    }

    private Mission creerMission(String referentielCode, String nom) {
        var proprietaire = UtilisateurDeTest.creerEtConnecter(jwtService);

        String entrepriseId = given().header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of("raisonSociale", "Entreprise " + nom,
                        "identifiantLegal", "RCCM-CTM-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201)
                .extract().path("entreprise.id");

        given().header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of("fournisseur", "PI_SPI"))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/abonnement/paiements")
                .then().statusCode(201);

        String auditId = given().header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of("referentielCode", referentielCode, "nom", nom,
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201)
                .extract().path("id");

        return new Mission(proprietaire.token, entrepriseId, auditId);
    }

    private EvaluerCritereResponseDto reponseSimulee(UUID auditCritereId) {
        return new EvaluerCritereResponseDto(
                auditCritereId, 0.8250, 0.9000, true,
                "Réponse confirmée par le document fourni.",
                List.of(), null, null, null, null, null);
    }

    private UUID versionDeLExigence(UUID exigenceId) {
        return (UUID) entityManager.createNativeQuery(
                        "SELECT referentiel_version_id FROM exigence WHERE id = ?1")
                .setParameter(1, exigenceId).getSingleResult();
    }

    private UUID idDeLaVersion(String referentielCode, String numero) {
        return (UUID) entityManager.createNativeQuery(
                        "SELECT v.id FROM referentiel_version v JOIN referentiel r ON r.id = v.referentiel_id "
                                + "WHERE r.code = ?1 AND v.numero = ?2")
                .setParameter(1, referentielCode).setParameter(2, numero)
                .getSingleResult();
    }

    private static Throwable racine(Throwable e) {
        Throwable courant = e;
        while (courant.getCause() != null && courant.getCause() != courant) {
            courant = courant.getCause();
        }
        return courant;
    }
}
