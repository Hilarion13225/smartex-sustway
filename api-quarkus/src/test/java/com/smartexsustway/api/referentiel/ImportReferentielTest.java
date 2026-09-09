package com.smartexsustway.api.referentiel;

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

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Socle de l'import assisté : ce qui entre, ce qui est refusé, et ce qui en
 * reste comme trace.
 *
 * Trois garanties sont éprouvées ici. Le référentiel n'appartient à aucune
 * organisation : aucun utilisateur d'entreprise n'y écrit, pas davantage par
 * un import que par l'écran d'administration. Un fichier refusé ne laisse
 * rien derrière lui — ni objet stocké, ni ligne de suivi. Et un fichier
 * accepté laisse tout : empreinte, taille, type, auteur, journal.
 */
@QuarkusTest
class ImportReferentielTest {

    private static final String CHEMIN = "/api/v1/referentiels/imports";

    @Inject JwtService jwtService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject EntityManager entityManager;
    @Inject ImportReferentielService importService;

    private UtilisateurDeTest superAdmin() {
        return UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository,
                utilisateurEntrepriseRepository);
    }

    private String jetonSuperAdmin() {
        return superAdmin().token;
    }

    /** Un référentiel minimal, en JSON — l'un des formats admis. */
    private static byte[] fichierJson() {
        return ("{\"referentiel\":{\"code\":\"TEST_IMPORT\",\"nom\":\"Référentiel importé\"},"
                + "\"domaines\":[]}").getBytes(StandardCharsets.UTF_8);
    }

    private io.restassured.response.ValidatableResponse deposer(String jeton, String nom,
                                                                String typeMime, byte[] contenu) {
        return given().header("Authorization", "Bearer " + jeton)
                .multiPart("fichier", nom, contenu, typeMime)
                .when().post(CHEMIN)
                .then();
    }

    private long compter(String sql) {
        return ((Number) entityManager.createNativeQuery(sql).getSingleResult()).longValue();
    }

    // === Dépôt accepté =====================================================

    @Test
    void depotValide_conserveEmpreinteEtMetadonnees() {
        byte[] contenu = fichierJson();

        String id = deposer(jetonSuperAdmin(), "referentiel.json", "application/json", contenu)
                .statusCode(201)
                .body("nomFichier", equalTo("referentiel.json"))
                .body("typeMime", equalTo("application/json"))
                .body("taille", equalTo(contenu.length))
                .body("statut", equalTo("EN_ATTENTE"))
                .body("hashFichier", notNullValue())
                .body("importeParNom", notNullValue())
                .body("importeLe", notNullValue())
                // Le référentiel cible n'est pas connu au dépôt : on ne sait
                // pas encore quel cadre le fichier décrit.
                .body("referentielCode", equalTo(null))
                .body("versionId", equalTo(null))
                .extract().path("id");

        // L'empreinte doit être celle du contenu réellement reçu, pas une
        // valeur de remplissage.
        String hashAttendu = com.smartexsustway.api.stockage.ControleFichierService.sha256(contenu);
        String hashEnBase = (String) entityManager.createNativeQuery(
                        "SELECT hash_fichier FROM import_referentiel WHERE id = ?1")
                .setParameter(1, UUID.fromString(id)).getSingleResult();
        assertEquals(hashAttendu, hashEnBase, "L'empreinte doit être le SHA-256 du fichier reçu.");
        assertEquals(64, hashEnBase.length(), "Un SHA-256 s'écrit sur 64 caractères hexadécimaux.");
    }

    /** Les cinq formats annoncés sont acceptés, et eux seuls. */
    @Test
    void lesFormatsAnnoncesSontAcceptes() {
        String jeton = jetonSuperAdmin();
        record Cas(String nom, String mime) {
        }
        var cas = List.of(
                new Cas("grille.pdf", "application/pdf"),
                new Cas("grille.docx",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
                new Cas("grille.xlsx",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
                new Cas("grille.csv", "text/csv"),
                new Cas("grille.json", "application/json"));

        for (Cas c : cas) {
            deposer(jeton, c.nom(), c.mime(), ("contenu de " + c.nom()).getBytes(StandardCharsets.UTF_8))
                    .statusCode(201);
        }
    }

    /**
     * Le même fichier redéposé est signalé, pas refusé : réimporter peut être
     * une méprise comme une reprise volontaire après un échec, et rien dans
     * le produit ne tranche entre les deux.
     */
    @Test
    void memeFichierRedepose_estSignaleSansEtreRefuse() {
        String jeton = jetonSuperAdmin();
        byte[] contenu = ("{\"doublon\":\"" + UUID.randomUUID() + "\"}").getBytes(StandardCharsets.UTF_8);

        String premier = deposer(jeton, "grille.json", "application/json", contenu)
                .statusCode(201)
                .body("doublonsPossibles", equalTo(List.of()))
                .extract().path("id");

        deposer(jeton, "grille.json", "application/json", contenu)
                .statusCode(201)
                .body("doublonsPossibles", hasItem(premier));
    }

    // === Dépôt refusé ======================================================

    @Test
    void extensionNonAutorisee_estRefusee() {
        long avant = compter("SELECT count(*) FROM import_referentiel");

        deposer(jetonSuperAdmin(), "grille.exe", "application/json",
                "MZ".getBytes(StandardCharsets.UTF_8))
                .statusCode(415);

        assertEquals(avant, compter("SELECT count(*) FROM import_referentiel"),
                "Un fichier refusé ne doit laisser aucune ligne de suivi.");
    }

    @Test
    void typeMimeNonAutorise_estRefuse() {
        long avant = compter("SELECT count(*) FROM import_referentiel");

        deposer(jetonSuperAdmin(), "grille.json", "image/png",
                "contenu".getBytes(StandardCharsets.UTF_8))
                .statusCode(415);

        assertEquals(avant, compter("SELECT count(*) FROM import_referentiel"));
    }

    @Test
    void fichierVide_estRefuse() {
        deposer(jetonSuperAdmin(), "grille.json", "application/json", new byte[0])
                .statusCode(400);
    }

    /**
     * La signature de test EICAR, reconnue par tout antivirus, sans être un
     * programme malveillant. Elle éprouve le refus réel plutôt qu'un
     * comportement simulé.
     */
    @Test
    void fichierInfecte_estRefuseEtNeLaisseRien() {
        long avant = compter("SELECT count(*) FROM import_referentiel");
        byte[] eicar = ("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*")
                .getBytes(StandardCharsets.US_ASCII);

        int statut = deposer(jetonSuperAdmin(), "grille.json", "application/json", eicar)
                .extract().statusCode();

        // 422 si ClamAV a répondu, 503 si le scan est indisponible et
        // bloquant : dans les deux cas le fichier n'est pas accepté, et c'est
        // ce qui importe. Un 201 signifierait qu'il est passé.
        assertTrue(statut == 422 || statut == 503,
                "Un fichier porteur de la signature de test doit être refusé, reçu : " + statut);
        assertEquals(avant, compter("SELECT count(*) FROM import_referentiel"),
                "Un fichier infecté ne doit laisser ni objet stocké ni ligne de suivi.");
    }

    // === Droits ============================================================

    /**
     * Le référentiel est commun à toutes les organisations : il n'appartient
     * à aucun tenant, et aucun rattachement d'entreprise n'y donne accès en
     * écriture.
     */
    @Test
    void aucunUtilisateurDEntrepriseNimporteUnReferentiel() {
        var client = UtilisateurDeTest.creerEtConnecter(jwtService);

        deposer(client.token, "grille.json", "application/json", fichierJson())
                .statusCode(403);

        given().header("Authorization", "Bearer " + client.token)
                .when().get(CHEMIN)
                .then().statusCode(403);
    }

    /** Un identifiant deviné ne donne pas accès à l'import d'un autre. */
    @Test
    void identifiantDImportDevine_nOuvreRien() {
        String id = deposer(jetonSuperAdmin(), "grille.json", "application/json", fichierJson())
                .statusCode(201).extract().path("id");

        var client = UtilisateurDeTest.creerEtConnecter(jwtService);
        given().header("Authorization", "Bearer " + client.token)
                .when().get(CHEMIN + "/" + id)
                .then().statusCode(403);

        given().header("Authorization", "Bearer " + client.token)
                .when().get(CHEMIN + "/" + id + "/fichier")
                .then().statusCode(403);
    }

    @Test
    void importInconnu_est404() {
        given().header("Authorization", "Bearer " + jetonSuperAdmin())
                .when().get(CHEMIN + "/" + UUID.randomUUID())
                .then().statusCode(404);
    }

    // === Fichier source conservé ==========================================

    /**
     * Le fichier source est une pièce de traçabilité : il doit se relire tel
     * qu'il a été reçu, y compris après un échec d'extraction — comprendre
     * pourquoi une extraction a échoué suppose de pouvoir rouvrir le fichier
     * qui l'a fait échouer.
     */
    @Test
    void leFichierSourceResteRelisibleApresUnEchec() {
        String jeton = jetonSuperAdmin();
        byte[] contenu = fichierJson();
        String id = deposer(jeton, "grille.json", "application/json", contenu)
                .statusCode(201).extract().path("id");

        importService.marquerEchec(UUID.fromString(id), "Structure non reconnue");

        given().header("Authorization", "Bearer " + jeton)
                .when().get(CHEMIN + "/" + id)
                .then().statusCode(200)
                .body("statut", equalTo("ECHEC"))
                .body("erreur", equalTo("Structure non reconnue"));

        byte[] relu = given().header("Authorization", "Bearer " + jeton)
                .when().get(CHEMIN + "/" + id + "/fichier")
                .then().statusCode(200)
                .extract().asByteArray();
        org.junit.jupiter.api.Assertions.assertArrayEquals(contenu, relu,
                "Le fichier source doit être relisible à l'identique après un échec.");
    }

    /** Un échec sans motif serait un import mort sans rien à corriger. */
    @Test
    void unEchecPorteToujoursUnMotif() {
        String id = deposer(jetonSuperAdmin(), "grille.json", "application/json", fichierJson())
                .statusCode(201).extract().path("id");

        importService.marquerEchec(UUID.fromString(id), null);

        String erreur = (String) entityManager.createNativeQuery(
                        "SELECT erreur FROM import_referentiel WHERE id = ?1")
                .setParameter(1, UUID.fromString(id)).getSingleResult();
        assertTrue(erreur != null && !erreur.isBlank(),
                "Un import en échec doit toujours porter un motif.");
    }

    // === Cycle de vie ======================================================

    @Test
    void leCycleDeVieSuitLesEtatsAttendus() {
        var admin = superAdmin();
        String jeton = admin.token;
        UUID administrateur = UUID.fromString(admin.id);
        UUID id = UUID.fromString(deposer(jeton, "grille.json", "application/json", fichierJson())
                .statusCode(201).extract().path("id"));

        assertTrue(importService.reclamerPourAnalyse(id, administrateur));
        given().header("Authorization", "Bearer " + jeton)
                .when().get(CHEMIN + "/" + id)
                .then().statusCode(200)
                .body("statut", equalTo("ANALYSE_EN_COURS"))
                .body("analyseDebut", notNullValue());

        // Un brouillon est ouvert par le versionnement, jamais par un INSERT
        // direct dans les tables de contenu.
        var version = importService.ouvrirBrouillonCible(new ImportReferentielService.CibleImport(
                        null, "TEST_IMP_" + UUID.randomUUID().toString().substring(0, 6).toUpperCase(),
                        "Référentiel importé", "SMARTEX", "1.0"),
                administrateur);

        importService.marquerBrouillonGenere(id, version.getId(), java.util.Map.of("pages", 12));

        given().header("Authorization", "Bearer " + jeton)
                .when().get(CHEMIN + "/" + id)
                .then().statusCode(200)
                .body("statut", equalTo("BROUILLON_GENERE"))
                .body("versionId", equalTo(version.getId().toString()))
                .body("referentielCode", notNullValue())
                .body("analyseFin", notNullValue())
                .body("metadonnees.pages", equalTo(12));
    }

    /**
     * Un référentiel n'admet qu'un seul brouillon à la fois : l'index partiel
     * de V46 l'impose et le service de versionnement le refuse. L'import ne
     * contourne pas cette règle, il la subit comme le reste.
     */
    @Test
    void unSecondBrouillonSurLeMemeReferentiel_estRefuse() {
        UUID utilisateur = UUID.fromString(superAdmin().id);
        String code = "TEST_IMP_" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        importService.ouvrirBrouillonCible(new ImportReferentielService.CibleImport(
                null, code, "Référentiel importé", "SMARTEX", "1.0"), utilisateur);

        var refus = org.junit.jupiter.api.Assertions.assertThrows(
                VersionReferentielService.VersionFigeeException.class,
                () -> importService.ouvrirBrouillonCible(new ImportReferentielService.CibleImport(
                        null, code, "Référentiel importé", "SMARTEX", "2.0"), utilisateur));
        assertTrue(refus.getMessage().contains("brouillon"),
                "Le refus doit dire qu'un brouillon existe déjà : " + refus.getMessage());
    }

    /** Un import déjà traité ne se relance pas : son résultat serait écrasé sans trace. */
    @Test
    void unImportDejaTraiteNeSeRelancePas() {
        UUID id = UUID.fromString(deposer(jetonSuperAdmin(), "grille.json", "application/json",
                fichierJson()).statusCode(201).extract().path("id"));

        assertTrue(relire(id), "Un import qui vient d'être déposé doit pouvoir être analysé.");

        assertTrue(importService.reclamerPourAnalyse(id, null));
        org.junit.jupiter.api.Assertions.assertFalse(relire(id),
                "Une analyse en cours ne doit pas pouvoir être relancée.");

        importService.marquerEchec(id, "Structure non reconnue");
        assertTrue(relire(id), "Après un échec, une nouvelle tentative doit rester possible.");
    }

    /**
     * Relit l'import après l'avoir chassé du contexte de persistance.
     *
     * Chaque étape du cycle de vie s'exécute dans sa propre transaction ;
     * sans ce vidage, la session du test rendrait l'instance qu'elle a
     * déjà chargée et l'on éprouverait un état périmé plutôt que celui de
     * la base.
     */
    private boolean relire(UUID importId) {
        entityManager.clear();
        return importService.peutEtreAnalyse(importService.parId(importId));
    }

    // === Journalisation ====================================================

    @Test
    void lesEvenementsDImportSontJournalises() {
        String jeton = jetonSuperAdmin();
        UUID id = UUID.fromString(deposer(jeton, "grille.json", "application/json", fichierJson())
                .statusCode(201).extract().path("id"));
        importService.reclamerPourAnalyse(id, null);
        importService.marquerEchec(id, "Structure non reconnue");

        List<?> actions = entityManager.createNativeQuery(
                        "SELECT action FROM audit_log WHERE entite = 'import_referentiel' "
                                + "AND entite_id = ?1 ORDER BY created_at")
                .setParameter(1, id).getResultList();

        assertTrue(actions.contains("IMPORT_REFERENTIEL_CREE"), "La création doit être journalisée.");
        assertTrue(actions.contains("IMPORT_REFERENTIEL_ANALYSE_LANCEE"),
                "Le lancement de l'analyse doit être journalisé.");
        assertTrue(actions.contains("IMPORT_REFERENTIEL_ECHEC"), "L'échec doit être journalisé.");
    }

}
