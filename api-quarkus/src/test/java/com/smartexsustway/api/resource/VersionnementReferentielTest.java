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
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

/**
 * Une version publiée du référentiel est immuable, et une mission conserve
 * la version qu'elle a auditée.
 *
 * C'est la garantie qui rend un résultat d'audit opposable : sans elle,
 * modifier le libellé d'un critère changeait rétroactivement ce qu'affichait
 * une mission déjà clôturée, sans trace ni moyen de le détecter.
 *
 * Ces tests attaquent l'API, mais l'immuabilité ne repose pas sur elle : les
 * déclencheurs de V49 refuseraient la même écriture depuis une console SQL.
 * Le test {@link #immuabiliteTenueParLaBaseEtPasSeulementParLApi()} l'éprouve
 * en contournant délibérément le service.
 */
@QuarkusTest
class VersionnementReferentielTest {

    @Inject JwtService jwtService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject EntityManager entityManager;

    private static final String LIBELLE_INITIAL = "Politique ESG formalisée";
    private static final String LIBELLE_CORRIGE = "Politique ESG formalisée et diffusée";

    /** Référentiel de test, sa version de travail et son unique critère. */
    private record Cadre(String token, String code, String critereId) {
    }

    // --- Construction ---------------------------------------------------

    private String jetonSuperAdmin() {
        return UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository,
                utilisateurEntrepriseRepository).token;
    }

    /**
     * Référentiel neuf portant un domaine et un critère, encore en brouillon.
     *
     * Créer un référentiel ouvre sa version 1.0 en brouillon : sans version,
     * rien ne pourrait y être ajouté.
     */
    private Cadre cadreEnBrouillon() {
        String token = jetonSuperAdmin();
        String code = "TEST_VER_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        given().header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of("code", code, "nom", "Référentiel de versionnement", "type", "SMARTEX"))
                .when().post("/api/v1/referentiels")
                .then().statusCode(201);

        given().header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of("code", "DOM1", "nom", "Gouvernance"))
                .when().post("/api/v1/referentiels/" + code + "/domaines")
                .then().statusCode(201);

        String critereId = given().header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of("code", "DOM1-01", "libelle", LIBELLE_INITIAL))
                .when().post("/api/v1/referentiels/" + code + "/domaines/DOM1/criteres")
                .then().statusCode(201)
                .extract().path("id");

        return new Cadre(token, code, critereId);
    }

    private void publier(Cadre cadre, String numero) {
        given().header("Authorization", "Bearer " + cadre.token())
                .when().post("/api/v1/referentiels/" + cadre.code() + "/versions/" + numero + "/publication")
                .then().statusCode(200)
                .body("statut", equalTo("PUBLIEE"));
    }

    private io.restassured.response.ValidatableResponse modifierLibelle(Cadre cadre, String critereId,
                                                                       String libelle) {
        return given().header("Authorization", "Bearer " + cadre.token())
                .contentType(ContentType.JSON)
                .body(Map.of("libelle", libelle))
                .when().put("/api/v1/referentiels/criteres/" + critereId)
                .then();
    }

    private List<String> librelesDuCatalogue(Cadre cadre) {
        return given().header("Authorization", "Bearer " + cadre.token())
                .when().get("/api/v1/referentiels/" + cadre.code() + "/criteres")
                .then().statusCode(200)
                .extract().path("libelle");
    }

    // === A ==================================================================

    /** Une version brouillon s'édite : c'est le seul état dans lequel on travaille. */
    @Test
    void a_versionBrouillon_estModifiable() {
        Cadre cadre = cadreEnBrouillon();

        modifierLibelle(cadre, cadre.critereId(), LIBELLE_CORRIGE)
                .statusCode(200)
                .body("libelle", equalTo(LIBELLE_CORRIGE));

        given().header("Authorization", "Bearer " + cadre.token())
                .when().get("/api/v1/referentiels/" + cadre.code() + "/versions")
                .then().statusCode(200)
                .body("[0].statut", equalTo("BROUILLON"))
                .body("[0].modifiable", equalTo(true));
    }

    // === B ==================================================================

    /**
     * Une fois publiée, la même version refuse toute écriture : modification
     * d'un critère, mais aussi ajout d'un domaine ou d'un critère. Publier
     * ferme la porte, il ne suffit pas de la fermer à moitié.
     */
    @Test
    void b_versionPubliee_nEstPlusModifiable() {
        Cadre cadre = cadreEnBrouillon();
        publier(cadre, "1.0");

        modifierLibelle(cadre, cadre.critereId(), LIBELLE_CORRIGE).statusCode(409);

        given().header("Authorization", "Bearer " + cadre.token())
                .contentType(ContentType.JSON)
                .body(Map.of("code", "DOM2", "nom", "Domaine ajouté après publication"))
                .when().post("/api/v1/referentiels/" + cadre.code() + "/domaines")
                .then().statusCode(409);

        given().header("Authorization", "Bearer " + cadre.token())
                .contentType(ContentType.JSON)
                .body(Map.of("code", "DOM1-02", "libelle", "Critère ajouté après publication"))
                .when().post("/api/v1/referentiels/" + cadre.code() + "/domaines/DOM1/criteres")
                .then().statusCode(409);

        // Le libellé d'origine n'a pas bougé.
        given().header("Authorization", "Bearer " + cadre.token())
                .when().get("/api/v1/referentiels/" + cadre.code() + "/criteres")
                .then().statusCode(200)
                .body("libelle", hasItem(LIBELLE_INITIAL));
    }

    // === C ==================================================================

    /** Une mission porte la version qu'elle a auditée, et le dit. */
    @Test
    void c_missionConserveSaVersion() {
        Cadre cadre = cadreEnBrouillon();
        publier(cadre, "1.0");

        var mission = creerMission(cadre.code(), "Mission version 1.0");

        given().header("Authorization", "Bearer " + mission.token())
                .when().get("/api/v1/entreprises/" + mission.entrepriseId() + "/audits/" + mission.auditId())
                .then().statusCode(200)
                .body("referentielVersion", equalTo("1.0"))
                .body("referentielCode", equalTo(cadre.code()));
    }

    // === D ==================================================================

    /**
     * Le cœur de la phase. Une mission auditée sur la version 1.0 continue de
     * lire la version 1.0 après qu'une version 2.0 a modifié le même critère —
     * et une mission créée après la publication lit bien la 2.0.
     */
    @Test
    void d_publierUneVersionSuivante_neTouchePasLaMissionHistorique() {
        Cadre cadre = cadreEnBrouillon();
        publier(cadre, "1.0");

        var missionHistorique = creerMission(cadre.code(), "Mission antérieure");
        assertEquals(LIBELLE_INITIAL, libelleDuPremierCritere(missionHistorique),
                "La mission doit d'abord lire le libellé de la version 1.0.");

        // Version corrective : le brouillon reprend le contenu de la 1.0,
        // on y corrige le libellé, puis on publie.
        given().header("Authorization", "Bearer " + cadre.token())
                .contentType(ContentType.JSON)
                .body(Map.of("numero", "2.0", "notes", "Précision du libellé"))
                .when().post("/api/v1/referentiels/" + cadre.code() + "/versions")
                .then().statusCode(201);

        String critereEnBrouillon = idDuPremierCritereDuCatalogue(cadre);
        assertNotEquals(cadre.critereId(), critereEnBrouillon,
                "Le brouillon doit porter sa propre copie du critère, pas celle de la version publiée.");
        modifierLibelle(cadre, critereEnBrouillon, LIBELLE_CORRIGE).statusCode(200);
        publier(cadre, "2.0");

        // La mission historique n'a pas bougé.
        assertEquals(LIBELLE_INITIAL, libelleDuPremierCritere(missionHistorique),
                "Publier une version suivante ne doit rien changer à une mission déjà créée.");
        given().header("Authorization", "Bearer " + missionHistorique.token())
                .when().get("/api/v1/entreprises/" + missionHistorique.entrepriseId()
                        + "/audits/" + missionHistorique.auditId())
                .then().statusCode(200)
                .body("referentielVersion", equalTo("1.0"));

        // Une mission créée maintenant reçoit la 2.0.
        var missionRecente = creerMission(cadre.code(), "Mission postérieure");
        assertEquals(LIBELLE_CORRIGE, libelleDuPremierCritere(missionRecente),
                "Une mission créée après la publication doit auditer la version 2.0.");
        given().header("Authorization", "Bearer " + missionRecente.token())
                .when().get("/api/v1/entreprises/" + missionRecente.entrepriseId()
                        + "/audits/" + missionRecente.auditId())
                .then().statusCode(200)
                .body("referentielVersion", equalTo("2.0"));
    }

    // === E ==================================================================

    /**
     * Une mission sur le référentiel semé reste pleinement exploitable :
     * questionnaire complet, critères lisibles, version rattachée.
     *
     * La version attendue est lue en base plutôt qu'écrite en dur : le
     * catalogue publie de nouvelles versions au fil des migrations de contenu,
     * et figer un numéro ici ferait échouer ce test à chaque publication sans
     * rien dire de la santé de la mission.
     */
    @Test
    void e_missionSurLeReferentielRepris_resteExploitable() {
        var mission = creerMission("SMARTEX_SUSTWAY", "Mission sur référentiel repris");
        String versionCourante = versionPublieeDe("SMARTEX_SUSTWAY");

        int nombreCriteres = given().header("Authorization", "Bearer " + mission.token())
                .when().get("/api/v1/entreprises/" + mission.entrepriseId() + "/audits/" + mission.auditId())
                .then().statusCode(200)
                .body("referentielVersion", equalTo(versionCourante))
                .extract().path("nombreCriteres");

        org.junit.jupiter.api.Assertions.assertTrue(nombreCriteres > 0,
                "Le questionnaire d'une mission sur le référentiel repris ne doit pas être vide.");

        given().header("Authorization", "Bearer " + mission.token())
                .when().get("/api/v1/entreprises/" + mission.entrepriseId()
                        + "/audits/" + mission.auditId() + "/criteres")
                .then().statusCode(200)
                .body("size()", equalTo(nombreCriteres));
    }

    /**
     * Invariant de la reprise, vérifié sur toutes les missions présentes :
     * chaque critère figé appartient bien à la version rattachée à sa
     * mission. Une reprise qui aurait déplacé un questionnaire ressortirait
     * ici, y compris sur les missions créées avant la migration.
     */
    @Test
    void e_chaqueCritereDeMissionAppartientALaVersionDeSaMission() {
        Number ecarts = (Number) entityManager.createNativeQuery(
                        "SELECT count(*) FROM audit_critere ac "
                                + "JOIN audit a ON a.id = ac.audit_id "
                                + "JOIN critere c ON c.id = ac.critere_id "
                                + "WHERE c.referentiel_version_id <> a.referentiel_version_id")
                .getSingleResult();
        assertEquals(0L, ecarts.longValue(),
                "Aucun critère de mission ne doit sortir de la version rattachée à sa mission.");

        Number sansVersion = (Number) entityManager.createNativeQuery(
                        "SELECT count(*) FROM audit WHERE referentiel_version_id IS NULL").getSingleResult();
        assertEquals(0L, sansVersion.longValue(), "Toute mission doit porter une version de référentiel.");
    }

    // === F ==================================================================

    /** Administrer le catalogue est réservé au personnel interne. */
    @Test
    void f_utilisateurNonAutorise_neModifiePasUneVersion() {
        Cadre cadre = cadreEnBrouillon();
        var client = UtilisateurDeTest.creerEtConnecter(jwtService);

        given().header("Authorization", "Bearer " + client.token)
                .contentType(ContentType.JSON)
                .body(Map.of("numero", "2.0"))
                .when().post("/api/v1/referentiels/" + cadre.code() + "/versions")
                .then().statusCode(403);

        given().header("Authorization", "Bearer " + client.token)
                .contentType(ContentType.JSON)
                .body(Map.of("libelle", "Libellé imposé par un client"))
                .when().put("/api/v1/referentiels/criteres/" + cadre.critereId())
                .then().statusCode(403);

        given().header("Authorization", "Bearer " + client.token)
                .when().post("/api/v1/referentiels/" + cadre.code() + "/versions/1.0/publication")
                .then().statusCode(403);

        given().header("Authorization", "Bearer " + client.token)
                .when().delete("/api/v1/referentiels/" + cadre.code() + "/versions/1.0")
                .then().statusCode(403);

        // Le critère n'a pas bougé.
        org.junit.jupiter.api.Assertions.assertTrue(librelesDuCatalogue(cadre).contains(LIBELLE_INITIAL));
    }

    // === G ==================================================================

    /**
     * La version d'une mission est une donnée de cette mission : la lire
     * depuis une autre organisation est refusée comme le reste.
     *
     * Le catalogue lui-même n'appartient à aucun tenant — il est commun à
     * toutes les organisations — donc l'IDOR ne peut porter que là où la
     * version devient une donnée d'entreprise : sur la mission.
     */
    @Test
    void g_versionDUneMissionDUnAutreTenant_estRefusee() {
        Cadre cadre = cadreEnBrouillon();
        publier(cadre, "1.0");
        var mission = creerMission(cadre.code(), "Mission d'une autre organisation");

        var intrus = UtilisateurDeTest.creerEtConnecter(jwtService);
        given().header("Authorization", "Bearer " + intrus.token)
                .contentType(ContentType.JSON)
                .body(Map.of("raisonSociale", "Entreprise intruse",
                        "identifiantLegal", "RCCM-VER-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201);

        given().header("Authorization", "Bearer " + intrus.token)
                .when().get("/api/v1/entreprises/" + mission.entrepriseId() + "/audits/" + mission.auditId())
                .then().statusCode(403);

        given().header("Authorization", "Bearer " + intrus.token)
                .when().get("/api/v1/entreprises/" + mission.entrepriseId()
                        + "/audits/" + mission.auditId() + "/criteres")
                .then().statusCode(403);
    }

    // === H ==================================================================

    /** L'historique des versions publiées est conservé (RG14) : rien ne l'efface. */
    @Test
    void h_versionPubliee_neSeSupprimePas() {
        Cadre cadre = cadreEnBrouillon();
        publier(cadre, "1.0");

        given().header("Authorization", "Bearer " + cadre.token())
                .when().delete("/api/v1/referentiels/" + cadre.code() + "/versions/1.0")
                .then().statusCode(409);

        given().header("Authorization", "Bearer " + cadre.token())
                .when().get("/api/v1/referentiels/" + cadre.code() + "/versions")
                .then().statusCode(200)
                .body("numero", hasItem("1.0"));
    }

    // === I ==================================================================

    /**
     * Dériver un brouillon d'une version publiée n'y touche pas : la version
     * source garde son statut, son contenu et ses libellés, et le brouillon
     * porte ses propres copies.
     */
    @Test
    void i_versionCorrective_deriveeSansModifierLaSource() {
        Cadre cadre = cadreEnBrouillon();
        publier(cadre, "1.0");
        String critereDeLa10 = cadre.critereId();

        given().header("Authorization", "Bearer " + cadre.token())
                .contentType(ContentType.JSON)
                .body(Map.of("numero", "2.0", "notes", "Version corrective"))
                .when().post("/api/v1/referentiels/" + cadre.code() + "/versions")
                .then().statusCode(201)
                .body("statut", equalTo("BROUILLON"))
                .body("remplaceVersion", equalTo("1.0"))
                // Le contenu a bien été repris : le brouillon n'est pas vide.
                .body("nombreCriteres", equalTo(1));

        // La 1.0 n'a pas changé de statut et reste la version courante.
        given().header("Authorization", "Bearer " + cadre.token())
                .when().get("/api/v1/referentiels/" + cadre.code() + "/versions")
                .then().statusCode(200)
                .body("find { it.numero == '1.0' }.statut", equalTo("PUBLIEE"))
                .body("find { it.numero == '1.0' }.courante", equalTo(true));

        String critereDuBrouillon = idDuPremierCritereDuCatalogue(cadre);
        assertNotEquals(critereDeLa10, critereDuBrouillon,
                "Le brouillon doit porter sa propre copie du critère.");

        // Modifier le brouillon laisse la version publiée intacte.
        modifierLibelle(cadre, critereDuBrouillon, LIBELLE_CORRIGE).statusCode(200);
        modifierLibelle(cadre, critereDeLa10, "Tentative sur la version publiée").statusCode(409);
        assertEquals(LIBELLE_INITIAL, libelleEnBase(critereDeLa10),
                "Le critère de la version publiée doit être resté identique.");
    }

    // === L'immuabilité ne repose pas sur l'API ==============================

    /**
     * Le service anticipe le refus pour rendre un 409 lisible ; c'est la base
     * qui l'impose. Cette écriture contourne délibérément le service et doit
     * échouer quand même — sans quoi un script de reprise, une console SQL ou
     * un endpoint ajouté plus tard pourraient réécrire l'histoire.
     */
    @Test
    void immuabiliteTenueParLaBaseEtPasSeulementParLApi() {
        Cadre cadre = cadreEnBrouillon();
        publier(cadre, "1.0");

        var echec = org.junit.jupiter.api.Assertions.assertThrows(RuntimeException.class,
                () -> ecritureDirecteEnBase(UUID.fromString(cadre.critereId())),
                "La base doit refuser d'elle-même la modification d'un critère publié.");
        org.junit.jupiter.api.Assertions.assertTrue(
                racine(echec).getMessage().contains("version PUBLIEE"),
                "Le refus doit venir du déclencheur d'immuabilité, message reçu : "
                        + racine(echec).getMessage());

        assertEquals(LIBELLE_INITIAL, libelleEnBase(cadre.critereId()));
    }

    @Transactional
    void ecritureDirecteEnBase(UUID critereId) {
        entityManager.createNativeQuery("UPDATE critere SET libelle = ?1 WHERE id = ?2")
                .setParameter(1, "Écriture directe contournant le service")
                .setParameter(2, critereId)
                .executeUpdate();
        entityManager.flush();
    }

    private static Throwable racine(Throwable e) {
        Throwable courant = e;
        while (courant.getCause() != null && courant.getCause() != courant) {
            courant = courant.getCause();
        }
        return courant;
    }

    // --- Outils ---------------------------------------------------------

    private record Mission(String token, String entrepriseId, String auditId) {
    }

    /** Organisation abonnée et mission créée sur le référentiel demandé. */
    private Mission creerMission(String referentielCode, String nom) {
        var proprietaire = UtilisateurDeTest.creerEtConnecter(jwtService);

        String entrepriseId = given().header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of("raisonSociale", "Entreprise " + nom,
                        "identifiantLegal", "RCCM-VER-" + UUID.randomUUID(),
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

    private String libelleDuPremierCritere(Mission mission) {
        return given().header("Authorization", "Bearer " + mission.token())
                .when().get("/api/v1/entreprises/" + mission.entrepriseId()
                        + "/audits/" + mission.auditId() + "/criteres")
                .then().statusCode(200)
                .extract().path("[0].critereLibelle");
    }

    /** Le catalogue expose la version de travail : le brouillon s'il existe, sinon la publiée. */
    private String idDuPremierCritereDuCatalogue(Cadre cadre) {
        return given().header("Authorization", "Bearer " + cadre.token())
                .when().get("/api/v1/referentiels/" + cadre.code() + "/criteres")
                .then().statusCode(200)
                .extract().path("[0].id");
    }

    /** Version courante d'un référentiel du catalogue, telle qu'elle est en base. */
    private String versionPublieeDe(String referentielCode) {
        return (String) entityManager.createNativeQuery(
                        "SELECT v.numero FROM referentiel_version v "
                                + "JOIN referentiel r ON r.id = v.referentiel_id "
                                + "WHERE r.code = ?1 AND v.statut = 'PUBLIEE'")
                .setParameter(1, referentielCode).getSingleResult();
    }

    private String libelleEnBase(String critereId) {
        return (String) entityManager
                .createNativeQuery("SELECT libelle FROM critere WHERE id = ?1")
                .setParameter(1, UUID.fromString(critereId))
                .getSingleResult();
    }

    /** Garde-fou de lecture : le catalogue ne doit jamais mélanger deux versions. */
    @Test
    void catalogueNeMelangeJamaisDeuxVersions() {
        Cadre cadre = cadreEnBrouillon();
        publier(cadre, "1.0");

        given().header("Authorization", "Bearer " + cadre.token())
                .contentType(ContentType.JSON)
                .body(Map.of("numero", "2.0"))
                .when().post("/api/v1/referentiels/" + cadre.code() + "/versions")
                .then().statusCode(201);

        // Deux versions coexistent, chacune avec son critère DOM1-01 : le
        // catalogue ne doit en montrer qu'un, celui du brouillon.
        List<String> codes = given().header("Authorization", "Bearer " + cadre.token())
                .when().get("/api/v1/referentiels/" + cadre.code() + "/criteres")
                .then().statusCode(200)
                .extract().path("code");
        assertEquals(1, codes.size(), "Le catalogue doit rendre la version de travail seule, sans doublon.");

        given().header("Authorization", "Bearer " + cadre.token())
                .when().get("/api/v1/referentiels/" + cadre.code() + "/domaines")
                .then().statusCode(200)
                .body("size()", equalTo(1))
                .body("code", not(hasItem("DOM2")));
    }
}
