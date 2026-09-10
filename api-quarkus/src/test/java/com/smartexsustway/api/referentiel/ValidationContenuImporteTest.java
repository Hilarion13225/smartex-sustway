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
 * Validation humaine du contenu proposé par un import assisté.
 *
 * Ce que ces tests établissent tient en trois points.
 *
 * La validation est une opération métier, pas une écriture de champs : aucun
 * chemin de modification ordinaire ne permet de se déclarer validateur, et
 * `origine_initiale` ne bouge jamais — sans elle, plus personne ne pourrait
 * dire quelles lignes du catalogue ont été suggérées par une machine.
 *
 * Elle est réservée au personnel interne, et le rôle est revérifié en base :
 * un rattachement révoqué laisse le jeton valide jusqu'à son expiration.
 *
 * Elle fait tomber la barrière de publication de V57 élément par élément, et
 * seulement une fois le dernier accepté. Cette barrière reste tenue par la
 * base, pas par le code applicatif.
 */
@QuarkusTest
class ValidationContenuImporteTest {

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

    private String jetonSuperAdmin() {
        return UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository,
                utilisateurEntrepriseRepository).token;
    }

    private String jetonAvecRole(String role) {
        return UtilisateurDeTest.creerAvecRole(jwtService, role,
                utilisateurRepository, entrepriseRepository, roleRepository,
                utilisateurEntrepriseRepository).token;
    }

    /**
     * Un brouillon issu d'un import, avec une exigence, une preuve attendue et
     * une règle — les trois natures que la validation doit couvrir.
     */
    private record Brouillon(String versionId, String exigenceId, String preuveId,
                             String regleId, String importId) {
    }

    private Brouillon brouillonImporte(String jeton) {
        String importId = given().header("Authorization", "Bearer " + jeton)
                .multiPart("fichier", "grille-" + UUID.randomUUID() + ".json",
                        "{\"domaines\":[]}".getBytes(StandardCharsets.UTF_8), "application/json")
                .when().post(IMPORTS)
                .then().statusCode(201).extract().path("id");

        when(client.extraire(any())).thenReturn(propositionComplete(UUID.fromString(importId)));

        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(Map.of("codeReferentiel", "VAL_" + UUID.randomUUID().toString().substring(0, 8),
                        "nomReferentiel", "Référentiel à relire", "typeReferentiel", "SMARTEX"))
                .when().post(IMPORTS + "/" + importId + "/analyse")
                .then().statusCode(202);

        attendreBrouillon(jeton, importId);

        String versionId = given().header("Authorization", "Bearer " + jeton)
                .when().get(IMPORTS + "/" + importId + "/brouillon")
                .then().statusCode(200).extract().path("versionId");

        return new Brouillon(versionId,
                idPremier("SELECT id FROM exigence WHERE referentiel_version_id = '" + versionId + "'"),
                idPremier("SELECT id FROM preuve_attendue WHERE referentiel_version_id = '" + versionId + "'"),
                idPremier("SELECT id FROM regle_analyse WHERE referentiel_version_id = '" + versionId + "'"),
                importId);
    }

    private static ExtractionReferentielResponseDto propositionComplete(UUID importId) {
        var preuve = new ExtractionReferentielResponseDto.PreuveAttendueDto(
                "PROCEDURE", "Procédure de gestion des déchets", "Datée et signée", true, 1);
        var exigence = new ExtractionReferentielResponseDto.ExigenceDto(
                "D1-01-E1", "Disposer d'une procédure",
                "L'organisation dispose d'une procédure écrite.", 1, List.of(preuve));
        var regle = new ExtractionReferentielResponseDto.RegleDto(
                "D1-01-R1", "SIGNATURE", "La procédure doit être signée", "ELEVEE",
                "D1-01-E1", "Procédure de gestion des déchets", Map.of());
        var critere = new ExtractionReferentielResponseDto.CritereDto(
                "D1-01", "Gestion des déchets", null, null, "GENERALE", "ELEVEE", 1.0, 1,
                List.of(), List.of(exigence), List.of(regle));
        var domaine = new ExtractionReferentielResponseDto.DomaineDto(
                "D1", "Environnement", null, 1, List.of(), List.of(critere));
        return new ExtractionReferentielResponseDto(importId,
                new ExtractionReferentielResponseDto.BrouillonDto(null, List.of(domaine)),
                Map.of("lots", 1));
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

    private String idPremier(String sql) {
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

    private io.restassured.response.ValidatableResponse validerElement(String jeton, String base,
                                                                       String id, Map<String, Object> corps) {
        var requete = given().header("Authorization", "Bearer " + jeton).contentType(ContentType.JSON);
        if (corps != null) {
            requete = requete.body(corps);
        }
        return requete.when().post(base + "/" + id + "/validation").then();
    }

    // === 1. Provenance avant et après ======================================

    @Test
    void avantValidation_leContenuEstUneProposition() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        for (String table : List.of("exigence", "preuve_attendue", "regle_analyse")) {
            assertEquals("IMPORT_IA", valeur("SELECT origine::text FROM " + table
                    + " WHERE referentiel_version_id = '" + b.versionId() + "' LIMIT 1").toString());
            assertEquals("IMPORT_IA", valeur("SELECT origine_initiale::text FROM " + table
                    + " WHERE referentiel_version_id = '" + b.versionId() + "' LIMIT 1").toString());
            assertEquals(0, compter("SELECT count(*) FROM " + table
                    + " WHERE referentiel_version_id = '" + b.versionId() + "' AND validee_par IS NOT NULL"));
        }
    }

    @Test
    void apresValidation_uneExigenceDevientContenuHumainSansPerdreSaProvenance() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        validerElement(jeton, EXIGENCES, b.exigenceId(), null)
                .statusCode(200)
                .body("origine", equalTo("CONTENU_HUMAIN"))
                .body("provenance.origine", equalTo("CONTENU_HUMAIN"))
                // La trace de la machine survit à la reprise en main : sans
                // elle, l'import deviendrait invérifiable après coup.
                .body("provenance.origineInitiale", equalTo("IMPORT_IA"))
                .body("provenance.validee", equalTo(true))
                .body("provenance.valideePar", notNullValue())
                .body("provenance.valideeLe", notNullValue());

        assertEquals("CONTENU_HUMAIN", valeur("SELECT origine::text FROM exigence WHERE id = '"
                + b.exigenceId() + "'").toString());
        assertEquals("IMPORT_IA", valeur("SELECT origine_initiale::text FROM exigence WHERE id = '"
                + b.exigenceId() + "'").toString());
    }

    @Test
    void apresValidation_unePreuveAttendueEstMarqueeDeLaMemeFacon() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        validerElement(jeton, PREUVES, b.preuveId(), null)
                .statusCode(200)
                .body("provenance.origine", equalTo("CONTENU_HUMAIN"))
                .body("provenance.origineInitiale", equalTo("IMPORT_IA"))
                .body("provenance.validee", equalTo(true));
    }

    @Test
    void apresValidation_uneRegleEstMarqueeDeLaMemeFacon() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        validerElement(jeton, REGLES, b.regleId(), null)
                .statusCode(200)
                .body("provenance.origine", equalTo("CONTENU_HUMAIN"))
                .body("provenance.origineInitiale", equalTo("IMPORT_IA"))
                .body("provenance.validee", equalTo(true));
    }

    @Test
    void laValidation_estRejouableSansEffet() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        validerElement(jeton, EXIGENCES, b.exigenceId(), null).statusCode(200);
        // La date est relue en base plutôt que dans la réponse : PostgreSQL
        // stocke la microseconde là où l'instant en mémoire porte la
        // nanoseconde, et comparer les deux réponses opposerait deux précisions
        // au lieu de deux dates.
        Object premiere = valeur("SELECT validee_le FROM exigence WHERE id = '" + b.exigenceId() + "'");

        validerElement(jeton, EXIGENCES, b.exigenceId(), null)
                .statusCode(200)
                .body("provenance.validee", equalTo(true));
        Object seconde = valeur("SELECT validee_le FROM exigence WHERE id = '" + b.exigenceId() + "'");

        // Réécrire la date ferait mentir la trace sur le moment de la relecture.
        assertEquals(premiere, seconde,
                "Une seconde validation ne doit pas déplacer la date de la première");
        assertEquals(1, compter("SELECT count(*) FROM audit_log WHERE entite = 'exigence' "
                        + "AND entite_id = '" + b.exigenceId() + "' AND action = 'EXIGENCE_IMPORTEE_VALIDEE'"),
                "Le second appel ne doit pas produire une seconde entrée de journal");
    }

    @Test
    void unContenuRedigeALaMain_neSeValidePas() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);
        String critereId = idPremier("SELECT id FROM critere WHERE referentiel_version_id = '"
                + b.versionId() + "' LIMIT 1");

        // Rédigée à la main dans le même brouillon : le refus doit venir de sa
        // provenance, pas de l'immuabilité d'une version publiée.
        String exigenceHumaine = given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(Map.of("code", "MAIN-01", "intitule", "Rédigée à la main",
                        "enonce", "Cet énoncé a été écrit par une personne."))
                .when().post("/api/v1/referentiels/criteres/" + critereId + "/exigences")
                .then().statusCode(201).extract().path("id");

        validerElement(jeton, EXIGENCES, exigenceHumaine, null)
                .statusCode(409)
                .body("message", org.hamcrest.Matchers.containsString("import"));
    }

    // === 2. Sécurité ========================================================

    @Test
    void sansAuthentification_laValidationEstRefusee() {
        var b = brouillonImporte(jetonSuperAdmin());

        given().contentType(ContentType.JSON)
                .when().post(EXIGENCES + "/" + b.exigenceId() + "/validation")
                .then().statusCode(401);
    }

    @Test
    void unResponsableEntreprise_nePeutPasValider() {
        var b = brouillonImporte(jetonSuperAdmin());

        validerElement(jetonAvecRole("RESPONSABLE_ENTREPRISE"), EXIGENCES, b.exigenceId(), null)
                .statusCode(403);
    }

    @Test
    void unUtilisateurDEntrepriseOrdinaire_nePeutPasValider() {
        var b = brouillonImporte(jetonSuperAdmin());
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);

        // Le référentiel n'appartient à aucune organisation : un utilisateur
        // d'entreprise n'y écrit pas, quelle que soit la sienne.
        validerElement(utilisateur.token, EXIGENCES, b.exigenceId(), null).statusCode(403);
        validerElement(utilisateur.token, PREUVES, b.preuveId(), null).statusCode(403);
        validerElement(utilisateur.token, REGLES, b.regleId(), null).statusCode(403);
    }

    @Test
    void lesTroisEndpoints_sontFermesAuxRolesDEntreprise() {
        var b = brouillonImporte(jetonSuperAdmin());
        String jeton = jetonAvecRole("RESPONSABLE_ENTREPRISE");

        validerElement(jeton, PREUVES, b.preuveId(), null).statusCode(403);
        validerElement(jeton, REGLES, b.regleId(), null).statusCode(403);
    }

    // === 3. IDOR et cohérence de version ====================================

    @Test
    void unElementInexistant_rend404() {
        validerElement(jetonSuperAdmin(), EXIGENCES, UUID.randomUUID().toString(), null)
                .statusCode(404);
    }

    @Test
    void unElementDUneAutreVersion_estRefuse() {
        String jeton = jetonSuperAdmin();
        var premier = brouillonImporte(jeton);
        var second = brouillonImporte(jeton);

        // Le client annonce le brouillon sur lequel il croit travailler. Une
        // interface qui aurait changé de version entre l'affichage et le clic
        // validerait sinon un élément qu'elle n'a pas montré.
        validerElement(jeton, EXIGENCES, premier.exigenceId(),
                Map.of("referentielVersionId", second.versionId()))
                .statusCode(409);

        assertEquals(0, compter("SELECT count(*) FROM exigence WHERE id = '"
                        + premier.exigenceId() + "' AND validee_par IS NOT NULL"),
                "Le refus ne doit rien avoir écrit");
    }

    @Test
    void laVersionAnnonceeQuandElleEstJuste_neGenePas() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        validerElement(jeton, EXIGENCES, b.exigenceId(),
                Map.of("referentielVersionId", b.versionId()))
                .statusCode(200)
                .body("provenance.validee", equalTo(true));
    }

    @Test
    void unElementDUneVersionPubliee_neSeValidePas() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        // Tout valider puis publier : la version devient figée.
        validerElement(jeton, EXIGENCES, b.exigenceId(), null).statusCode(200);
        validerElement(jeton, PREUVES, b.preuveId(), null).statusCode(200);
        validerElement(jeton, REGLES, b.regleId(), null).statusCode(200);
        publierEnBase(b.versionId());

        // Une version publiée est immuable : revalider reviendrait à toucher un
        // référentiel sur lequel des missions s'appuient déjà.
        validerElement(jeton, EXIGENCES, b.exigenceId(), null).statusCode(409);
    }

    // === 4. Aucun contournement par la modification ordinaire ===============

    @Test
    void aucunChampDeValidation_nEstAtteignableParLaModification() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        // Le DTO de modification n'expose ni validee_par, ni validee_le, ni
        // origine_initiale. Les envoyer quand même ne doit rien produire.
        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(Map.of("intitule", "Intitulé réécrit",
                        "valideePar", UUID.randomUUID().toString(),
                        "valideeLe", "2026-01-01T00:00:00Z",
                        "origineInitiale", "CONTENU_HUMAIN",
                        "origine", "CONTENU_HUMAIN"))
                .when().put(EXIGENCES + "/" + b.exigenceId())
                .then().statusCode(200)
                .body("provenance.validee", equalTo(false))
                .body("provenance.valideePar", nullValue())
                .body("provenance.origineInitiale", equalTo("IMPORT_IA"));

        assertEquals(0, compter("SELECT count(*) FROM exigence WHERE id = '"
                        + b.exigenceId() + "' AND validee_par IS NOT NULL"),
                "Se déclarer validateur par un PUT ferait tomber la barrière de publication");
    }

    @Test
    void reecrireLEnonce_neVautPasValidation() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        // La modification fait passer un CONTENU_INITIAL en CONTENU_HUMAIN.
        // Sur une proposition de l'IA, cela ne doit pas suffire : personne n'a
        // encore déclaré en répondre.
        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body(Map.of("enonce", "Énoncé entièrement réécrit par une personne"))
                .when().put(EXIGENCES + "/" + b.exigenceId())
                .then().statusCode(200);

        assertEquals(0, compter("SELECT count(*) FROM exigence WHERE id = '"
                + b.exigenceId() + "' AND validee_par IS NOT NULL"));
    }

    // === 5. Journalisation ==================================================

    @Test
    void chaqueValidation_estJournaliseeAvecSonContexte() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        validerElement(jeton, EXIGENCES, b.exigenceId(), null).statusCode(200);
        validerElement(jeton, PREUVES, b.preuveId(), null).statusCode(200);
        validerElement(jeton, REGLES, b.regleId(), null).statusCode(200);

        for (var cas : List.of(
                List.of("EXIGENCE_IMPORTEE_VALIDEE", "exigence", b.exigenceId()),
                List.of("PREUVE_ATTENDUE_IMPORTEE_VALIDEE", "preuve_attendue", b.preuveId()),
                List.of("REGLE_ANALYSE_IMPORTEE_VALIDEE", "regle_analyse", b.regleId()))) {
            assertEquals(1, compter("SELECT count(*) FROM audit_log WHERE action = '" + cas.get(0)
                            + "' AND entite = '" + cas.get(1) + "' AND entite_id = '" + cas.get(2) + "'"),
                    "La validation de " + cas.get(1) + " doit être journalisée");
        }

        // Le contexte permet de retrouver ce qui a été validé sur un brouillon
        // donné, y compris pour un élément supprimé depuis.
        assertEquals(3, compter("SELECT count(*) FROM audit_log WHERE action LIKE '%_IMPORTEE_VALIDEE' "
                + "AND details->>'referentiel_version_id' = '" + b.versionId() + "'"));
        assertEquals(3, compter("SELECT count(*) FROM audit_log WHERE action LIKE '%_IMPORTEE_VALIDEE' "
                + "AND details->>'referentiel_code' IS NOT NULL "
                + "AND details->>'referentiel_version_id' = '" + b.versionId() + "'"));
    }

    @Test
    void leJournal_designeLUtilisateurQuiAValide() {
        var admin = UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository,
                utilisateurEntrepriseRepository);
        var b = brouillonImporte(admin.token);

        validerElement(admin.token, EXIGENCES, b.exigenceId(), null).statusCode(200);

        assertEquals(1, compter("SELECT count(*) FROM audit_log WHERE action = 'EXIGENCE_IMPORTEE_VALIDEE' "
                + "AND entite_id = '" + b.exigenceId() + "' AND utilisateur_id = '" + admin.id + "'"));
        assertEquals(admin.id, valeur("SELECT validee_par FROM exigence WHERE id = '"
                + b.exigenceId() + "'").toString());
    }

    // === 6. Publication =====================================================

    @Test
    void laBarriereDePublication_tombeElementParElement() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        // Trois éléments proposés, aucun relu.
        var refus = assertThrows(Exception.class, () -> publierEnBase(b.versionId()));
        assertTrue(deroule(refus).contains("validé"), deroule(refus));

        // Un seul relu : la barrière tient toujours.
        validerElement(jeton, EXIGENCES, b.exigenceId(), null).statusCode(200);
        refus = assertThrows(Exception.class, () -> publierEnBase(b.versionId()));
        assertTrue(deroule(refus).contains("validé"), deroule(refus));

        // Deux sur trois : elle tient encore.
        validerElement(jeton, PREUVES, b.preuveId(), null).statusCode(200);
        assertThrows(Exception.class, () -> publierEnBase(b.versionId()));

        // Le dernier accepté, elle disparaît.
        validerElement(jeton, REGLES, b.regleId(), null).statusCode(200);
        publierEnBase(b.versionId());
        assertEquals("PUBLIEE", valeur("SELECT statut::text FROM referentiel_version WHERE id = '"
                + b.versionId() + "'").toString());
    }

    @Test
    void leSuiviDuBrouillon_compteCeQuiResteEtCeQuiEstFait() {
        String jeton = jetonSuperAdmin();
        var b = brouillonImporte(jeton);

        given().header("Authorization", "Bearer " + jeton)
                .when().get(IMPORTS + "/" + b.importId() + "/brouillon")
                .then().statusCode(200)
                .body("elementsImportesTotal", equalTo(3))
                .body("elementsValides", equalTo(0))
                .body("publiable", equalTo(false));

        validerElement(jeton, EXIGENCES, b.exigenceId(), null).statusCode(200);

        given().header("Authorization", "Bearer " + jeton)
                .when().get(IMPORTS + "/" + b.importId() + "/brouillon")
                .then().statusCode(200)
                // Le total ne diminue pas quand on valide : il compte sur
                // `origine_initiale`, seule colonne qui ne bouge pas.
                .body("elementsImportesTotal", equalTo(3))
                .body("elementsValides", equalTo(1))
                .body("exigencesAValider", equalTo(0))
                .body("publiable", equalTo(false));

        validerElement(jeton, PREUVES, b.preuveId(), null).statusCode(200);
        validerElement(jeton, REGLES, b.regleId(), null).statusCode(200);

        given().header("Authorization", "Bearer " + jeton)
                .when().get(IMPORTS + "/" + b.importId() + "/brouillon")
                .then().statusCode(200)
                .body("elementsValides", equalTo(3))
                .body("publiable", equalTo(true));
    }

    // === Outillage ==========================================================

    /**
     * Publie en contournant tout le code applicatif.
     *
     * L'enjeu du test est que la garantie tienne au niveau de la base, quel
     * que soit le chemin — y compris un script d'exploitation ou un endpoint
     * ajouté plus tard.
     */
    private void publierEnBase(String versionId) {
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery(
                            "UPDATE referentiel_version SET statut = 'PUBLIEE' WHERE id = '"
                                    + versionId + "'")
                    .executeUpdate();
            entityManager.flush();
        });
    }

    private static String deroule(Throwable e) {
        var texte = new StringBuilder();
        for (Throwable courant = e; courant != null; courant = courant.getCause()) {
            texte.append(courant.getMessage()).append(' ');
        }
        return texte.toString();
    }
}
