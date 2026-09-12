package com.smartexsustway.api.resource;

import com.smartexsustway.api.conformite.NonConformiteService;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.entity.NonConforme;
import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
import com.smartexsustway.api.domain.enums.SourceEvaluation;
import com.smartexsustway.api.domain.enums.StatutEvaluation;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.EvaluationRepository;
import com.smartexsustway.api.domain.repository.NonConformeRepository;
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
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * D1 appliquée à la non-conformité.
 *
 * <p>La fuite corrigée : {@code NonConformiteService} recopiait
 * {@code evaluation.getJustification()} — le raisonnement de l'IA — dans
 * {@code non_conforme.description}, un champ que tout membre de l'entreprise
 * lit via {@code GET .../non-conformites}. Le masquage posé sur
 * {@code EvaluationDto} ne protégeait donc rien : le même texte ressortait
 * par une autre porte.
 *
 * <p>Ce qui est éprouvé ici, ce n'est pas qu'un composant React cache un
 * paragraphe. C'est le <strong>corps HTTP réel</strong>, obtenu avec un
 * jeton réel sur l'URL exacte — la seule chose qu'un client mal intentionné
 * ne peut pas contourner.
 *
 * <p>Deux temps, parce que le défaut a deux faces : la source, qui ne doit
 * plus produire de constat pollué, et l'historique, qui en porte déjà.
 */
@QuarkusTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class NonConformeRaisonnementIaTest {

    /**
     * Un texte reconnaissable, choisi pour ne ressembler à rien d'autre en
     * base : une assertion « ne contient pas » n'a de valeur que si le
     * témoin qu'elle cherche est unique.
     */
    private static final String JUSTIFICATION_IA =
            "RAISONNEMENT-IA-TEMOIN : le document produit ne porte ni date d'entrée en vigueur "
                    + "ni signature de la direction, ce qui empêche d'établir son opposabilité.";

    private static final String PISTES_IA =
            "Faire signer le document par la direction et y porter une date d'entrée en vigueur.";

    @Inject JwtService jwtService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject EvaluationRepository evaluationRepository;
    @Inject NonConformeRepository nonConformeRepository;
    @Inject NonConformiteService nonConformiteService;
    @Inject EntityManager entityManager;

    private record Mission(String entrepriseId, String auditId, String critereId, String token) {
    }

    private Mission mission;
    private Mission autre;

    private Mission mission() {
        if (mission == null) {
            mission = construireMission("Entreprise D1 Non-Conformite");
        }
        return mission;
    }

    /** Une seconde entreprise, sans aucun lien avec la première. */
    private Mission autre() {
        if (autre == null) {
            autre = construireMission("Entreprise D1 Etrangere");
        }
        return autre;
    }

    private Mission construireMission(String raisonSociale) {
        var proprietaire = UtilisateurDeTest.creerEtConnecter(jwtService);

        String entrepriseId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of("raisonSociale", raisonSociale,
                        "identifiantLegal", "RCCM-D1NC-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201).extract().path("entreprise.id");

        given().header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of("fournisseur", "PI_SPI"))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/abonnement/paiements")
                .then().statusCode(201);

        String auditId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of("referentielCode", "SMARTEX_SUSTWAY",
                        "nom", "Mission D1 non-conformite",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201).extract().path("id");

        String critereId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .when().get("/api/v1/entreprises/" + entrepriseId + "/audits/" + auditId + "/criteres")
                .then().statusCode(200).extract().path("[0].id");

        assurerCriticite(UUID.fromString(critereId));
        return new Mission(entrepriseId, auditId, critereId, proprietaire.token);
    }

    /**
     * Sans poids de criticité, le service refuse de tracer un écart plutôt
     * que d'inventer un niveau (RG37) — et le test n'aurait rien à lire.
     */
    @Transactional
    void assurerCriticite(UUID auditCritereId) {
        entityManager.createNativeQuery(
                        "UPDATE audit_critere SET criticite_id = "
                                + "(SELECT id FROM criticite ORDER BY poids DESC LIMIT 1) "
                                + "WHERE id = ?1 AND criticite_id IS NULL")
                .setParameter(1, auditCritereId)
                .executeUpdate();
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

    /** Une évaluation IA validée, non conforme, portant un raisonnement. */
    @Transactional
    UUID analyser(UUID auditCritereId, int note) {
        AuditCritere auditCritere = auditCritereRepository.findById(auditCritereId);
        BigDecimal probabilite = BigDecimal.valueOf(note)
                .divide(BigDecimal.valueOf(5), 4, RoundingMode.HALF_UP);

        Evaluation evaluation = new Evaluation(auditCritere, probabilite, (short) note);
        evaluation.setSource(SourceEvaluation.IA);
        evaluation.setStatut(StatutEvaluation.VALIDEE);
        evaluation.setJustification(JUSTIFICATION_IA);
        evaluation.setJustificationRisque("RAISONNEMENT-RISQUE-TEMOIN : exposition réputationnelle.");
        evaluation.setJustificationCouverture("RAISONNEMENT-COUVERTURE-TEMOIN : preuve partielle.");
        evaluation.setPistesAmelioration(PISTES_IA);
        evaluationRepository.persistAndFlush(evaluation);

        nonConformiteService.genererSiNecessaire(evaluation);
        entityManager.flush();
        return evaluation.getId();
    }

    @Transactional
    NonConforme couranteDe(UUID auditCritereId) {
        return nonConformeRepository.couranteParAuditCritere(auditCritereId).orElseThrow();
    }

    /**
     * Reproduit exactement une ligne telle que l'ancien service en a laissé
     * 34 en base : {@code justification} suivie des pistes.
     */
    @Transactional
    UUID poserNonConformiteHistorique(UUID auditCritereId) {
        NonConforme courante = nonConformeRepository
                .couranteParAuditCritere(auditCritereId).orElseThrow();
        // Écriture directe : l'entité n'expose aucun setter de description,
        // et il n'y a pas lieu d'en ouvrir un pour une fixture. Ce que l'on
        // reproduit ici est un état que le code ne sait plus produire.
        entityManager.createNativeQuery(
                        "UPDATE non_conforme SET description = ?2 WHERE id = ?1")
                .setParameter(1, courante.getId())
                .setParameter(2, JUSTIFICATION_IA + "\n\nPistes d'amélioration : " + PISTES_IA)
                .executeUpdate();
        entityManager.clear();
        return courante.getId();
    }

    private String urlNc(Mission m) {
        return "/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId() + "/non-conformites";
    }

    // === La source ne produit plus de constat pollué ======================

    @Test
    void uneNonConformiteNeeApresLeCorrectifNePorteAucuneJustificationIa() {
        Mission m = mission();
        analyser(UUID.fromString(m.critereId()), 2);

        NonConforme nc = couranteDe(UUID.fromString(m.critereId()));

        assertNotNull(nc.getDescription(), "le constat opérationnel reste renseigné");
        assertFalse(nc.getDescription().contains(JUSTIFICATION_IA),
                "la justification de l'IA n'a rien à faire dans le constat");
        assertTrue(nc.getDescription().contains(PISTES_IA),
                "les pistes d'amélioration restent : elles disent quoi faire");
    }

    @Test
    void aucunChampDeRaisonnementNAtteintLaDescription() {
        Mission m = mission();
        analyser(UUID.fromString(m.critereId()), 2);

        String description = couranteDe(UUID.fromString(m.critereId())).getDescription();

        // Les trois justifications que D1 réserve à l'administration, et
        // aucune ne doit transiter par la non-conformité — quel que soit le
        // chemin emprunté pour la composer.
        assertFalse(description.contains("RAISONNEMENT-IA-TEMOIN"));
        assertFalse(description.contains("RAISONNEMENT-RISQUE-TEMOIN"));
        assertFalse(description.contains("RAISONNEMENT-COUVERTURE-TEMOIN"));
    }

    @Test
    void uneAnalyseSansPisteLaisseUnConstatVidePlutotQuInvente() {
        Mission m = construireMission("Entreprise D1 Sans Piste");
        sansPistes(UUID.fromString(m.critereId()));

        NonConforme nc = couranteDe(UUID.fromString(m.critereId()));

        // Un constat fabriqué serait pire qu'un champ vide : il aurait
        // l'air d'un constat.
        assertNull(nc.getDescription());
    }

    @Transactional
    void sansPistes(UUID auditCritereId) {
        AuditCritere auditCritere = auditCritereRepository.findById(auditCritereId);
        Evaluation evaluation = new Evaluation(auditCritere, new BigDecimal("0.4000"), (short) 2);
        evaluation.setSource(SourceEvaluation.IA);
        evaluation.setStatut(StatutEvaluation.VALIDEE);
        evaluation.setJustification(JUSTIFICATION_IA);
        evaluationRepository.persistAndFlush(evaluation);
        nonConformiteService.genererSiNecessaire(evaluation);
        entityManager.flush();
    }

    // === L'historique est filtré à la lecture =============================

    @Test
    void leCollaborateurNeRecoitAucunRaisonnementIaDansLeCorpsHttp() {
        Mission m = mission();
        analyser(UUID.fromString(m.critereId()), 2);
        poserNonConformiteHistorique(UUID.fromString(m.critereId()));
        String jeton = jetonAvecRole(m, "COLLABORATEUR");

        given().header("Authorization", "Bearer " + jeton)
                .when().get(urlNc(m))
                .then().statusCode(200)
                .body("description.join(' ')", not(containsString("RAISONNEMENT-IA-TEMOIN")));
    }

    @Test
    void leCollaborateurConserveLesPistesEtLeConstatOperationnel() {
        Mission m = mission();
        analyser(UUID.fromString(m.critereId()), 2);
        UUID ncId = poserNonConformiteHistorique(UUID.fromString(m.critereId()));
        String jeton = jetonAvecRole(m, "COLLABORATEUR");

        // D1 ne ferme pas la non-conformité au collaborateur : elle lui
        // retire le raisonnement, pas son travail.
        given().header("Authorization", "Bearer " + jeton)
                .when().get(urlNc(m) + "/" + ncId)
                .then().statusCode(200)
                .body("description", containsString(PISTES_IA))
                .body("description", not(containsString("RAISONNEMENT-IA-TEMOIN")))
                .body("descriptionFiltree", equalTo(true))
                .body("niveau", not(equalTo(null)))
                .body("statut", not(equalTo(null)))
                .body("critereCode", not(equalTo(null)));
    }

    @Test
    void leResponsableRecoitLeConstatComplet() {
        Mission m = mission();
        analyser(UUID.fromString(m.critereId()), 2);
        UUID ncId = poserNonConformiteHistorique(UUID.fromString(m.critereId()));
        String jeton = jetonAvecRole(m, "RESPONSABLE_ENTREPRISE");

        given().header("Authorization", "Bearer " + jeton)
                .when().get(urlNc(m) + "/" + ncId)
                .then().statusCode(200)
                .body("description", containsString("RAISONNEMENT-IA-TEMOIN"))
                .body("descriptionFiltree", equalTo(false));
    }

    @Test
    void leSuperAdminConserveSonAccesAdministratif() {
        Mission m = mission();
        analyser(UUID.fromString(m.critereId()), 2);
        UUID ncId = poserNonConformiteHistorique(UUID.fromString(m.critereId()));

        // Le propriétaire de la mission porte un rôle à accès global.
        given().header("Authorization", "Bearer " + m.token())
                .when().get(urlNc(m) + "/" + ncId)
                .then().statusCode(200)
                .body("description", containsString("RAISONNEMENT-IA-TEMOIN"))
                .body("descriptionFiltree", equalTo(false));
    }

    @Test
    void leChangementDeStatutRenduAuCollaborateurEstAussiFiltre() {
        Mission m = mission();
        analyser(UUID.fromString(m.critereId()), 2);
        UUID ncId = poserNonConformiteHistorique(UUID.fromString(m.critereId()));
        String jeton = jetonAvecRole(m, "RESPONSABLE_ENTREPRISE");

        // Le responsable a le droit de changer le statut ET de lire le
        // raisonnement : la réponse doit rester complète pour lui. Le point
        // du test est qu'aucune des trois routes ne soit restée branchée sur
        // la fabrique non filtrée par oubli.
        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(Map.of("statut", "EN_TRAITEMENT"))
                .when().put(urlNc(m) + "/" + ncId + "/statut")
                .then().statusCode(200)
                .body("descriptionFiltree", equalTo(false));
    }

    // === Isolation multi-tenant ==========================================

    @Test
    void unCollaborateurDUneAutreEntrepriseNAccedePasAuxNonConformites() {
        Mission m = mission();
        analyser(UUID.fromString(m.critereId()), 2);
        Mission etrangere = autre();
        String intrus = jetonAvecRole(etrangere, "COLLABORATEUR");

        given().header("Authorization", "Bearer " + intrus)
                .when().get(urlNc(m))
                .then().statusCode(403);
    }

    @Test
    void uneNonConformiteDUneAutreMissionNEstPasLisibleAvecSonUuid() {
        Mission m = mission();
        analyser(UUID.fromString(m.critereId()), 2);
        UUID ncId = couranteDe(UUID.fromString(m.critereId())).getId();
        Mission etrangere = autre();

        // L'identifiant exact ne suffit pas : la résolution passe par
        // (id, audit), donc la ligne reste hors de portée.
        given().header("Authorization", "Bearer " + etrangere.token())
                .when().get(urlNc(etrangere) + "/" + ncId)
                .then().statusCode(404);
    }

    // === Le filtrage ne déborde pas ======================================

    @Test
    void unConstatSansRaisonnementEstServiIntactAuCollaborateur() {
        Mission m = construireMission("Entreprise D1 Constat Propre");
        analyser(UUID.fromString(m.critereId()), 2);
        String jeton = jetonAvecRole(m, "COLLABORATEUR");

        // Cette non-conformité est née après le correctif : sa description
        // ne contient aucune justification, donc rien n'est retiré. Le
        // filtre doit se taire, pas raboter par précaution.
        List<Boolean> filtrees = given().header("Authorization", "Bearer " + jeton)
                .when().get(urlNc(m))
                .then().statusCode(200)
                .extract().jsonPath().getList("descriptionFiltree", Boolean.class);

        assertEquals(1, filtrees.size());
        assertFalse(filtrees.get(0), "rien à retirer, donc rien n'est signalé comme retiré");
    }
}
