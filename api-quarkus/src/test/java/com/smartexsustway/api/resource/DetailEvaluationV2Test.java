package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.entity.AnalyseDocumentConstat;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.entity.EvaluationConstat;
import com.smartexsustway.api.domain.entity.EvaluationDocumentAnalyse;
import com.smartexsustway.api.domain.entity.EvaluationPreuve;
import com.smartexsustway.api.domain.entity.PreuveAttendue;
import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
import com.smartexsustway.api.domain.enums.CouverturePreuveAttendue;
import com.smartexsustway.api.domain.enums.NatureConstat;
import com.smartexsustway.api.domain.enums.PresenceConstat;
import com.smartexsustway.api.domain.enums.SourceEvaluation;
import com.smartexsustway.api.domain.enums.StatutEvaluation;
import com.smartexsustway.api.domain.repository.AnalyseDocumentConstatRepository;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.EvaluationConstatRepository;
import com.smartexsustway.api.domain.repository.EvaluationDocumentAnalyseRepository;
import com.smartexsustway.api.domain.repository.EvaluationPreuveRepository;
import com.smartexsustway.api.domain.repository.EvaluationRepository;
import com.smartexsustway.api.domain.repository.PreuveAttendueRepository;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

/**
 * L'exposition en lecture du raisonnement du pipeline V2.
 *
 * <p>Ces structures étaient persistées depuis la phase 5.7-C sans qu'aucune
 * API ne les rende : une évaluation montrait un chiffre et un texte, alors
 * que la base portait l'avis attente par attente, les constats pièce par
 * pièce et les signaux rattachés.
 *
 * <p>Les tests vérifient **le contenu réellement retourné**, pas seulement
 * un code 200 : une API qui répond 200 avec une liste vide ne prouve rien
 * de son utilité, et une API qui répond 200 avec les données d'une autre
 * évaluation serait une faille silencieuse.
 */
@QuarkusTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class DetailEvaluationV2Test {

    @Inject JwtService jwtService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject EvaluationRepository evaluationRepository;
    @Inject EvaluationPreuveRepository evaluationPreuveRepository;
    @Inject EvaluationConstatRepository evaluationConstatRepository;
    @Inject AnalyseDocumentConstatRepository analyseDocumentConstatRepository;
    @Inject EvaluationDocumentAnalyseRepository documentAnalyseRepository;
    @Inject PreuveAttendueRepository preuveAttendueRepository;
    @Inject EntityManager entityManager;

    private record Mission(String entrepriseId, String auditId, String critereId, String token) {
    }

    private Mission mission;
    private Mission autre;

    private Mission mission() {
        if (mission == null) mission = construire("Entreprise Detail V2");
        return mission;
    }

    /** Une seconde entreprise, sans aucun lien avec la première. */
    private Mission autre() {
        if (autre == null) autre = construire("Entreprise Detail Intruse");
        return autre;
    }

    private Mission construire(String raisonSociale) {
        var proprietaire = UtilisateurDeTest.creerEtConnecter(jwtService);

        String entrepriseId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of("raisonSociale", raisonSociale,
                        "identifiantLegal", "RCCM-DET-" + UUID.randomUUID(),
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
                        "nom", "Mission detail V2", "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201).extract().path("id");

        String critereId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .when().get("/api/v1/entreprises/" + entrepriseId + "/audits/" + auditId + "/criteres")
                .then().statusCode(200).extract().path("[0].id");

        return new Mission(entrepriseId, auditId, critereId, proprietaire.token);
    }

    /**
     * Pose une évaluation V2 complète : trois structures de détail.
     *
     * <p>Le pipeline n'est pas appelé — il consommerait du quota et
     * dépendrait du réseau, sans rien prouver de plus sur l'exposition.
     */
    @Transactional
    UUID poserEvaluationDetaillee(UUID auditCritereId) {
        AuditCritere auditCritere = auditCritereRepository.findById(auditCritereId);
        PreuveAttendue attente = attenteDuCritere(auditCritere);

        Evaluation evaluation = new Evaluation(auditCritere, new BigDecimal("0.5000"), (short) 3);
        evaluation.setSource(SourceEvaluation.IA);
        evaluation.setStatut(StatutEvaluation.EN_REVUE);
        evaluation.setContratVersion("2.0");
        evaluation.setConfianceIa(new BigDecimal("0.6000"));
        evaluation.setConfianceRisque(new BigDecimal("0.6000"));
        evaluation.setCouverturePreuve(true);
        evaluation.setSignalRisque(true);
        evaluation.setCategorieRisque("INFORMATION_MANQUANTE");
        evaluation.setJustificationRisque("Ni date ni validation par la direction.");
        evaluation.setJustification("Le code est formalisé mais n'est pas daté.");
        evaluation.setJustificationCouverture("La pièce couvre partiellement l'attente.");
        evaluationRepository.persistAndFlush(evaluation);

        var preuve = new EvaluationPreuve(evaluation, attente,
                CouverturePreuveAttendue.PARTIELLE, 0);
        preuve.setJustification("Le code existe mais la validation n'est pas démontrée.");
        preuve.setElementsObserves(List.of("Mention des valeurs", "Mention des parties prenantes"));
        preuve.setElementsManquants(List.of("Aucune date de validation"));
        preuve.setElementsNonVerifiables(List.of("Diffusion effective au personnel"));
        preuve.setPiecesUtilisees(List.of("p1"));
        evaluationPreuveRepository.persistAndFlush(preuve);

        var constat = EvaluationConstat.surPreuveAttendue(
                evaluation, NatureConstat.SIGNAL_RISQUE, attente, 0);
        constat.setCategorie("INFORMATION_MANQUANTE");
        constat.setJustification("Ni date ni validation par la direction.");
        constat.setPiecesConcernees(List.of("p1"));
        evaluationConstatRepository.persistAndFlush(constat);

        var analyse = new EvaluationDocumentAnalyse(evaluation,
                "code-de-conduite.txt", "Résumé factuel du document.", 0);
        analyse.setPieceReference("p1");
        analyse.setConfianceLecture(new BigDecimal("0.9000"));
        documentAnalyseRepository.persistAndFlush(analyse);

        var constatDoc = new AnalyseDocumentConstat(analyse, attente, PresenceConstat.PARTIEL, 0);
        constatDoc.setElementsReleves(List.of("Valeurs et principes présents"));
        constatDoc.setElementsManquants(List.of("Date absente"));
        analyseDocumentConstatRepository.persistAndFlush(constatDoc);

        return evaluation.getId();
    }

    /** Une évaluation V2 sans aucun détail — le cas « liste vide ». */
    @Transactional
    UUID poserEvaluationSansDetail(UUID auditCritereId) {
        Evaluation evaluation = new Evaluation(
                auditCritereRepository.findById(auditCritereId), new BigDecimal("0.8000"), (short) 4);
        evaluation.setSource(SourceEvaluation.IA);
        evaluation.setStatut(StatutEvaluation.EN_REVUE);
        evaluation.setContratVersion("2.0");
        evaluation.setJustification("Évaluation sans détail persisté.");
        evaluationRepository.persistAndFlush(evaluation);
        return evaluation.getId();
    }

    private PreuveAttendue attenteDuCritere(AuditCritere auditCritere) {
        var attentes = preuveAttendueRepository.parCritereActives(auditCritere.getCritere().getId());
        if (!attentes.isEmpty()) {
            return attentes.get(0);
        }
        // Le référentiel de test peut ne porter aucune attente sur ce
        // critère : on en sème une, sinon le détail n'aurait rien à viser.
        UUID exigenceId = (UUID) entityManager.createNativeQuery(
                        "INSERT INTO exigence (referentiel_version_id, critere_id, code, intitule, "
                                + "enonce, ordre, origine) "
                                + "SELECT c.referentiel_version_id, c.id, ?1, 'Exigence de test', "
                                + "'Énoncé de test.', 1, 'CONTENU_INITIAL' FROM critere c WHERE c.id = ?2 "
                                + "RETURNING id")
                .setParameter(1, "TST-" + UUID.randomUUID().toString().substring(0, 8))
                .setParameter(2, auditCritere.getCritere().getId())
                .getSingleResult();

        UUID attenteId = (UUID) entityManager.createNativeQuery(
                        "INSERT INTO preuve_attendue (referentiel_version_id, exigence_id, type, "
                                + "libelle, description, ordre, origine) "
                                + "SELECT e.referentiel_version_id, e.id, 'POLITIQUE', "
                                + "'Code de conduite', 'Document daté et validé.', 1, 'CONTENU_INITIAL' "
                                + "FROM exigence e WHERE e.id = ?1 RETURNING id")
                .setParameter(1, exigenceId).getSingleResult();

        return preuveAttendueRepository.findById(attenteId);
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

    private String urlDetail(Mission m, UUID evaluationId) {
        return "/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId()
                + "/criteres/" + m.critereId() + "/evaluations/" + evaluationId + "/detail";
    }

    // === Le contenu réellement retourné ====================================

    @Test
    void leDetailRendLAvisAttenteParAttente() {
        UUID evaluationId = poserEvaluationDetaillee(UUID.fromString(mission().critereId()));

        given().header("Authorization", "Bearer " + jetonAvecRole(mission(), "SUPER_ADMIN"))
                .when().get(urlDetail(mission(), evaluationId))
                .then().statusCode(200)
                .body("evaluationId", equalTo(evaluationId.toString()))
                .body("preuves", hasSize(1))
                .body("preuves[0].couverture", equalTo("PARTIELLE"))
                .body("preuves[0].preuveAttendueLibelle", notNullValue())
                .body("preuves[0].justification",
                        equalTo("Le code existe mais la validation n'est pas démontrée."))
                .body("preuves[0].elementsObserves", hasItem("Mention des valeurs"))
                .body("preuves[0].elementsManquants", hasItem("Aucune date de validation"));
    }

    @Test
    void leDetailDistingueElementsManquantsEtNonVerifiables() {
        // Le point sémantique central du contrat V2 : « on n'a pas pu
        // regarder » n'est pas « on a regardé et ce n'est pas là ». Les
        // fusionner ferait porter à l'organisation le coût d'un défaut de
        // lecture.
        UUID evaluationId = poserEvaluationDetaillee(UUID.fromString(mission().critereId()));

        given().header("Authorization", "Bearer " + jetonAvecRole(mission(), "SUPER_ADMIN"))
                .when().get(urlDetail(mission(), evaluationId))
                .then().statusCode(200)
                .body("preuves[0].elementsManquants", hasSize(1))
                .body("preuves[0].elementsNonVerifiables", hasSize(1))
                .body("preuves[0].elementsNonVerifiables",
                        hasItem("Diffusion effective au personnel"));
    }

    @Test
    void leDetailRendLesConstatsRattaches() {
        UUID evaluationId = poserEvaluationDetaillee(UUID.fromString(mission().critereId()));

        given().header("Authorization", "Bearer " + jetonAvecRole(mission(), "SUPER_ADMIN"))
                .when().get(urlDetail(mission(), evaluationId))
                .then().statusCode(200)
                .body("constats", hasSize(1))
                .body("constats[0].nature", equalTo("SIGNAL_RISQUE"))
                .body("constats[0].niveauRattachement", equalTo("PREUVE_ATTENDUE"))
                .body("constats[0].cibleId", notNullValue())
                .body("constats[0].cibleLibelle", notNullValue())
                .body("constats[0].categorie", equalTo("INFORMATION_MANQUANTE"));
    }

    @Test
    void leDetailRendCeQueChaquePieceDitDeChaqueAttente() {
        UUID evaluationId = poserEvaluationDetaillee(UUID.fromString(mission().critereId()));

        given().header("Authorization", "Bearer " + jetonAvecRole(mission(), "SUPER_ADMIN"))
                .when().get(urlDetail(mission(), evaluationId))
                .then().statusCode(200)
                .body("constatsDocumentaires", hasSize(1))
                .body("constatsDocumentaires[0].presence", equalTo("PARTIEL"))
                .body("constatsDocumentaires[0].documentNom", equalTo("code-de-conduite.txt"))
                .body("constatsDocumentaires[0].pieceReference", equalTo("p1"))
                .body("constatsDocumentaires[0].elementsReleves",
                        hasItem("Valeurs et principes présents"));
    }

    @Test
    void aucunContenuBrutDeDocumentNEstExpose() {
        UUID evaluationId = poserEvaluationDetaillee(UUID.fromString(mission().critereId()));

        String corps = given()
                .header("Authorization", "Bearer " + jetonAvecRole(mission(), "SUPER_ADMIN"))
                .when().get(urlDetail(mission(), evaluationId))
                .then().statusCode(200).extract().asString();

        // Le Document Agent produit des constats structurés ; la
        // restitution s'arrête là. Ni octets, ni base64, ni texte intégral.
        org.junit.jupiter.api.Assertions.assertFalse(corps.contains("contenuBase64"));
        org.junit.jupiter.api.Assertions.assertFalse(corps.contains("cheminStockage"));
        org.junit.jupiter.api.Assertions.assertFalse(corps.contains("contenu\""));
    }

    @Test
    void uneEvaluationSansDetailRendTroisListesVides() {
        // Une liste vide n'est pas une erreur : elle dit qu'aucun détail
        // n'a été persisté — le cas des évaluations antérieures à V2.
        UUID evaluationId = poserEvaluationSansDetail(UUID.fromString(mission().critereId()));

        given().header("Authorization", "Bearer " + jetonAvecRole(mission(), "SUPER_ADMIN"))
                .when().get(urlDetail(mission(), evaluationId))
                .then().statusCode(200)
                .body("preuves", hasSize(0))
                .body("constats", hasSize(0))
                .body("constatsDocumentaires", hasSize(0));
    }

    // === Les six champs que le DTO taisait =================================

    @Test
    void leDtoExposeDesormaisLesChampsPersistesQuIlTaisait() {
        poserEvaluationDetaillee(UUID.fromString(mission().critereId()));

        given().header("Authorization", "Bearer " + mission().token())
                .when().get("/api/v1/entreprises/" + mission().entrepriseId()
                        + "/audits/" + mission().auditId()
                        + "/criteres/" + mission().critereId() + "/evaluations")
                .then().statusCode(200)
                .body("[0].contratVersion", equalTo("2.0"))
                .body("[0].confianceRisque", notNullValue())
                .body("[0].justificationCouverture",
                        equalTo("La pièce couvre partiellement l'attente."))
                // Non validée : le validateur est nul, et cette nullité est
                // elle-même une information.
                .body("[0].valideePar", nullValue())
                .body("[0].valideeLe", nullValue());
    }

    // === Contrôle d'accès ==================================================

    @Test
    void leResponsableDeLEntrepriseAccedeAuDetail() {
        UUID evaluationId = poserEvaluationDetaillee(UUID.fromString(mission().critereId()));

        given().header("Authorization", "Bearer " + jetonAvecRole(mission(), "RESPONSABLE_ENTREPRISE"))
                .when().get(urlDetail(mission(), evaluationId))
                .then().statusCode(200)
                .body("preuves", hasSize(1));
    }

    /**
     * Règle métier tranchée : le collaborateur consulte les résultats
     * opérationnels de l'audit, pas le raisonnement détaillé de l'IA.
     *
     * <p>Il fournit la matière de l'audit — il dépose les preuves et
     * renseigne le questionnaire. Il a besoin de savoir où en est un
     * critère et ce qu'il doit fournir ; le raisonnement, qui nomme ce qui
     * manque et cite ce qui a été observé, relève de la relecture.
     */
    @Test
    void leCollaborateurNAccedePasAuRaisonnementDetailleDeLIa() {
        UUID evaluationId = poserEvaluationDetaillee(UUID.fromString(mission().critereId()));

        given().header("Authorization", "Bearer " + jetonAvecRole(mission(), "COLLABORATEUR"))
                .when().get(urlDetail(mission(), evaluationId))
                .then().statusCode(403);
    }

    @Test
    void leCollaborateurVoitLesResultatsOperationnels() {
        // Ce qui lui reste, et qui est l'essentiel de son travail : où en
        // est le critère, et ce qu'il faut améliorer.
        poserEvaluationDetaillee(UUID.fromString(mission().critereId()));

        given().header("Authorization", "Bearer " + jetonAvecRole(mission(), "COLLABORATEUR"))
                .when().get(urlEvaluations(mission()))
                .then().statusCode(200)
                .body("[0].probabiliteConforme", notNullValue())
                .body("[0].niveauEngagement", notNullValue())
                .body("[0].statut", notNullValue())
                .body("[0].couverturePreuve", notNullValue())
                // Le signal et sa catégorie sont des résultats, pas des
                // explications : ils restent visibles.
                .body("[0].signalRisque", notNullValue())
                // Les documents lus et leur résumé : opérationnel pour
                // celui qui les a déposés.
                .body("[0].documentsAnalyses", hasSize(1));
    }

    @Test
    void leCollaborateurNeRecoitAucuneJustificationInterneDansLaReponse() {
        // Le retrait est fait côté serveur. Le masquer seulement à l'écran
        // laisserait la donnée dans la réponse HTTP — une apparence de
        // restriction, pas une restriction.
        poserEvaluationDetaillee(UUID.fromString(mission().critereId()));

        String corps = given()
                .header("Authorization", "Bearer " + jetonAvecRole(mission(), "COLLABORATEUR"))
                .when().get(urlEvaluations(mission()))
                .then().statusCode(200)
                .body("[0].justification", nullValue())
                .body("[0].justificationCouverture", nullValue())
                .body("[0].justificationRisque", nullValue())
                .body("[0].justificationsMasquees", equalTo(true))
                .extract().asString();

        // Les textes eux-mêmes ne doivent apparaître nulle part.
        org.junit.jupiter.api.Assertions.assertFalse(
                corps.contains("Le code est formalisé mais n'est pas daté."));
        org.junit.jupiter.api.Assertions.assertFalse(
                corps.contains("La pièce couvre partiellement l'attente."));
    }

    @Test
    void leResponsableRecoitLesJustificationsCompletes() {
        poserEvaluationDetaillee(UUID.fromString(mission().critereId()));

        given().header("Authorization", "Bearer " + jetonAvecRole(mission(), "RESPONSABLE_ENTREPRISE"))
                .when().get(urlEvaluations(mission()))
                .then().statusCode(200)
                .body("[0].justification", equalTo("Le code est formalisé mais n'est pas daté."))
                .body("[0].justificationCouverture",
                        equalTo("La pièce couvre partiellement l'attente."))
                .body("[0].justificationsMasquees", equalTo(false));
    }

    @Test
    void lesPistesDAmeliorationRestentVisiblesAuCollaborateur() {
        // Elles disent ce qu'il faut faire, et non pourquoi un jugement a
        // été rendu : c'est de l'opérationnel, pas une justification
        // interne.
        UUID critereId = UUID.fromString(mission().critereId());
        poserEvaluationAvecPistes(critereId);

        given().header("Authorization", "Bearer " + jetonAvecRole(mission(), "COLLABORATEUR"))
                .when().get(urlEvaluations(mission()))
                .then().statusCode(200)
                .body("find { it.pistesAmelioration != null }.pistesAmelioration",
                        equalTo("Dater et faire valider le code de conduite."));
    }

    @Transactional
    void poserEvaluationAvecPistes(UUID auditCritereId) {
        Evaluation evaluation = new Evaluation(
                auditCritereRepository.findById(auditCritereId), new BigDecimal("0.4000"), (short) 2);
        evaluation.setSource(SourceEvaluation.IA);
        evaluation.setStatut(StatutEvaluation.EN_REVUE);
        evaluation.setContratVersion("2.0");
        evaluation.setJustification("Justification interne, réservée.");
        evaluation.setRecommandationNecessaire(true);
        evaluation.setPistesAmelioration("Dater et faire valider le code de conduite.");
        evaluationRepository.persistAndFlush(evaluation);
    }

    private String urlEvaluations(Mission m) {
        return "/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId()
                + "/criteres/" + m.critereId() + "/evaluations";
    }

    // === Isolation multi-tenant / IDOR =====================================

    @Test
    void uneAutreEntrepriseNAtteintPasLeDetailMemeAvecLUuidExact() {
        UUID evaluationId = poserEvaluationDetaillee(UUID.fromString(mission().critereId()));

        // Par l'URL de la victime : refusé avant d'atteindre l'évaluation.
        given().header("Authorization", "Bearer " + autre().token())
                .when().get(urlDetail(mission(), evaluationId))
                .then().statusCode(403);

        // Par sa propre URL : l'évaluation n'existe pas de son côté.
        given().header("Authorization", "Bearer " + autre().token())
                .when().get(urlDetail(autre(), evaluationId))
                .then().statusCode(404);
    }

    @Test
    void uneEvaluationInexistanteRend404() {
        given().header("Authorization", "Bearer " + jetonAvecRole(mission(), "SUPER_ADMIN"))
                .when().get(urlDetail(mission(), UUID.randomUUID()))
                .then().statusCode(404);
    }

    @Test
    void uneEvaluationDUnAutreCritereNEstPasAtteignableParCeChemin() {
        UUID evaluationId = poserEvaluationDetaillee(UUID.fromString(mission().critereId()));

        String autreCritereId = given()
                .header("Authorization", "Bearer " + mission().token())
                .when().get("/api/v1/entreprises/" + mission().entrepriseId()
                        + "/audits/" + mission().auditId() + "/criteres")
                .then().statusCode(200).extract().path("[1].id");

        given().header("Authorization", "Bearer " + jetonAvecRole(mission(), "SUPER_ADMIN"))
                .when().get("/api/v1/entreprises/" + mission().entrepriseId()
                        + "/audits/" + mission().auditId()
                        + "/criteres/" + autreCritereId
                        + "/evaluations/" + evaluationId + "/detail")
                .then().statusCode(404);
    }

    @Test
    void leDetailNeMelangeJamaisDeuxEvaluations() {
        // Deux évaluations détaillées sur le même critère : chacune ne doit
        // rendre que son propre détail. Un filtre défaillant les additionnerait.
        UUID premiere = poserEvaluationDetaillee(UUID.fromString(mission().critereId()));
        UUID seconde = poserEvaluationDetaillee(UUID.fromString(mission().critereId()));
        String jeton = jetonAvecRole(mission(), "SUPER_ADMIN");

        given().header("Authorization", "Bearer " + jeton)
                .when().get(urlDetail(mission(), premiere))
                .then().statusCode(200)
                .body("evaluationId", equalTo(premiere.toString()))
                .body("preuves", hasSize(1))
                .body("constats", hasSize(1))
                .body("constatsDocumentaires", hasSize(1));

        given().header("Authorization", "Bearer " + jeton)
                .when().get(urlDetail(mission(), seconde))
                .then().statusCode(200)
                .body("evaluationId", equalTo(seconde.toString()))
                .body("preuves", hasSize(1));
    }

    // === Lecture seule =====================================================

    @Test
    void laRessourceDeDetailNAccepteAucuneMutation() {
        UUID evaluationId = poserEvaluationDetaillee(UUID.fromString(mission().critereId()));
        String jeton = jetonAvecRole(mission(), "SUPER_ADMIN");
        String url = urlDetail(mission(), evaluationId);

        // 405 : la route existe en GET seulement. Aucun POST, PUT, PATCH ni
        // DELETE n'a été déclaré sur ces trois structures.
        given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body("{}").when().post(url).then().statusCode(405);
        given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON)
                .body("{}").when().put(url).then().statusCode(405);
        given().header("Authorization", "Bearer " + jeton)
                .when().delete(url).then().statusCode(405);
    }
}
