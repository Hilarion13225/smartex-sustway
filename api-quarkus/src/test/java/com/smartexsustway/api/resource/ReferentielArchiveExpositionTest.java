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
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * Le contenu d'un référentiel archivé sort du catalogue, sans sortir de la base.
 *
 * <p>Ce que ces tests protègent : les référentiels archivés du catalogue
 * portent des critères et des exigences dont aucune source documentaire ni
 * validation humaine n'est enregistrée. Les servir au fil du catalogue
 * revenait à présenter comme établi un contenu que personne n'a confronté à
 * un document officiel. La lecture reste ouverte au personnel interne, qui
 * doit pouvoir inspecter et corriger ce qu'il archive.
 *
 * <p>Un référentiel de test est créé puis archivé pour chaque cas :
 * SMARTEX_SUSTWAY porte toutes les missions de la suite, et le toucher ferait
 * tomber les autres classes.
 */
@QuarkusTest
class ReferentielArchiveExpositionTest {

    @Inject JwtService jwtService;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject EntityManager entityManager;

    private String jetonSuperAdmin() {
        return UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository, utilisateurEntrepriseRepository).token;
    }

    /** Un compte porteur d'un rôle client sur sa propre organisation. */
    private String jetonAvecRole(String roleCode) {
        var candidat = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = given()
                .header("Authorization", "Bearer " + candidat.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Referentiel Archive",
                        "identifiantLegal", "RCCM-ARC-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201).extract().path("entreprise.id");

        if (!"RESPONSABLE_ENTREPRISE".equals(roleCode)) {
            remplacerRole(UUID.fromString(candidat.id), UUID.fromString(entrepriseId), roleCode);
        }
        return given().contentType(ContentType.JSON)
                .body(Map.of("email", candidat.email, "motDePasse", candidat.motDePasse))
                .when().post("/api/v1/auth/connexion")
                .then().statusCode(200).extract().path("token");
    }

    @Transactional
    void remplacerRole(UUID utilisateurId, UUID entrepriseId, String roleCode) {
        entityManager.createNativeQuery(
                        "UPDATE utilisateur_entreprise SET role_id = (SELECT id FROM role WHERE code = ?3) "
                                + "WHERE utilisateur_id = ?1 AND entreprise_id = ?2")
                .setParameter(1, utilisateurId).setParameter(2, entrepriseId).setParameter(3, roleCode)
                .executeUpdate();
    }

    /** Un référentiel de test, avec un domaine et un critère, puis archivé. */
    private String creerReferentielAvecContenu(String jetonAdmin, boolean archiver) {
        String code = "TEST_ARC_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        given()
                .header("Authorization", "Bearer " + jetonAdmin)
                .contentType(ContentType.JSON)
                .body(Map.of("code", code, "nom", "Référentiel éprouvant l'archivage", "type", "SMARTEX"))
                .when().post("/api/v1/referentiels")
                .then().statusCode(201);

        given()
                .header("Authorization", "Bearer " + jetonAdmin)
                .contentType(ContentType.JSON)
                .body(Map.of("code", "DX", "nom", "Domaine éprouvé"))
                .when().post("/api/v1/referentiels/" + code + "/domaines")
                .then().statusCode(201);

        given()
                .header("Authorization", "Bearer " + jetonAdmin)
                .contentType(ContentType.JSON)
                .body(Map.of("code", "DX-01", "libelle", "Critère éprouvé"))
                .when().post("/api/v1/referentiels/" + code + "/domaines/DX/criteres")
                .then().statusCode(201);

        if (archiver) {
            poserStatut(jetonAdmin, code, "ARCHIVE");
        }
        return code;
    }

    private void poserStatut(String jetonAdmin, String code, String statut) {
        given()
                .header("Authorization", "Bearer " + jetonAdmin)
                .contentType(ContentType.JSON)
                .body(Map.of("statut", statut))
                .when().put("/api/v1/referentiels/" + code)
                .then().statusCode(200);
    }

    @Transactional
    long compterCriteres(String code) {
        return ((Number) entityManager.createNativeQuery(
                        "SELECT count(*) FROM critere c "
                                + "JOIN referentiel_version rv ON rv.id = c.referentiel_version_id "
                                + "JOIN referentiel r ON r.id = rv.referentiel_id WHERE r.code = ?1")
                .setParameter(1, code).getSingleResult()).longValue();
    }

    // === La règle ===========================================================

    /** 1. Le personnel interne continue de voir ce qu'il administre. */
    @Test
    void superAdmin_consulteLesCriteresDunReferentielArchive() {
        String jetonAdmin = jetonSuperAdmin();
        String code = creerReferentielAvecContenu(jetonAdmin, true);

        given()
                .header("Authorization", "Bearer " + jetonAdmin)
                .when().get("/api/v1/referentiels/" + code + "/criteres")
                .then().statusCode(200)
                .body("$", hasSize(1))
                .body("[0].code", equalTo("DX-01"));
    }

    /** 2. Le responsable d'entreprise ne voit plus le contenu retiré du catalogue. */
    @Test
    void responsableEntreprise_surReferentielArchive_estRefuse() {
        String code = creerReferentielAvecContenu(jetonSuperAdmin(), true);

        given()
                .header("Authorization", "Bearer " + jetonAvecRole("RESPONSABLE_ENTREPRISE"))
                .when().get("/api/v1/referentiels/" + code + "/criteres")
                .then().statusCode(403);
    }

    /** 3. Le collaborateur non plus. */
    @Test
    void collaborateur_surReferentielArchive_estRefuse() {
        String code = creerReferentielAvecContenu(jetonSuperAdmin(), true);

        given()
                .header("Authorization", "Bearer " + jetonAvecRole("COLLABORATEUR"))
                .when().get("/api/v1/referentiels/" + code + "/criteres")
                .then().statusCode(403);
    }

    /**
     * 4. Un référentiel actif garde son comportement : la restriction vise un
     * statut, pas l'endpoint. Sans ce contrôle, une fermeture générale
     * passerait pour une correction réussie.
     */
    @Test
    void referentielActif_resteOuvertATous() {
        String code = creerReferentielAvecContenu(jetonSuperAdmin(), false);

        for (String role : new String[] {"RESPONSABLE_ENTREPRISE", "COLLABORATEUR"}) {
            given()
                    .header("Authorization", "Bearer " + jetonAvecRole(role))
                    .when().get("/api/v1/referentiels/" + code + "/criteres")
                    .then().statusCode(200).body("$", hasSize(1));
        }
    }

    /**
     * 5. La consultation historique passe par un autre endpoint — celui de la
     * mission, qui lit {@code audit_critere} et non le catalogue. Archiver le
     * référentiel ne doit pas rendre une mission illisible à son propriétaire.
     */
    @Test
    void missionHistorique_resteLisible_memeApresArchivageDuReferentiel() {
        var proprietaire = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of("raisonSociale", "Entreprise Mission Archive",
                        "identifiantLegal", "RCCM-ARCM-" + UUID.randomUUID(),
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
                        "nom", "Mission née avant l'archivage",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201).extract().path("id");

        String jetonAdmin = jetonSuperAdmin();
        poserStatut(jetonAdmin, "SMARTEX_SUSTWAY", "ARCHIVE");
        try {
            given()
                    .header("Authorization", "Bearer " + proprietaire.token)
                    .when().get("/api/v1/entreprises/" + entrepriseId + "/audits/" + auditId + "/criteres")
                    .then().statusCode(200).body("$", hasSize(92));
        } finally {
            // Toutes les autres classes de la suite s'appuient sur ce référentiel.
            poserStatut(jetonAdmin, "SMARTEX_SUSTWAY", "ACTIF");
        }
    }

    /** 6. Refuser la lecture ne supprime rien : le contenu reste en base. */
    @Test
    void leRefus_neSupprimeAucuneDonnee() {
        String jetonAdmin = jetonSuperAdmin();
        String code = creerReferentielAvecContenu(jetonAdmin, false);
        long avant = compterCriteres(code);

        poserStatut(jetonAdmin, code, "ARCHIVE");
        given()
                .header("Authorization", "Bearer " + jetonAvecRole("COLLABORATEUR"))
                .when().get("/api/v1/referentiels/" + code + "/criteres")
                .then().statusCode(403);

        assertEquals(avant, compterCriteres(code), "L'archivage ne doit rien supprimer");
        assertEquals(1L, compterCriteres(code));
    }

    /** 7. Le refus dit ce qu'il refuse, sans exposer de raisonnement IA. */
    @Test
    void leRefus_nExposeAucunRaisonnementIa() {
        String code = creerReferentielAvecContenu(jetonSuperAdmin(), true);

        String message = given()
                .header("Authorization", "Bearer " + jetonAvecRole("COLLABORATEUR"))
                .when().get("/api/v1/referentiels/" + code + "/criteres")
                .then().statusCode(403).extract().path("message");

        for (String interdit : new String[] {
                "justification", "raisonnement", "prompt", "responseId", "servedModel", "texte_source"}) {
            assertFalse(message.contains(interdit), "Le refus expose « " + interdit + " » : " + message);
        }
    }

    /**
     * 8. La restriction porte sur le statut du référentiel, pas sur
     * l'organisation du lecteur : deux comptes de deux organisations
     * différentes obtiennent la même réponse. L'isolation multi-tenant, elle,
     * est éprouvée là où elle s'applique — sur les données d'entreprise, pas
     * sur le catalogue, qui est commun.
     */
    @Test
    void laRestriction_estIdentiquePourToutesLesOrganisations() {
        String code = creerReferentielAvecContenu(jetonSuperAdmin(), true);

        for (int i = 0; i < 2; i++) {
            given()
                    .header("Authorization", "Bearer " + jetonAvecRole("RESPONSABLE_ENTREPRISE"))
                    .when().get("/api/v1/referentiels/" + code + "/criteres")
                    .then().statusCode(403);
        }
    }

    /** Sans jeton, le refus reste celui de l'authentification. */
    @Test
    void sansJeton_resteUn401() {
        String code = creerReferentielAvecContenu(jetonSuperAdmin(), true);

        given().when().get("/api/v1/referentiels/" + code + "/criteres").then().statusCode(401);
    }
}
