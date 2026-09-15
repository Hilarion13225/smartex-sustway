package com.smartexsustway.api.securite;

import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.AutorisationService;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.ws.rs.ForbiddenException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Ce que fait l'autorisation quand la mission ne porte aucune formule.
 *
 * {@code AutorisationService.exigerPermission} annonce dans sa javadoc que
 * {@code formuleCode} peut être null et qu'il est alors « traité comme le
 * plan le plus restrictif ». L'implémentation faisait l'inverse : elle
 * passait la clé nulle à {@code Map.of(...).getOrDefault(...)}, qui lève
 * NullPointerException avant même de pouvoir rendre sa valeur par défaut.
 * Le repli sur FREE ne s'appliquait donc jamais, et une mission sans
 * formule rendait 500 — un refus d'autorisation transformé en panne.
 *
 * Ces tests fixent les trois cas de la javadoc côté service, puis rejouent
 * le cas réel qui a révélé le défaut : une mission dont
 * {@code formuleAbonnement} est nul, atteinte par un endpoint qui lit cette
 * formule pour autoriser.
 *
 * Le rôle éprouvé est RESPONSABLE_ENTREPRISE, obtenu sans montage
 * particulier : RG05 rattache ainsi le créateur d'une entreprise. Un rôle
 * interne Smartex ne conviendrait pas — il court-circuite la vérification
 * de formule (voir ROLES_INTERNES_SMARTEX) et ne passerait jamais par la
 * ligne en cause.
 */
@QuarkusTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class AutorisationFormuleNulleTest {

    @Inject JwtService jwtService;
    @Inject AutorisationService autorisationService;
    @Inject AuditRepository auditRepository;

    /**
     * Permission portée par le rôle et retirée par FREE seul : elle sépare
     * FREE des formules payantes. STANDARD et AVANCEES la laissent passer.
     */
    private static final String RESTREINTE_EN_FREE = "audit:creer";

    /** Portée par le rôle, retirée par FREE et par STANDARD, laissée par AVANCEES. */
    private static final String RESTREINTE_JUSQUA_STANDARD = "bailleur:consulter";

    /** Non portée par le rôle : le refus vient du rôle, pas de la formule. */
    private static final String NON_PORTEE_PAR_LE_ROLE = "rapport:detaille";

    /** Retirée par aucun plan, FREE compris. */
    private static final String JAMAIS_RESTREINTE = "analyse:executer";

    // === Décor ==============================================================

    private record Client(UUID utilisateurId, UUID entrepriseId, String token) {
    }

    private Client client;

    /** Un responsable d'entreprise sur sa propre entreprise, créé une fois. */
    private Client client() {
        if (client == null) {
            var proprietaire = UtilisateurDeTest.creerEtConnecter(jwtService);
            String entrepriseId = creerEntreprise(proprietaire.token, "Entreprise Formule Nulle", "RCCM-FNU-");
            client = new Client(UUID.fromString(proprietaire.id), UUID.fromString(entrepriseId), proprietaire.token);
        }
        return client;
    }

    private String creerEntreprise(String token, String raisonSociale, String prefixeRccm) {
        return given()
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", raisonSociale,
                        "identifiantLegal", prefixeRccm + UUID.randomUUID(),
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201)
                .extract().path("entreprise.id");
    }

    private void exiger(String formuleCode, String permission) {
        autorisationService.exigerPermission(
                client().utilisateurId(), client().entrepriseId(), formuleCode, permission);
    }

    // === 1. Le défaut : formuleCode nul =====================================

    /**
     * Le cœur de la correction. Avant, cette ligne levait
     * NullPointerException — donc HTTP 500. Elle doit rendre un refus
     * d'autorisation ordinaire, celui du plan FREE.
     */
    @Test
    void formuleNulle_appliqueLePlanFree_etNonUneErreurServeur() {
        var refus = assertThrows(ForbiddenException.class,
                () -> exiger(null, RESTREINTE_EN_FREE),
                "Une formule nulle doit produire un refus, pas une NullPointerException");

        assertTrue(refus.getMessage().contains(RESTREINTE_EN_FREE), refus.getMessage());
    }

    /**
     * Le repli sur FREE est bien FREE, et non « tout est interdit » : une
     * permission qu'aucun plan ne retire reste accordée. Sans ce contrôle, un
     * refus global passerait pour une correction réussie.
     */
    @Test
    void formuleNulle_nInterditPasCeQueFreeAutorise() {
        assertDoesNotThrow(() -> exiger(null, JAMAIS_RESTREINTE));
    }

    // === 2. FREE explicite : comportement inchangé ==========================

    @Test
    void formuleFree_refuseCeQuElleARetire() {
        assertThrows(ForbiddenException.class, () -> exiger("FREE", RESTREINTE_EN_FREE));
    }

    @Test
    void formuleFree_seComporteExactementCommeUneFormuleNulle() {
        // La javadoc assimile les deux : ce test échouerait si la
        // normalisation repliait sur autre chose que FREE.
        assertThrows(ForbiddenException.class, () -> exiger("FREE", RESTREINTE_JUSQUA_STANDARD));
        assertThrows(ForbiddenException.class, () -> exiger(null, RESTREINTE_JUSQUA_STANDARD));
        assertDoesNotThrow(() -> exiger("FREE", JAMAIS_RESTREINTE));
        assertDoesNotThrow(() -> exiger(null, JAMAIS_RESTREINTE));
    }

    // === 3. Formules non nulles : comportement inchangé =====================

    @Test
    void formuleStandard_resteInchangee() {
        assertDoesNotThrow(() -> exiger("STANDARD", RESTREINTE_EN_FREE));
        assertThrows(ForbiddenException.class, () -> exiger("STANDARD", RESTREINTE_JUSQUA_STANDARD));
    }

    @Test
    void formuleAvancees_resteInchangee() {
        assertDoesNotThrow(() -> exiger("AVANCEES", RESTREINTE_EN_FREE));
        assertDoesNotThrow(() -> exiger("AVANCEES", RESTREINTE_JUSQUA_STANDARD));
    }

    /**
     * Un code de formule inconnu retombait déjà sur FREE, et doit continuer :
     * la normalisation ne porte que sur null.
     */
    @Test
    void formuleInconnue_retombeToujoursSurFree() {
        assertThrows(ForbiddenException.class, () -> exiger("FORMULE_QUI_NEXISTE_PAS", RESTREINTE_EN_FREE));
    }

    /**
     * Entériner une évaluation est réservé aux formules payantes (arbitrage
     * produit). Le rôle porte bien la permission depuis V72 : le refus
     * attendu en FREE vient donc de la formule, et le succès en STANDARD
     * prouve qu'il n'est pas devenu un refus de rôle.
     */
    @Test
    void validerUneEvaluation_estRetireeEnFree_maisPasAuDela() {
        assertThrows(ForbiddenException.class, () -> exiger("FREE", "evaluation:valider"));
        assertThrows(ForbiddenException.class, () -> exiger(null, "evaluation:valider"));
        assertDoesNotThrow(() -> exiger("STANDARD", "evaluation:valider"));
        assertDoesNotThrow(() -> exiger("AVANCEES", "evaluation:valider"));
    }

    /**
     * La friction que cet arbitrage crée, figée explicitement : une
     * entreprise retombée en FREE garde de quoi produire des résultats et
     * clôturer sa mission, mais plus de quoi les entériner. Si l'une de ces
     * deux permissions devait rejoindre FREE un jour, ce test doit être
     * revu en même temps — et non contourné.
     */
    @Test
    void enFree_produireEtCloturerRestentOuverts_seulEnteriner_estFerme() {
        assertDoesNotThrow(() -> exiger("FREE", "analyse:executer"));
        assertDoesNotThrow(() -> exiger("FREE", "audit:cloturer"));
        assertThrows(ForbiddenException.class, () -> exiger("FREE", "evaluation:valider"));
    }

    // === 4. Un refus reste un refus =========================================

    /**
     * Permission que le rôle ne porte pas : le refus vient du rattachement,
     * en amont de toute lecture de formule. Il doit rester un refus, quelle
     * que soit la formule — nulle comprise.
     */
    @Test
    void permissionNonPortee_resteUnRefusOrdinaire() {
        for (String formule : new String[] {null, "FREE", "STANDARD", "AVANCEES"}) {
            var refus = assertThrows(ForbiddenException.class,
                    () -> exiger(formule, NON_PORTEE_PAR_LE_ROLE),
                    "Formule " + formule);
            assertTrue(refus.getMessage().contains("Permission refusée"), refus.getMessage());
        }
    }

    // === 5. Le cas réel : une mission sans formule ===========================

    /**
     * Le scénario qui a révélé le défaut, joué par l'API.
     *
     * {@code CreationMissionService} ne pose la formule que si un abonnement
     * lui est fourni ({@code if (abonnement != null)}), et
     * {@code AuditResource.cloturer} lit ensuite cette formule pour
     * autoriser. Une mission sans formule y rendait 500.
     *
     * La mission est créée par le chemin normal puis sa formule est retirée :
     * c'est l'état à éprouver, et le produire ainsi évite de toucher
     * CreationMissionService. Par quel appel de production une mission naît
     * réellement sans abonnement — À CONFIRMER ; le défaut, lui, est
     * indépendant de cette question.
     *
     * {@code audit:cloturer} n'est retirée par aucun plan : sous FREE la
     * clôture reste ouverte, la réponse attendue est donc 200.
     */
    @Test
    void uneMissionSansFormule_neRendPlus500ALaCloture() {
        var proprietaire = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = creerEntreprise(proprietaire.token, "Entreprise Mission Sans Formule", "RCCM-MSF-");

        given().header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of("fournisseur", "PI_SPI"))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/abonnement/paiements")
                .then().statusCode(201);

        String auditId = given().header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "referentielCode", "SMARTEX_SUSTWAY",
                        "nom", "Mission sans formule",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201)
                .extract().path("id");

        QuarkusTransaction.requiringNew().run(() -> {
            Audit audit = auditRepository.findById(UUID.fromString(auditId));
            audit.setFormuleAbonnement(null);
        });

        given().header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body("{}")
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits/" + auditId + "/cloture")
                .then().statusCode(200);
    }
}
