package com.smartexsustway.api.referentiel;

import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.RoleRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.ia.ExtractionReferentielResponseDto;
import com.smartexsustway.api.ia.ReferentielImportClient;
import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Rejet d'une proposition, validation en lot, hiérarchie et traçabilité.
 *
 * Ce que ces tests établissent : écarter une proposition la conserve tout en
 * la sortant de l'attente ; le lot est atomique et borné par la version ; le
 * brouillon rendu permet de reconstruire l'arborescence en un appel ; et la
 * source mesurée à l'extraction survit à la décision.
 *
 * La barrière de publication reste tenue par la base, pas par le code : les
 * combinaisons y sont éprouvées en SQL direct, exactement comme le ferait un
 * script d'exploitation.
 */
@QuarkusTest
class RejetEtLotImporteTest {

    private static final String IMPORTS = "/api/v1/referentiels/imports";
    private static final String EXIGENCES = "/api/v1/referentiels/exigences";
    private static final String PREUVES = "/api/v1/referentiels/preuves-attendues";
    private static final String REGLES = "/api/v1/referentiels/regles";

    @Inject JwtService jwtService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject EntityManager entityManager;

    @InjectMock
    @RestClient
    ReferentielImportClient client;

    // === Fixtures ==========================================================

    private UtilisateurDeTest superAdmin() {
        return UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository,
                utilisateurEntrepriseRepository);
    }

    private String jetonSuperAdmin() {
        return superAdmin().token;
    }

    private record Brouillon(String versionId, String exigenceId, String preuveId,
                             String regleId, String importId) {
    }

    private Brouillon brouillonImporte(String jeton) {
        String importId = given().header("Authorization", "Bearer " + jeton)
                .multiPart("fichier", "grille-" + UUID.randomUUID() + ".json",
                        "{\"domaines\":[]}".getBytes(StandardCharsets.UTF_8), "application/json")
                .when().post(IMPORTS)
                .then().statusCode(201).extract().path("id");

        when(client.extraire(any())).thenReturn(proposition(UUID.fromString(importId)));

        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(Map.of("codeReferentiel", "REJ_" + UUID.randomUUID().toString().substring(0, 8),
                        "nomReferentiel", "Référentiel à relire", "typeReferentiel", "SMARTEX"))
                .when().post(IMPORTS + "/" + importId + "/analyse")
                .then().statusCode(202);

        attendreBrouillon(jeton, importId);

        String versionId = given().header("Authorization", "Bearer " + jeton)
                .when().get(IMPORTS + "/" + importId + "/brouillon")
                .then().statusCode(200).extract().path("versionId");

        return new Brouillon(versionId,
                id("SELECT id FROM exigence WHERE referentiel_version_id = '" + versionId + "'"),
                id("SELECT id FROM preuve_attendue WHERE referentiel_version_id = '" + versionId + "'"),
                id("SELECT id FROM regle_analyse WHERE referentiel_version_id = '" + versionId + "'"),
                importId);
    }

    /** Une proposition complète, avec sa source telle que le service d'agents la mesure. */
    private static ExtractionReferentielResponseDto proposition(UUID importId) {
        var preuve = new ExtractionReferentielResponseDto.PreuveAttendueDto(
                Map.of("type", "PDF", "page", 17), "Extrait page 17", 0.82,
                "PROCEDURE", "Procédure de gestion des déchets", "Datée et signée", true, 1);
        var exigence = new ExtractionReferentielResponseDto.ExigenceDto(
                Map.of("type", "PDF", "page", 12), "Extrait page 12", 0.91,
                "D1-01-E1", "Disposer d'une procédure",
                "L'organisation dispose d'une procédure écrite.", 1, List.of(preuve));
        var regle = new ExtractionReferentielResponseDto.RegleDto(
                null, null, null,
                "D1-01-R1", "SIGNATURE", "La procédure doit être signée", "ELEVEE",
                "D1-01-E1", "Procédure de gestion des déchets", Map.of());
        var critere = new ExtractionReferentielResponseDto.CritereDto(
                null, null, null,
                "D1-01", "Gestion des déchets", null, "D1-SD1", "GENERALE", "ELEVEE", 1.0, 1,
                List.of(), List.of(exigence), List.of(regle));
        var sousDomaine = new ExtractionReferentielResponseDto.SousDomaineDto(
                "D1-SD1", "Déchets et effluents", null, 1);
        var domaine = new ExtractionReferentielResponseDto.DomaineDto(
                "D1", "Environnement", null, 1, List.of(sousDomaine), List.of(critere));
        return new ExtractionReferentielResponseDto(importId,
                new ExtractionReferentielResponseDto.BrouillonDto(null, List.of(domaine)),
                Map.of("lots", 1, "doublons", List.of(Map.of(
                        "type", "CRITERE", "code", "D1-02", "domaine_code", "D1",
                        "libelle", "Critère vu deux fois"))));
    }

    private void attendreBrouillon(String jeton, String importId) {
        for (int essai = 0; essai < 100; essai++) {
            String statut = given().header("Authorization", "Bearer " + jeton)
                    .when().get(IMPORTS + "/" + importId)
                    .then().statusCode(200).extract().path("statut");
            if (!"ANALYSE_EN_COURS".equals(statut)) {
                assertEquals("BROUILLON_GENERE", statut, "L'import devait produire un brouillon");
                return;
            }
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException(e);
            }
        }
        throw new AssertionError("L'import " + importId + " est resté en analyse");
    }

    private String id(String sql) {
        entityManager.clear();
        return entityManager.createNativeQuery(sql).getSingleResult().toString();
    }

    private Object valeur(String sql) {
        entityManager.clear();
        return entityManager.createNativeQuery(sql).getSingleResult();
    }

    private long compter(String sql) {
        entityManager.clear();
        return ((Number) entityManager.createNativeQuery(sql).getSingleResult()).longValue();
    }

    private io.restassured.response.ValidatableResponse agir(String jeton, String base, String id,
                                                             String action, Map<String, Object> corps) {
        var requete = given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON);
        if (corps != null) {
            requete = requete.body(corps);
        }
        return requete.when().post(base + "/" + id + "/" + action).then();
    }

    // === 1. Modèle de rejet ================================================

    @Test
    void rejeterUneExigence_laConserveEnLaSortantDeLAttente() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        agir(jeton, EXIGENCES, b.exigenceId(), "rejet", Map.of("motif", "Hors du périmètre audité"))
                .statusCode(200)
                .body("provenance.decision", equalTo("REJETEE"))
                .body("provenance.rejetee", equalTo(true))
                .body("provenance.rejeteePar", notNullValue())
                .body("provenance.rejeteeLe", notNullValue())
                .body("provenance.motifRejet", equalTo("Hors du périmètre audité"))
                // La proposition n'a pas été reprise : personne n'en répond.
                .body("provenance.origine", equalTo("IMPORT_IA"))
                .body("provenance.origineInitiale", equalTo("IMPORT_IA"))
                .body("provenance.validee", equalTo(false));

        // La ligne subsiste : supprimer effacerait la trace qu'une machine
        // l'avait proposée.
        assertEquals(1, compter("SELECT count(*) FROM exigence WHERE id = '" + b.exigenceId() + "'"));
    }

    @Test
    void leMotif_resteFacultatif() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        agir(jeton, PREUVES, b.preuveId(), "rejet", null)
                .statusCode(200)
                .body("provenance.decision", equalTo("REJETEE"))
                .body("provenance.motifRejet", nullValue());
    }

    @Test
    void unMotifVide_neVautPasMotif() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        // Une chaîne blanche ne dit rien tout en occupant la place d'une
        // explication ; la base refuse d'ailleurs un motif sans rejet.
        agir(jeton, REGLES, b.regleId(), "rejet", Map.of("motif", "   "))
                .statusCode(200)
                .body("provenance.motifRejet", nullValue());
    }

    @Test
    void lesTroisNatures_seRejettent() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        agir(jeton, EXIGENCES, b.exigenceId(), "rejet", null).statusCode(200);
        agir(jeton, PREUVES, b.preuveId(), "rejet", null).statusCode(200);
        agir(jeton, REGLES, b.regleId(), "rejet", null).statusCode(200);

        for (String table : List.of("exigence", "preuve_attendue", "regle_analyse")) {
            assertEquals(1, compter("SELECT count(*) FROM " + table + " WHERE referentiel_version_id = '"
                    + b.versionId() + "' AND rejetee_par IS NOT NULL"));
        }
    }

    @Test
    void leRejet_estRejouableSansEffet() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        agir(jeton, EXIGENCES, b.exigenceId(), "rejet", Map.of("motif", "Premier motif")).statusCode(200);
        Object premiere = valeur("SELECT rejetee_le FROM exigence WHERE id = '" + b.exigenceId() + "'");

        agir(jeton, EXIGENCES, b.exigenceId(), "rejet", Map.of("motif", "Motif réécrit"))
                .statusCode(200)
                .body("provenance.rejetee", equalTo(true));

        assertEquals(premiere, valeur("SELECT rejetee_le FROM exigence WHERE id = '"
                + b.exigenceId() + "'"), "Un second rejet ne doit pas déplacer la date");
        assertEquals("Premier motif", valeur("SELECT motif_rejet FROM exigence WHERE id = '"
                + b.exigenceId() + "'"), "Ni réécrire le motif d'origine");
        assertEquals(1, compter("SELECT count(*) FROM audit_log WHERE action = 'EXIGENCE_IMPORTEE_REJETEE' "
                + "AND entite_id = '" + b.exigenceId() + "'"));
    }

    @Test
    void onNeRevientPasSurUneDecisionParLaPorteOpposee() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        agir(jeton, EXIGENCES, b.exigenceId(), "validation", null).statusCode(200);
        agir(jeton, EXIGENCES, b.exigenceId(), "rejet", null).statusCode(409);

        agir(jeton, PREUVES, b.preuveId(), "rejet", null).statusCode(200);
        agir(jeton, PREUVES, b.preuveId(), "validation", null).statusCode(409);
    }

    // === 2. Publication ====================================================

    @Test
    void unRejet_neBloquePlusLaPublicationMaisNeLaDebloquePasSeul() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        // Trois propositions, aucune tranchée.
        assertThrows(Exception.class, () -> publierEnBase(b.versionId()));

        // Une rejetée : deux restent à voir.
        agir(jeton, EXIGENCES, b.exigenceId(), "rejet", null).statusCode(200);
        assertThrows(Exception.class, () -> publierEnBase(b.versionId()));

        // Une validée, une rejetée : la troisième bloque toujours.
        agir(jeton, PREUVES, b.preuveId(), "validation", null).statusCode(200);
        assertThrows(Exception.class, () -> publierEnBase(b.versionId()));

        // La dernière tranchée, la barrière tombe.
        agir(jeton, REGLES, b.regleId(), "rejet", null).statusCode(200);
        publierEnBase(b.versionId());
        assertEquals("PUBLIEE", valeur("SELECT statut::text FROM referentiel_version WHERE id = '"
                + b.versionId() + "'").toString());
    }

    @Test
    void troisRejets_suffisentAPublier() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        agir(jeton, EXIGENCES, b.exigenceId(), "rejet", null).statusCode(200);
        agir(jeton, PREUVES, b.preuveId(), "rejet", null).statusCode(200);
        agir(jeton, REGLES, b.regleId(), "rejet", null).statusCode(200);

        publierEnBase(b.versionId());
        assertEquals("PUBLIEE", valeur("SELECT statut::text FROM referentiel_version WHERE id = '"
                + b.versionId() + "'").toString());
    }

    // === 3. Sécurité du rejet ==============================================

    @Test
    void leRejet_estRefuseAuxRolesDEntrepriseEtSansJeton() {
        var b = brouillonImporte(jetonSuperAdmin());

        given().contentType(ContentType.JSON)
                .when().post(EXIGENCES + "/" + b.exigenceId() + "/rejet")
                .then().statusCode(401);

        String responsable = UtilisateurDeTest.creerAvecRole(jwtService, "RESPONSABLE_ENTREPRISE",
                utilisateurRepository, entrepriseRepository, roleRepository,
                utilisateurEntrepriseRepository).token;
        agir(responsable, EXIGENCES, b.exigenceId(), "rejet", null).statusCode(403);

        String collaborateur = UtilisateurDeTest.creerAvecRole(jwtService, "COLLABORATEUR",
                utilisateurRepository, entrepriseRepository, roleRepository,
                utilisateurEntrepriseRepository).token;
        agir(collaborateur, PREUVES, b.preuveId(), "rejet", null).statusCode(403);
        agir(collaborateur, REGLES, b.regleId(), "rejet", null).statusCode(403);
    }

    @Test
    void leRejet_refuseUnElementInconnuOuDUneAutreVersion() {
        String jeton = jetonSuperAdmin();
        var premier = brouillonImporte(jeton);
        var second = brouillonImporte(jeton);

        agir(jeton, EXIGENCES, UUID.randomUUID().toString(), "rejet", null).statusCode(404);

        agir(jeton, EXIGENCES, premier.exigenceId(), "rejet",
                Map.of("referentielVersionId", second.versionId())).statusCode(409);
        assertEquals(0, compter("SELECT count(*) FROM exigence WHERE id = '"
                + premier.exigenceId() + "' AND rejetee_par IS NOT NULL"));
    }

    @Test
    void leRejet_estImpossibleSurUneVersionPubliee() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        agir(jeton, EXIGENCES, b.exigenceId(), "rejet", null).statusCode(200);
        agir(jeton, PREUVES, b.preuveId(), "rejet", null).statusCode(200);
        agir(jeton, REGLES, b.regleId(), "rejet", null).statusCode(200);
        publierEnBase(b.versionId());

        var autre = brouillonImporte(jeton);
        agir(jeton, EXIGENCES, autre.exigenceId(), "rejet", null).statusCode(200);
        // Sur la version publiée, plus rien ne bouge.
        agir(jeton, REGLES, b.regleId(), "rejet", null).statusCode(409);
    }

    @Test
    void aucunChampDeDecision_nEstAtteignableParLaModification() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(Map.of("intitule", "Réécrit",
                        "rejeteePar", UUID.randomUUID().toString(),
                        "rejeteeLe", "2026-01-01T00:00:00Z",
                        "motifRejet", "Motif glissé par un PUT"))
                .when().put(EXIGENCES + "/" + b.exigenceId())
                .then().statusCode(200)
                .body("provenance.rejetee", equalTo(false))
                .body("provenance.motifRejet", nullValue());

        assertEquals(0, compter("SELECT count(*) FROM exigence WHERE id = '"
                + b.exigenceId() + "' AND rejetee_par IS NOT NULL"));
    }

    // === 4. Validation en lot ==============================================

    @Test
    void leLot_valideTousLesElementsDesignes() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(Map.of("elements", List.of(
                        Map.of("nature", "EXIGENCE", "id", b.exigenceId()),
                        Map.of("nature", "PREUVE_ATTENDUE", "id", b.preuveId()),
                        Map.of("nature", "REGLE_ANALYSE", "id", b.regleId()))))
                .when().post(IMPORTS + "/" + b.importId() + "/validations")
                .then().statusCode(200)
                .body("traites", equalTo(3))
                .body("dejaValides", equalTo(0));

        given().header("Authorization", "Bearer " + jeton)
                .when().get(IMPORTS + "/" + b.importId() + "/brouillon")
                .then().statusCode(200)
                .body("elementsValides", equalTo(3))
                .body("publiable", equalTo(true));
    }

    @Test
    void unLotVide_estRefuse() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON).body(Map.of("elements", List.of()))
                .when().post(IMPORTS + "/" + b.importId() + "/validations")
                .then().statusCode(400);
    }

    @Test
    void unDoublonDansLeLot_estEcarteSansFaireEchouer() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        // L'écran a pu cocher deux fois : la seconde occurrence serait de
        // toute façon sans effet, la validation étant rejouable.
        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(Map.of("elements", List.of(
                        Map.of("nature", "EXIGENCE", "id", b.exigenceId()),
                        Map.of("nature", "EXIGENCE", "id", b.exigenceId()))))
                .when().post(IMPORTS + "/" + b.importId() + "/validations")
                .then().statusCode(200)
                .body("traites", equalTo(1));
    }

    @Test
    void unElementInexistantDansLeLot_annuleToutLeLot() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(Map.of("elements", List.of(
                        Map.of("nature", "EXIGENCE", "id", b.exigenceId()),
                        Map.of("nature", "REGLE_ANALYSE", "id", UUID.randomUUID().toString()))))
                .when().post(IMPORTS + "/" + b.importId() + "/validations")
                .then().statusCode(404);

        // L'exigence traitée en premier a été annulée avec le reste : une
        // validation partielle laisserait un avancement affiché sans que
        // personne sache ce qui a réellement été retenu.
        assertEquals(0, compter("SELECT count(*) FROM exigence WHERE id = '"
                + b.exigenceId() + "' AND validee_par IS NOT NULL"));
    }

    @Test
    void unElementDUnAutreBrouillon_annuleLeLot() {
        String jeton = jetonSuperAdmin();
        var cible = brouillonImporte(jeton);
        var etranger = brouillonImporte(jeton);

        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(Map.of("elements", List.of(
                        Map.of("nature", "EXIGENCE", "id", cible.exigenceId()),
                        Map.of("nature", "EXIGENCE", "id", etranger.exigenceId()))))
                .when().post(IMPORTS + "/" + cible.importId() + "/validations")
                .then().statusCode(409);

        assertEquals(0, compter("SELECT count(*) FROM exigence WHERE id IN ('"
                + cible.exigenceId() + "','" + etranger.exigenceId() + "') AND validee_par IS NOT NULL"),
                "Le bornage par la version est la garde contre l'accès indirect");
    }

    @Test
    void unElementRejete_faitEchouerLeLot() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        agir(jeton, REGLES, b.regleId(), "rejet", null).statusCode(200);

        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(Map.of("elements", List.of(
                        Map.of("nature", "EXIGENCE", "id", b.exigenceId()),
                        Map.of("nature", "REGLE_ANALYSE", "id", b.regleId()))))
                .when().post(IMPORTS + "/" + b.importId() + "/validations")
                .then().statusCode(409);

        assertEquals(0, compter("SELECT count(*) FROM exigence WHERE id = '"
                + b.exigenceId() + "' AND validee_par IS NOT NULL"));
    }

    @Test
    void unLotDejaValide_leDitSansEchouer() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);
        var corps = Map.of("elements", List.of(Map.of("nature", "EXIGENCE", "id", b.exigenceId())));

        given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON).body(corps)
                .when().post(IMPORTS + "/" + b.importId() + "/validations")
                .then().statusCode(200).body("dejaValides", equalTo(0));

        given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON).body(corps)
                .when().post(IMPORTS + "/" + b.importId() + "/validations")
                .then().statusCode(200).body("dejaValides", equalTo(1));
    }

    @Test
    void uneNatureInconnue_estRefusee() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(Map.of("elements", List.of(Map.of("nature", "DOMAINE", "id", b.exigenceId()))))
                .when().post(IMPORTS + "/" + b.importId() + "/validations")
                .then().statusCode(400);
    }

    @Test
    void leLot_estFermeAuxRolesDEntreprise() {
        var b = brouillonImporte(jetonSuperAdmin());
        String responsable = UtilisateurDeTest.creerAvecRole(jwtService, "RESPONSABLE_ENTREPRISE",
                utilisateurRepository, entrepriseRepository, roleRepository,
                utilisateurEntrepriseRepository).token;

        given().header("Authorization", "Bearer " + responsable)
                .contentType(ContentType.JSON)
                .body(Map.of("elements", List.of(Map.of("nature", "EXIGENCE", "id", b.exigenceId()))))
                .when().post(IMPORTS + "/" + b.importId() + "/validations")
                .then().statusCode(403);
    }

    @Test
    void leLot_estJournaliseEnUneEntreeAvecSonContexte() {
        var admin = superAdmin();
        var b = brouillonImporte(admin.token);

        given().header("Authorization", "Bearer " + admin.token)
                .contentType(ContentType.JSON)
                .body(Map.of("elements", List.of(
                        Map.of("nature", "EXIGENCE", "id", b.exigenceId()),
                        Map.of("nature", "PREUVE_ATTENDUE", "id", b.preuveId()))))
                .when().post(IMPORTS + "/" + b.importId() + "/validations")
                .then().statusCode(200);

        assertEquals(1, compter("SELECT count(*) FROM audit_log "
                        + "WHERE action = 'CONTENU_IMPORTE_VALIDE_EN_LOT' "
                        + "AND entite = 'referentiel_version' AND entite_id = '" + b.versionId() + "' "
                        + "AND utilisateur_id = '" + admin.id + "' "
                        + "AND (details->>'traites')::int = 2"),
                "Le lot doit laisser une entrée unique, sans multiplier les opérations HTTP");

        // Les entrées individuelles subsistent : elles disent ce qui a
        // effectivement changé, là où celle du lot dit qui a lancé quoi.
        assertEquals(2, compter("SELECT count(*) FROM audit_log WHERE action LIKE '%_IMPORTEE_VALIDEE' "
                + "AND details->>'referentiel_version_id' = '" + b.versionId() + "'"));
    }

    // === 5. Hiérarchie, source et doublons =================================

    @Test
    void leBrouillon_porteLaHierarchieCompleteDeChaqueElement() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        // Un seul appel doit suffire à bâtir l'arborescence : la reconstituer
        // autrement supposerait une requête par critère.
        given().header("Authorization", "Bearer " + jeton)
                .when().get(IMPORTS + "/" + b.importId() + "/brouillon")
                .then().statusCode(200)
                .body("elementsAValider.find { it.nature == 'EXIGENCE' }.domaineCode", equalTo("D1"))
                .body("elementsAValider.find { it.nature == 'EXIGENCE' }.domaineLibelle", equalTo("Environnement"))
                .body("elementsAValider.find { it.nature == 'EXIGENCE' }.sousDomaineCode", equalTo("D1-SD1"))
                .body("elementsAValider.find { it.nature == 'EXIGENCE' }.sousDomaineLibelle",
                        equalTo("Déchets et effluents"))
                .body("elementsAValider.find { it.nature == 'EXIGENCE' }.critereCode", equalTo("D1-01"))
                .body("elementsAValider.find { it.nature == 'EXIGENCE' }.critereLibelle",
                        equalTo("Gestion des déchets"))
                .body("elementsAValider.find { it.nature == 'EXIGENCE' }.critereId", notNullValue())
                // Les trois natures sont situées de la même façon.
                .body("elementsAValider.find { it.nature == 'PREUVE_ATTENDUE' }.critereCode", equalTo("D1-01"))
                .body("elementsAValider.find { it.nature == 'REGLE_ANALYSE' }.domaineCode", equalTo("D1"));
    }

    @Test
    void laSourceMesuree_estConserveeEtSurvitALaDecision() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        given().header("Authorization", "Bearer " + jeton)
                .when().get(IMPORTS + "/" + b.importId() + "/brouillon")
                .then().statusCode(200)
                .body("elementsAValider.find { it.nature == 'EXIGENCE' }.provenance.source.texte",
                        equalTo("Extrait page 12"))
                .body("elementsAValider.find { it.nature == 'EXIGENCE' }.provenance.source.localisation.page",
                        equalTo(12))
                .body("elementsAValider.find { it.nature == 'EXIGENCE' }.provenance.source.confiance",
                        equalTo(0.910f));

        // Comprendre d'où vient une ligne du catalogue reste utile longtemps
        // après qu'on l'a acceptée.
        agir(jeton, EXIGENCES, b.exigenceId(), "validation", null)
                .statusCode(200)
                .body("provenance.source.texte", equalTo("Extrait page 12"))
                .body("provenance.source.confiance", equalTo(0.910f));
    }

    @Test
    void uneSourceAbsente_resteAbsente() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        // La règle du décor n'a ni texte, ni localisation, ni confiance :
        // rien ne doit avoir été inventé pour combler.
        given().header("Authorization", "Bearer " + jeton)
                .when().get(IMPORTS + "/" + b.importId() + "/brouillon")
                .then().statusCode(200)
                .body("elementsAValider.find { it.nature == 'REGLE_ANALYSE' }.provenance.source",
                        nullValue());

        assertEquals(0, compter("SELECT count(*) FROM regle_analyse WHERE referentiel_version_id = '"
                        + b.versionId() + "' AND confiance IS NOT NULL"),
                "Une confiance absente ne devient jamais zéro");
    }

    @Test
    void lesDoublonsDetectes_remontentJusquAuRelecteur() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        given().header("Authorization", "Bearer " + jeton)
                .when().get(IMPORTS + "/" + b.importId() + "/brouillon")
                .then().statusCode(200)
                .body("doublonsDetectes.size()", equalTo(1))
                .body("doublonsDetectes[0].type", equalTo("CRITERE"))
                .body("doublonsDetectes[0].code", equalTo("D1-02"));
    }

    @Test
    void lesCompteurs_distinguentValidesRejetesEtRestants() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        agir(jeton, EXIGENCES, b.exigenceId(), "validation", null).statusCode(200);
        agir(jeton, PREUVES, b.preuveId(), "rejet", null).statusCode(200);

        given().header("Authorization", "Bearer " + jeton)
                .when().get(IMPORTS + "/" + b.importId() + "/brouillon")
                .then().statusCode(200)
                .body("elementsImportesTotal", equalTo(3))
                .body("elementsValides", equalTo(1))
                .body("elementsRejetes", equalTo(1))
                .body("reglesAValider", equalTo(1))
                .body("elementsAValider.size()", equalTo(1))
                .body("publiable", equalTo(false));
    }

    // === Outillage ==========================================================

    private void publierEnBase(String versionId) {
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery(
                            "UPDATE referentiel_version SET statut = 'PUBLIEE' WHERE id = '"
                                    + versionId + "'")
                    .executeUpdate();
            entityManager.flush();
        });
    }
}
