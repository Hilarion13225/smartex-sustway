package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.entity.Entreprise;
import com.smartexsustway.api.domain.entity.Role;
import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.RoleRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.equalTo;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;

/**
 * RG10/RG11 : missions d'audit. RG20 : abonnement actif requis.
 * RG34/RG35 : le questionnaire composé dynamiquement est figé dans la
 * mission (AUDIT_CRITERE/AUDIT_QUESTION).
 */
@QuarkusTest
class AuditResourceTest {

    @Inject JwtService jwtService;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;

    private record Contexte(String token, String entrepriseId) {}

    /** Rattache un candidat déjà créé à une entreprise EXISTANTE avec le rôle donné — contournement DB, comme UtilisateurDeTest.creerAvecRole, mais ciblé sur l'entreprise du test plutôt que sur une entreprise support jetable. */
    private void rattacher(String utilisateurId, String entrepriseId, String roleCode) {
        QuarkusTransaction.requiringNew().run(() -> {
            Role role = roleRepository.parCode(roleCode).orElseThrow();
            var utilisateur = utilisateurRepository.findById(UUID.fromString(utilisateurId));
            Entreprise entreprise = entrepriseRepository.findById(UUID.fromString(entrepriseId));
            utilisateurEntrepriseRepository.persist(new UtilisateurEntreprise(utilisateur, entreprise, null, role));
        });
    }

    private String creerEntreprise(String token) {
        return given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Audit Test",
                        "identifiantLegal", "RCCM-AUD-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201)
                .extract().path("entreprise.id");
    }

    /** Crée une entreprise ET paie son abonnement — condition nécessaire pour RG20. */
    private Contexte creerEntrepriseAvecAbonnementActif() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = creerEntreprise(utilisateur.token);

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of("fournisseur", "PI_SPI"))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/abonnement/paiements")
                .then().statusCode(201);

        return new Contexte(utilisateur.token, entrepriseId);
    }

    @Test
    void creerAudit_composeEtFigeLeQuestionnaireComplet() {
        var ctx = creerEntrepriseAvecAbonnementActif();

        String auditId = given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "referentielCode", "SMARTEX_SUSTWAY",
                        "nom", "Audit RSE 2026",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits")
                .then()
                .statusCode(201)
                .body("referentielCode", equalTo("SMARTEX_SUSTWAY"))
                .body("statut", equalTo("BROUILLON"))
                .body("nombreCriteres", equalTo(92))
                .extract().path("id");

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + auditId + "/criteres")
                .then()
                .statusCode(200)
                .body("$", hasSize(92));
    }

    @Test
    void creerAudit_sansAbonnementActif_estRefuseParRG20() {
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = creerEntreprise(utilisateur.token); // pas de paiement -> EN_ATTENTE_PAIEMENT

        given()
                .header("Authorization", "Bearer " + utilisateur.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "referentielCode", "SMARTEX_SUSTWAY",
                        "nom", "Audit refusé",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then()
                .statusCode(403);
    }

    @Test
    void creerAudit_referentielInconnu_estRejete() {
        var ctx = creerEntrepriseAvecAbonnementActif();

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "referentielCode", "INEXISTANT",
                        "nom", "Audit invalide",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits")
                .then()
                .statusCode(400);
    }

    // === Un référentiel retiré de l'offre ne porte plus de mission ==========

    /**
     * Crée un référentiel de test et rend son code.
     *
     * <p>Un référentiel dédié plutôt que SMARTEX_SUSTWAY : changer le statut
     * du référentiel de production ferait tomber toutes les autres classes de
     * cette suite, et l'ordre d'exécution ne dit pas laquelle en premier.
     */
    private String creerReferentielDeTest(String jetonAdmin) {
        String code = "TEST_STATUT_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        given()
                .header("Authorization", "Bearer " + jetonAdmin)
                .contentType(ContentType.JSON)
                .body(Map.of("code", code, "nom", "Référentiel éprouvant le statut", "type", "SMARTEX"))
                .when().post("/api/v1/referentiels")
                .then().statusCode(201);
        return code;
    }

    private void poserStatutReferentiel(String jetonAdmin, String code, String statut) {
        given()
                .header("Authorization", "Bearer " + jetonAdmin)
                .contentType(ContentType.JSON)
                .body(Map.of("statut", statut))
                .when().put("/api/v1/referentiels/" + code)
                .then().statusCode(200);
    }

    private io.restassured.response.ValidatableResponse creerAuditSur(Contexte ctx, String referentielCode) {
        return given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "referentielCode", referentielCode,
                        "nom", "Mission éprouvant le statut",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits")
                .then();
    }

    /**
     * Seul ACTIF ouvre la création. Les trois autres statuts la ferment —
     * ils disent chacun à leur manière que le cadre n'est plus proposé, et
     * aucun ne mérite d'exception.
     *
     * <p>Le sélecteur React filtrait déjà sur ACTIF, mais rien n'oblige à
     * passer par lui : c'est l'appel direct qu'éprouve ce test.
     *
     * <p>Seul le code est vérifié, comme pour
     * {@link #creerAudit_referentielInconnu_estRejete()} : cette ressource
     * signale ses requêtes invalides par {@code BadRequestException}, qu'aucun
     * mapper ne traduit — la réponse n'a donc pas de corps. Le message porté
     * par l'exception reste lisible côté serveur ; l'homogénéiser avec le
     * style de {@code ProjetResource} changerait aussi la réponse du
     * référentiel inconnu, hors du périmètre de cette phase.
     */
    @Test
    void creerAudit_referentielNonActif_estRejete() {
        var ctx = creerEntrepriseAvecAbonnementActif();
        String jetonAdmin = UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository, utilisateurEntrepriseRepository).token;
        String code = creerReferentielDeTest(jetonAdmin);

        for (String statut : new String[] {"INACTIF", "SUSPENDU", "ARCHIVE"}) {
            poserStatutReferentiel(jetonAdmin, code, statut);
            creerAuditSur(ctx, code).statusCode(400);
        }
    }

    /**
     * Le pendant du précédent : la garde refuse un statut, pas un référentiel.
     * Sans ce contrôle, un refus généralisé passerait pour une correction
     * réussie.
     *
     * <p>C'est ici, et non par un aller-retour de statut, que se vérifie la
     * non-régression : les deux refus d'{@code AuditResource} ayant le même
     * code et aucun corps, rien ne les distinguerait. La discrimination fine
     * entre « plus proposé » et « aucune version publiée » est éprouvée côté
     * projets, où les messages sont lisibles
     * ({@code ProjetReferentielActifTest}).
     */
    @Test
    void creerAudit_referentielActif_resteAutorise() {
        var ctx = creerEntrepriseAvecAbonnementActif();

        creerAuditSur(ctx, "SMARTEX_SUSTWAY").statusCode(201);
    }

    /**
     * Archiver retire de l'offre ; cela ne réécrit pas l'histoire. Une mission
     * née quand le référentiel était actif reste lisible après son archivage —
     * sans quoi archiver reviendrait à effacer le travail déjà fait.
     */
    @Test
    void missionHistorique_surReferentielArchive_resteConsultable() {
        var ctx = creerEntrepriseAvecAbonnementActif();
        String auditId = creerAudit(ctx, "Mission née avant l'archivage");

        String jetonAdmin = UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository, utilisateurEntrepriseRepository).token;
        poserStatutReferentiel(jetonAdmin, "SMARTEX_SUSTWAY", "ARCHIVE");
        try {
            given()
                    .header("Authorization", "Bearer " + ctx.token())
                    .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + auditId)
                    .then().statusCode(200)
                    .body("referentielCode", equalTo("SMARTEX_SUSTWAY"));

            given()
                    .header("Authorization", "Bearer " + ctx.token())
                    .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + auditId + "/criteres")
                    .then().statusCode(200)
                    .body("$", hasSize(92));
        } finally {
            // SMARTEX_SUSTWAY porte toutes les autres missions de la suite :
            // le laisser archivé ferait échouer les classes suivantes.
            poserStatutReferentiel(jetonAdmin, "SMARTEX_SUSTWAY", "ACTIF");
        }
    }

    /** Un compte client ne peut pas changer le statut d'un référentiel : RBAC inchangé. */
    @Test
    void changerLeStatutDunReferentiel_depuisUnCompteClient_estRefuse() {
        var ctx = creerEntrepriseAvecAbonnementActif();

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("statut", "ARCHIVE"))
                .when().put("/api/v1/referentiels/SMARTEX_SUSTWAY")
                .then().statusCode(403);
    }

    @Test
    void listerAudits_retourneLesMissionsDeLEntreprise() {
        var ctx = creerEntrepriseAvecAbonnementActif();

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "referentielCode", "SMARTEX_SUSTWAY",
                        "nom", "Audit à lister",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits")
                .then().statusCode(201);

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits")
                .then()
                .statusCode(200)
                .body("$", hasSize(1))
                .body("[0].nom", equalTo("Audit à lister"));
    }

    @Test
    void score_avantToutEvaluation_estNeutreEtRepartiParDomaine() {
        var ctx = creerEntrepriseAvecAbonnementActif();

        String auditId = given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "referentielCode", "SMARTEX_SUSTWAY",
                        "nom", "Audit Score",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits")
                .then().statusCode(201)
                .extract().path("id");

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + auditId + "/score")
                .then()
                .statusCode(200)
                .body("auditId", equalTo(auditId))
                .body("scoreGlobal", equalTo(0))
                .body("nombreCriteresTotal", equalTo(92))
                .body("nombreCriteresEvalues", equalTo(0))
                .body("nombreCriteresEnRevue", equalTo(0))
                .body("nombreCriteresNonEvalues", equalTo(92))
                .body("domaines.nombreCriteresTotal.sum()", equalTo(92))
                .body("domaines.nombreCriteresEvalues", everyItem(equalTo(0)));
    }

    @Test
    void score_isolationMultiTenant_unUtilisateurNeVoitPasLeScoreDunAutre() {
        var ctxA = creerEntrepriseAvecAbonnementActif();
        String auditId = given()
                .header("Authorization", "Bearer " + ctxA.token())
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "referentielCode", "SMARTEX_SUSTWAY",
                        "nom", "Audit Score Isolé",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + ctxA.entrepriseId() + "/audits")
                .then().statusCode(201)
                .extract().path("id");

        var utilisateurB = UtilisateurDeTest.creerEtConnecter(jwtService);

        given()
                .header("Authorization", "Bearer " + utilisateurB.token)
                .when().get("/api/v1/entreprises/" + ctxA.entrepriseId() + "/audits/" + auditId + "/score")
                .then()
                .statusCode(403);
    }

    @Test
    void isolationMultiTenant_unUtilisateurNeVoitPasLesAuditsDunAutre() {
        var ctxA = creerEntrepriseAvecAbonnementActif();
        var utilisateurB = UtilisateurDeTest.creerEtConnecter(jwtService);

        given()
                .header("Authorization", "Bearer " + utilisateurB.token)
                .when().get("/api/v1/entreprises/" + ctxA.entrepriseId() + "/audits")
                .then()
                .statusCode(403);
    }

    // --- RG12 : sites couverts par la mission -------------------------------

    private String creerAudit(Contexte ctx, String nom) {
        return given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("referentielCode", "SMARTEX_SUSTWAY", "nom", nom, "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits")
                .then().statusCode(201)
                .extract().path("id");
    }

    private String creerSite(Contexte ctx, String nom) {
        return given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("paysCodeIso2", "CI", "nom", nom))
                .when().post("/api/v1/entreprises/" + ctx.entrepriseId() + "/sites")
                .then().statusCode(201)
                .extract().path("id");
    }

    @Test
    void sites_definirPuisRemplacerLePerimetre_reussit() {
        var ctx = creerEntrepriseAvecAbonnementActif();
        String auditId = creerAudit(ctx, "Audit Multi-site");
        String siteA = creerSite(ctx, "Siège");
        String siteB = creerSite(ctx, "Usine Nord");

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("siteIds", List.of(siteA, siteB)))
                .when().put("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + auditId + "/sites")
                .then()
                .statusCode(200)
                .body("$", hasSize(2));

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + auditId + "/sites")
                .then()
                .statusCode(200)
                .body("$", hasSize(2));

        // Remplacement (sémantique PUT, pas d'ajout incrémental) : un seul site désormais.
        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("siteIds", List.of(siteA)))
                .when().put("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + auditId + "/sites")
                .then()
                .statusCode(200)
                .body("$", hasSize(1))
                .body("[0].id", equalTo(siteA));
    }

    @Test
    void sites_dUneAutreEntreprise_estRejete() {
        var ctxA = creerEntrepriseAvecAbonnementActif();
        var ctxB = creerEntrepriseAvecAbonnementActif();
        String auditId = creerAudit(ctxA, "Audit A");
        String siteDeB = creerSite(ctxB, "Site étranger");

        given()
                .header("Authorization", "Bearer " + ctxA.token())
                .contentType(ContentType.JSON)
                .body(Map.of("siteIds", List.of(siteDeB)))
                .when().put("/api/v1/entreprises/" + ctxA.entrepriseId() + "/audits/" + auditId + "/sites")
                .then()
                .statusCode(400);
    }

    // --- RG06 : équipe affectée à la mission --------------------------------

    @Test
    void auditeurs_affecterUnRoleClient_estRejete() {
        var ctx = creerEntrepriseAvecAbonnementActif();
        String auditId = creerAudit(ctx, "Audit Équipe");
        var interne = UtilisateurDeTest.creerEtConnecter(jwtService);
        rattacher(interne.id, ctx.entrepriseId(), "SUPER_ADMIN");
        // Rôle client actif depuis V44 : VISITEUR est désactivé et la base
        // refuse désormais de l'attribuer.
        var visiteur = UtilisateurDeTest.creerEtConnecter(jwtService);
        rattacher(visiteur.id, ctx.entrepriseId(), "COLLABORATEUR");

        given()
                .header("Authorization", "Bearer " + interne.token)
                .contentType(ContentType.JSON)
                .body(Map.of("roleMission", "OBSERVATEUR"))
                .when().put("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + auditId + "/auditeurs/" + visiteur.id)
                .then()
                .statusCode(400);
    }

    /**
     * Le client ne choisit plus son auditeur : l'affectation est réservée au
     * personnel interne Smartex, même sur sa propre entreprise.
     */
    @Test
    void auditeurs_affecterDepuisUnCompteClient_estRefuse() {
        var ctx = creerEntrepriseAvecAbonnementActif();
        String auditId = creerAudit(ctx, "Audit Équipe 4");
        var expert = UtilisateurDeTest.creerEtConnecter(jwtService);
        rattacher(expert.id, ctx.entrepriseId(), "SUPER_ADMIN");

        given()
                .header("Authorization", "Bearer " + ctx.token())
                .contentType(ContentType.JSON)
                .body(Map.of("roleMission", "OBSERVATEUR"))
                .when().put("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + auditId + "/auditeurs/" + expert.id)
                .then()
                .statusCode(403);
    }

    @Test
    void auditeurs_affecterRetirer_staffRattache_reussit() {
        var ctx = creerEntrepriseAvecAbonnementActif();
        String auditId = creerAudit(ctx, "Audit Équipe 2");
        var expert = UtilisateurDeTest.creerEtConnecter(jwtService);
        rattacher(expert.id, ctx.entrepriseId(), "SUPER_ADMIN");

        given()
                .header("Authorization", "Bearer " + expert.token)
                .contentType(ContentType.JSON)
                .body(Map.of("roleMission", "OBSERVATEUR"))
                .when().put("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + auditId + "/auditeurs/" + expert.id)
                .then()
                .statusCode(200)
                .body("utilisateurId", equalTo(expert.id))
                .body("roleMission", equalTo("OBSERVATEUR"));

        given()
                .header("Authorization", "Bearer " + expert.token)
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + auditId + "/auditeurs")
                .then()
                .statusCode(200)
                .body("$", hasSize(1));

        given()
                .header("Authorization", "Bearer " + expert.token)
                .when().delete("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + auditId + "/auditeurs/" + expert.id)
                .then()
                .statusCode(204);

        given()
                .header("Authorization", "Bearer " + expert.token)
                .when().get("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + auditId + "/auditeurs")
                .then()
                .statusCode(200)
                .body("$", hasSize(0));
    }

    @Test
    void auditeurs_roleMissionInconnu_estRejete() {
        var ctx = creerEntrepriseAvecAbonnementActif();
        String auditId = creerAudit(ctx, "Audit Équipe 3");
        var admin = UtilisateurDeTest.creerEtConnecter(jwtService);
        rattacher(admin.id, ctx.entrepriseId(), "SUPER_ADMIN");

        given()
                .header("Authorization", "Bearer " + admin.token)
                .contentType(ContentType.JSON)
                .body(Map.of("roleMission", "INEXISTANT"))
                .when().put("/api/v1/entreprises/" + ctx.entrepriseId() + "/audits/" + auditId + "/auditeurs/" + admin.id)
                .then()
                .statusCode(400);
    }
}
