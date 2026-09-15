package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.RoleRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
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
import static org.hamcrest.Matchers.containsString;

/**
 * Un projet ne peut pas s'appuyer sur un référentiel retiré de l'offre.
 *
 * <p>Un projet crée des missions en lot : s'il acceptait ce que la création
 * unitaire refuse, il suffirait de passer par lui pour contourner la règle.
 * Les deux chemins partagent donc la même méthode —
 * {@code Referentiel.accepteDeNouveauxTravaux()} — et cette classe éprouve
 * qu'ils se comportent pareil.
 *
 * <p>{@code ProjetResource} n'avait aucun test : cette classe est volontairement
 * bornée au statut du référentiel et à ses gardes d'accès, plutôt que d'ouvrir
 * une couverture générale des projets qui dépasserait la phase 7.3.
 */
@QuarkusTest
class ProjetReferentielActifTest {

    @Inject JwtService jwtService;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;

    private String jetonSuperAdmin() {
        return UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository, utilisateurEntrepriseRepository).token;
    }

    /** Une organisation avec abonnement payé — un projet crée des missions, qui l'exigent. */
    private String creerEntrepriseAvecAbonnement() {
        var proprietaire = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Projet Statut",
                        "identifiantLegal", "RCCM-PRJ-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201).extract().path("entreprise.id");

        given().header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON).body(Map.of("fournisseur", "PI_SPI"))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/abonnement/paiements")
                .then().statusCode(201);

        return entrepriseId;
    }

    /**
     * Un référentiel dédié : changer le statut de SMARTEX_SUSTWAY ferait
     * tomber les autres classes de la suite, qui s'appuient toutes sur lui.
     */
    private String creerReferentielDeTest(String jetonAdmin) {
        String code = "TEST_PRJ_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        given()
                .header("Authorization", "Bearer " + jetonAdmin)
                .contentType(ContentType.JSON)
                .body(Map.of("code", code, "nom", "Référentiel éprouvant le statut projet", "type", "SMARTEX"))
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

    private io.restassured.response.ValidatableResponse creerProjet(String jeton, String referentielCode,
                                                                    String entrepriseId) {
        return given()
                .header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "nom", "Projet éprouvant le statut",
                        "referentielCode", referentielCode,
                        "dateDebut", LocalDate.now().toString(),
                        "entrepriseIds", List.of(entrepriseId)))
                .when().post("/api/v1/projets")
                .then();
    }

    // === La règle ===========================================================

    @Test
    void creerProjet_referentielNonActif_estRejete() {
        String jetonAdmin = jetonSuperAdmin();
        String entrepriseId = creerEntrepriseAvecAbonnement();
        String code = creerReferentielDeTest(jetonAdmin);

        for (String statut : new String[] {"INACTIF", "SUSPENDU", "ARCHIVE"}) {
            poserStatutReferentiel(jetonAdmin, code, statut);
            creerProjet(jetonAdmin, code, entrepriseId)
                    .statusCode(400)
                    .body("message", containsString("n'est plus proposé"));
        }
    }

    /**
     * Le refus vient du statut, pas du référentiel : remis actif, le même
     * référentiel franchit cette garde. Il bute alors sur l'absence de version
     * publiée — une autre règle, dont le message distinct prouve que la
     * première a bien été passée.
     */
    @Test
    void creerProjet_referentielRemisActif_franchitLaGardeDeStatut() {
        String jetonAdmin = jetonSuperAdmin();
        String entrepriseId = creerEntrepriseAvecAbonnement();
        String code = creerReferentielDeTest(jetonAdmin);

        poserStatutReferentiel(jetonAdmin, code, "ARCHIVE");
        creerProjet(jetonAdmin, code, entrepriseId)
                .statusCode(400)
                .body("message", containsString("n'est plus proposé"));

        poserStatutReferentiel(jetonAdmin, code, "ACTIF");
        creerProjet(jetonAdmin, code, entrepriseId)
                .statusCode(400)
                .body("message", containsString("aucune version publiée"));
    }

    @Test
    void creerProjet_referentielActifEtPublie_estAutorise() {
        String jetonAdmin = jetonSuperAdmin();
        String entrepriseId = creerEntrepriseAvecAbonnement();

        creerProjet(jetonAdmin, "SMARTEX_SUSTWAY", entrepriseId)
                .statusCode(201)
                .body("referentielCode", equalTo("SMARTEX_SUSTWAY"));
    }

    /**
     * Archiver retire de l'offre sans effacer ce qui existe : un projet né
     * avant l'archivage reste consultable. Le référentiel est remis actif en
     * {@code finally} — toutes les autres classes de la suite s'appuient sur
     * lui.
     */
    @Test
    void projetHistorique_surReferentielArchive_resteConsultable() {
        String jetonAdmin = jetonSuperAdmin();
        String entrepriseId = creerEntrepriseAvecAbonnement();

        String projetId = creerProjet(jetonAdmin, "SMARTEX_SUSTWAY", entrepriseId)
                .statusCode(201).extract().path("id");

        poserStatutReferentiel(jetonAdmin, "SMARTEX_SUSTWAY", "ARCHIVE");
        try {
            given()
                    .header("Authorization", "Bearer " + jetonAdmin)
                    .when().get("/api/v1/projets/" + projetId)
                    .then().statusCode(200)
                    .body("referentielCode", equalTo("SMARTEX_SUSTWAY"));
        } finally {
            poserStatutReferentiel(jetonAdmin, "SMARTEX_SUSTWAY", "ACTIF");
        }
    }

    // === Les gardes d'accès restent celles d'avant ==========================

    /** Les projets sont réservés au personnel Smartex : un compte client est refusé. */
    @Test
    void creerProjet_depuisUnCompteClient_estRefuse() {
        var client = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = creerEntrepriseAvecAbonnement();

        creerProjet(client.token, "SMARTEX_SUSTWAY", entrepriseId).statusCode(403);
    }

    @Test
    void creerProjet_sansJeton_estRefuse() {
        given()
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "nom", "Projet anonyme",
                        "referentielCode", "SMARTEX_SUSTWAY",
                        "dateDebut", LocalDate.now().toString(),
                        "entrepriseIds", List.of(UUID.randomUUID())))
                .when().post("/api/v1/projets")
                .then().statusCode(401);
    }

    /**
     * Le message de refus nomme le référentiel, rien d'autre : ni le nombre
     * d'organisations du projet, ni l'existence d'autres référentiels, ni le
     * moindre élément de raisonnement IA.
     */
    @Test
    void leRefus_neFuitAucuneInformation() {
        String jetonAdmin = jetonSuperAdmin();
        String entrepriseId = creerEntrepriseAvecAbonnement();
        String code = creerReferentielDeTest(jetonAdmin);
        poserStatutReferentiel(jetonAdmin, code, "ARCHIVE");

        String message = creerProjet(jetonAdmin, code, entrepriseId)
                .statusCode(400).extract().path("message");

        for (String interdit : new String[] {"justification", "raisonnement", "prompt", "SMARTEX_SUSTWAY", "IFC_SFI"}) {
            org.junit.jupiter.api.Assertions.assertFalse(message.contains(interdit),
                    "Le refus expose « " + interdit + " » : " + message);
        }
    }
}
