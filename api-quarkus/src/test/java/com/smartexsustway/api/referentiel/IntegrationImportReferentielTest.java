package com.smartexsustway.api.referentiel;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.RoleRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.ia.EnteteServiceIaFactory;
import com.smartexsustway.api.ia.ExtractionReferentielRequestDto;
import com.smartexsustway.api.ia.ExtractionReferentielResponseDto;
import com.smartexsustway.api.ia.ReferentielImportClient;
import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.ws.rs.ProcessingException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MultivaluedHashMap;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Le raccordement Java ↔ Python, du lancement au brouillon.
 *
 * Le service d'agents est remplacé par un double : aucun quota consommé,
 * aucune dépendance au réseau, et surtout la possibilité de lui faire rendre
 * exactement ce qu'on veut éprouver — une structure valide, une structure
 * incohérente, une panne. Ce que ces tests ne prouvent pas, et qu'aucun mock
 * ne prouvera, c'est que le vrai service répond bien ce contrat-là ; cela se
 * vérifie une fois, à la main, contre le conteneur.
 *
 * Trois familles de garanties. L'appel sortant est authentifié et le jeton
 * qui le porte n'ouvre rien d'autre. Un import ne part qu'une fois, même si
 * deux requêtes le demandent en même temps. Et ce qui arrive en base y
 * arrive entièrement ou pas du tout, marqué comme proposition et sans
 * validateur.
 */
@QuarkusTest
class IntegrationImportReferentielTest {

    private static final String CHEMIN = "/api/v1/referentiels/imports";
    private static final ObjectMapper JSON = new ObjectMapper();

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

    private static byte[] fichier() {
        return "{\"referentiel\":{\"code\":\"X\"},\"domaines\":[]}".getBytes(StandardCharsets.UTF_8);
    }

    /** Dépose un fichier et rend l'identifiant de l'import créé. */
    private String deposer(String jeton) {
        return given().header("Authorization", "Bearer " + jeton)
                .multiPart("fichier", "referentiel-" + UUID.randomUUID() + ".json",
                        fichier(), "application/json")
                .when().post(CHEMIN)
                .then().statusCode(201)
                .extract().path("id");
    }

    private io.restassured.response.ValidatableResponse lancer(String jeton, String importId,
                                                               Map<String, Object> cible) {
        return given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON).body(cible)
                .when().post(CHEMIN + "/" + importId + "/analyse")
                .then();
    }

    private static Map<String, Object> cibleNeuve(String code) {
        return Map.of("codeReferentiel", code, "nomReferentiel", "Référentiel " + code,
                "typeReferentiel", "SMARTEX");
    }

    /**
     * Attend que l'import quitte l'état « analyse en cours ».
     *
     * Le travail se fait sur le pool de travail, après la réponse HTTP : il
     * n'y a pas d'autre point d'observation que le statut, et l'interroger en
     * boucle est le seul moyen de laisser au thread le temps d'aboutir.
     */
    private String attendreFin(String jeton, String importId) {
        for (int essai = 0; essai < 100; essai++) {
            String statut = given().header("Authorization", "Bearer " + jeton)
                    .when().get(CHEMIN + "/" + importId)
                    .then().statusCode(200).extract().path("statut");
            if (!"ANALYSE_EN_COURS".equals(statut)) {
                return statut;
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

    /** Une structure minimale mais complète : un domaine, un critère, tout l'étage métier. */
    private static ExtractionReferentielResponseDto reponseComplete(UUID importId) {
        var preuve = new ExtractionReferentielResponseDto.PreuveAttendueDto(
                null, null, null,
                "PROCEDURE", "Procédure de gestion des déchets", "Datée et signée", true, 1);
        var exigence = new ExtractionReferentielResponseDto.ExigenceDto(
                null, null, null,
                "D1-01-E1", "Disposer d'une procédure",
                "L'organisation dispose d'une procédure écrite de gestion des déchets.",
                1, List.of(preuve));
        var question = new ExtractionReferentielResponseDto.QuestionDto(
                "D1-01-Q1", "Une procédure existe-t-elle ?", "FERMEE", "BINAIRE", true, 1);
        var reglePreuve = new ExtractionReferentielResponseDto.RegleDto(
                null, null, null,
                "D1-01-R1", "SIGNATURE", "La procédure doit être signée", "ELEVEE",
                "D1-01-E1", "Procédure de gestion des déchets", Map.of());
        var regleCritere = new ExtractionReferentielResponseDto.RegleDto(
                null, null, null,
                "D1-01-R2", "PRESENCE", "Présence des éléments attendus", "MOYENNE",
                null, null, Map.of("elements", List.of("procédure", "registre")));
        var critere = new ExtractionReferentielResponseDto.CritereDto(
                null, null, null,
                "D1-01", "Gestion des déchets", "Description du critère", "D1-SD1",
                "GENERALE", "ELEVEE", 2.0, 1,
                List.of(question), List.of(exigence), List.of(reglePreuve, regleCritere));
        var sousDomaine = new ExtractionReferentielResponseDto.SousDomaineDto(
                "D1-SD1", "Déchets", null, 1);
        var domaine = new ExtractionReferentielResponseDto.DomaineDto(
                "D1", "Environnement", "Domaine environnemental", 1,
                List.of(sousDomaine), List.of(critere));
        var referentiel = new ExtractionReferentielResponseDto.ReferentielDto(
                "PROPOSE", "Nom proposé par le document", null);

        return new ExtractionReferentielResponseDto(importId,
                new ExtractionReferentielResponseDto.BrouillonDto(referentiel, List.of(domaine)),
                Map.of("sections", 3, "lots", 1, "modele", "gemini-3.5-flash-lite"));
    }

    private long compter(String sql) {
        return ((Number) entityManager.createNativeQuery(sql).getSingleResult()).longValue();
    }

    // === 1. Authentification interservices ==================================

    @Test
    void jetonDeService_porteLAudienceEtLeButAttendus() throws Exception {
        String jeton = jwtService.genererTokenServiceIa();
        Map<?, ?> charge = chargeUtile(jeton);

        assertEquals(JwtService.PURPOSE_SERVICE_IA, charge.get("purpose"),
                "Sans ce but, le service Python ne distingue pas un jeton de service "
                        + "d'un jeton de session d'utilisateur");
        assertEquals("api-quarkus", charge.get("sub"));
        assertTrue(charge.get("aud").toString().contains(JwtService.AUDIENCE_SERVICE_IA));
    }

    @Test
    void jetonDeService_estCourtEtSigne() throws Exception {
        String jeton = jwtService.genererTokenServiceIa();
        Map<?, ?> entete = chargeUtile(jeton.split("\\.")[0]);
        assertEquals("RS256", entete.get("alg"),
                "La signature asymétrique est ce qui évite de distribuer un secret partagé");

        Map<?, ?> charge = chargeUtile(jeton);
        long duree = ((Number) charge.get("exp")).longValue() - ((Number) charge.get("iat")).longValue();
        assertTrue(duree <= 600,
                "Un jeton de service intercepté ne doit rester utilisable que quelques minutes, "
                        + "or celui-ci vaut " + duree + " secondes");
    }

    @Test
    void jetonDeService_nOuvrePasLApiElleMeme() {
        String jeton = jwtService.genererTokenServiceIa();

        // Un secret unique valable des deux côtés n'en protégerait aucun. Ici
        // le jeton est cryptographiquement valide et pourtant sans effet :
        // SessionPurposeFilter n'accepte que purpose=SESSION.
        given().header("Authorization", "Bearer " + jeton)
                .when().get("/api/v1/utilisateurs/moi")
                .then().statusCode(401);

        // Sur un endpoint réservé à un rôle, le contrôle d'accès se prononce
        // avant le filtre : 403 plutôt que 401. La porte est fermée des deux
        // façons, et ce test le constate au lieu de figer un code de retour
        // qui dépend de l'ordre des gardes.
        given().header("Authorization", "Bearer " + jeton)
                .when().get(CHEMIN)
                .then().statusCode(403);
    }

    @Test
    void chaqueAppelSortant_porteUnJetonFraichementSigne() {
        var factory = new EnteteServiceIaFactory();
        var sortantes = new MultivaluedHashMap<String, String>();
        factory.update(new MultivaluedHashMap<>(), sortantes);

        String entete = sortantes.getFirst("Authorization");
        assertNotNull(entete, "Sans en-tête, le service Python répondrait 401");
        assertTrue(entete.startsWith("Bearer "));
        assertEquals(3, entete.substring(7).split("\\.").length,
                "L'en-tête doit porter un JWT, pas un identifiant de service en clair");
    }

    @Test
    void aucunJetonEntrant_nEstRelayeAuServiceDAgents() {
        var factory = new EnteteServiceIaFactory();
        var entrantes = new MultivaluedHashMap<String, String>();
        entrantes.putSingle("Authorization", "Bearer jeton-de-session-de-l-utilisateur");
        var sortantes = new MultivaluedHashMap<String, String>();

        factory.update(entrantes, sortantes);

        assertFalse(sortantes.getFirst("Authorization").contains("jeton-de-session-de-l-utilisateur"),
                "Relayer le jeton de l'utilisateur étendrait sa portée à un service "
                        + "qui ne décide d'aucun droit");
    }

    // === 2. Lancement, droits, idempotence ==================================

    @Test
    void analyse_estRefuseeAUnUtilisateurDEntreprise() {
        String importId = deposer(jetonSuperAdmin());
        var utilisateur = UtilisateurDeTest.creerEtConnecter(jwtService);

        lancer(utilisateur.token, importId, cibleNeuve("REF_" + UUID.randomUUID())).statusCode(403);
    }

    @Test
    void analyse_dUnImportInconnu_rend404() {
        lancer(jetonSuperAdmin(), UUID.randomUUID().toString(), cibleNeuve("REF_X")).statusCode(404);
    }

    @Test
    void analyse_rend202EtNeBloquePasLaRequete() {
        String jeton = jetonSuperAdmin();
        String importId = deposer(jeton);
        when(client.extraire(any())).thenReturn(reponseComplete(UUID.fromString(importId)));

        lancer(jeton, importId, cibleNeuve("REF_" + UUID.randomUUID().toString().substring(0, 8)))
                .statusCode(202);

        assertEquals("BROUILLON_GENERE", attendreFin(jeton, importId));
    }

    @Test
    void deuxLancementsDuMemeImport_nEnExecutentQuUnSeul() {
        String jeton = jetonSuperAdmin();
        String importId = deposer(jeton);
        var cible = cibleNeuve("REF_" + UUID.randomUUID().toString().substring(0, 8));
        // Le double ne rend jamais : l'import reste en analyse, ce qui est
        // exactement la situation où un second lancement serait dangereux.
        when(client.extraire(any())).thenAnswer(invocation -> {
            Thread.sleep(1500);
            throw new ProcessingException("appel interrompu");
        });

        lancer(jeton, importId, cible).statusCode(202);
        lancer(jeton, importId, cible).statusCode(409);

        attendreFin(jeton, importId);
        verify(client, times(1)).extraire(any());
    }

    @Test
    void analyse_dUnImportDejaTraite_estRefusee() {
        String jeton = jetonSuperAdmin();
        String importId = deposer(jeton);
        when(client.extraire(any())).thenReturn(reponseComplete(UUID.fromString(importId)));

        lancer(jeton, importId, cibleNeuve("REF_" + UUID.randomUUID().toString().substring(0, 8)))
                .statusCode(202);
        assertEquals("BROUILLON_GENERE", attendreFin(jeton, importId));

        // Relancer écraserait le résultat sans trace, et laisserait deux
        // brouillons sur le même référentiel.
        lancer(jeton, importId, cibleNeuve("REF_AUTRE")).statusCode(409);
    }

    @Test
    void unImportEnEchec_estRelancable() {
        String jeton = jetonSuperAdmin();
        String importId = deposer(jeton);
        when(client.extraire(any())).thenThrow(new ProcessingException("service injoignable"));

        lancer(jeton, importId, cibleNeuve("REF_" + UUID.randomUUID().toString().substring(0, 8)))
                .statusCode(202);
        assertEquals("ECHEC", attendreFin(jeton, importId));

        // Une panne passagère ne doit pas condamner le fichier déjà déposé.
        // `doReturn` et non `when(...)` : sur un double déjà programmé pour
        // lever, la forme `when(client.extraire(any()))` appelle réellement la
        // méthode et déclenche l'exception avant de reprogrammer quoi que ce
        // soit.
        org.mockito.Mockito.doReturn(reponseComplete(UUID.fromString(importId)))
                .when(client).extraire(any());
        lancer(jeton, importId, cibleNeuve("REF_" + UUID.randomUUID().toString().substring(0, 8)))
                .statusCode(202);
        assertEquals("BROUILLON_GENERE", attendreFin(jeton, importId));
    }

    @Test
    void leFichierEnvoye_estCeluiQuiAEteDepose() {
        String jeton = jetonSuperAdmin();
        String importId = deposer(jeton);
        when(client.extraire(any())).thenReturn(reponseComplete(UUID.fromString(importId)));

        lancer(jeton, importId, cibleNeuve("REF_" + UUID.randomUUID().toString().substring(0, 8)))
                .statusCode(202);
        attendreFin(jeton, importId);

        var capture = ArgumentCaptor.forClass(ExtractionReferentielRequestDto.class);
        verify(client).extraire(capture.capture());
        var envoye = capture.getValue();
        assertEquals(UUID.fromString(importId), envoye.importId());
        assertEquals("application/json", envoye.typeMime());
        assertEquals(new String(fichier(), StandardCharsets.UTF_8),
                new String(Base64.getDecoder().decode(envoye.contenuBase64()), StandardCharsets.UTF_8),
                "Le service d'agents doit recevoir le fichier contrôlé, pas une reconstruction");
    }

    // === 3. Création du brouillon ===========================================

    @Test
    void leBrouillon_estCreeAvecSonReferentielEtResteNonPublie() {
        String jeton = jetonSuperAdmin();
        String code = "REF_" + UUID.randomUUID().toString().substring(0, 8);
        String importId = deposer(jeton);
        when(client.extraire(any())).thenReturn(reponseComplete(UUID.fromString(importId)));

        lancer(jeton, importId, cibleNeuve(code)).statusCode(202);
        attendreFin(jeton, importId);

        given().header("Authorization", "Bearer " + jeton)
                .when().get(CHEMIN + "/" + importId + "/brouillon")
                .then().statusCode(200)
                .body("referentielCode", equalTo(code))
                .body("versionStatut", equalTo("BROUILLON"));
    }

    @Test
    void laCibleSaisie_primeSurCeQueLeDocumentAnnonce() {
        String jeton = jetonSuperAdmin();
        String code = "REF_" + UUID.randomUUID().toString().substring(0, 8);
        String importId = deposer(jeton);
        // La réponse du double annonce le code « PROPOSE ».
        when(client.extraire(any())).thenReturn(reponseComplete(UUID.fromString(importId)));

        lancer(jeton, importId, cibleNeuve(code)).statusCode(202);
        attendreFin(jeton, importId);

        given().header("Authorization", "Bearer " + jeton)
                .when().get(CHEMIN + "/" + importId + "/brouillon")
                .then().statusCode(200)
                .body("referentielCode", equalTo(code))
                .body("referentielCode", not(equalTo("PROPOSE")));
    }

    @Test
    void laHierarchie_estReconstruiteDansLaVersionCible() {
        String jeton = jetonSuperAdmin();
        String importId = deposer(jeton);
        when(client.extraire(any())).thenReturn(reponseComplete(UUID.fromString(importId)));

        lancer(jeton, importId, cibleNeuve("REF_" + UUID.randomUUID().toString().substring(0, 8)))
                .statusCode(202);
        attendreFin(jeton, importId);

        String versionId = given().header("Authorization", "Bearer " + jeton)
                .when().get(CHEMIN + "/" + importId + "/brouillon")
                .then().statusCode(200).extract().path("versionId");

        assertEquals(1, compter("SELECT count(*) FROM domaine WHERE referentiel_version_id = '"
                + versionId + "'"));
        assertEquals(1, compter("SELECT count(*) FROM sous_domaine WHERE referentiel_version_id = '"
                + versionId + "'"));
        assertEquals(1, compter("SELECT count(*) FROM question WHERE referentiel_version_id = '"
                + versionId + "'"));
        // Le critère pointe vers le sous-domaine copié, pas vers un autre.
        assertEquals(1, compter("SELECT count(*) FROM critere c JOIN sous_domaine sd "
                + "ON sd.id = c.sous_domaine_id WHERE c.referentiel_version_id = '" + versionId
                + "' AND sd.referentiel_version_id = c.referentiel_version_id"));
    }

    @Test
    void lesReglesPortees_visentLExigenceEtLaPieceCopiees() {
        String jeton = jetonSuperAdmin();
        String importId = deposer(jeton);
        when(client.extraire(any())).thenReturn(reponseComplete(UUID.fromString(importId)));

        lancer(jeton, importId, cibleNeuve("REF_" + UUID.randomUUID().toString().substring(0, 8)))
                .statusCode(202);
        attendreFin(jeton, importId);

        String versionId = given().header("Authorization", "Bearer " + jeton)
                .when().get(CHEMIN + "/" + importId + "/brouillon")
                .then().statusCode(200).extract().path("versionId");

        assertEquals(1, compter("SELECT count(*) FROM regle_analyse WHERE referentiel_version_id = '"
                + versionId + "' AND exigence_id IS NOT NULL AND preuve_attendue_id IS NOT NULL"),
                "La règle de signature porte sur une pièce précise");
        assertEquals(1, compter("SELECT count(*) FROM regle_analyse WHERE referentiel_version_id = '"
                + versionId + "' AND exigence_id IS NULL AND preuve_attendue_id IS NULL"),
                "La règle de présence porte sur le critère entier");
    }

    // === 4. Provenance et validation ========================================

    @Test
    void toutLeContenuDepose_estMarqueCommeProposition() {
        String jeton = jetonSuperAdmin();
        String importId = deposer(jeton);
        when(client.extraire(any())).thenReturn(reponseComplete(UUID.fromString(importId)));

        lancer(jeton, importId, cibleNeuve("REF_" + UUID.randomUUID().toString().substring(0, 8)))
                .statusCode(202);
        attendreFin(jeton, importId);

        String versionId = given().header("Authorization", "Bearer " + jeton)
                .when().get(CHEMIN + "/" + importId + "/brouillon")
                .then().statusCode(200).extract().path("versionId");

        for (String table : List.of("exigence", "preuve_attendue", "regle_analyse")) {
            assertEquals(0, compter("SELECT count(*) FROM " + table + " WHERE referentiel_version_id = '"
                            + versionId + "' AND (origine <> 'IMPORT_IA' OR origine_initiale <> 'IMPORT_IA')"),
                    "Toute ligne de " + table + " issue d'un import doit porter sa provenance");
        }
    }

    @Test
    void aucunElementDepose_nEstMarqueCommeValide() {
        String jeton = jetonSuperAdmin();
        String importId = deposer(jeton);
        when(client.extraire(any())).thenReturn(reponseComplete(UUID.fromString(importId)));

        lancer(jeton, importId, cibleNeuve("REF_" + UUID.randomUUID().toString().substring(0, 8)))
                .statusCode(202);
        attendreFin(jeton, importId);

        String versionId = given().header("Authorization", "Bearer " + jeton)
                .when().get(CHEMIN + "/" + importId + "/brouillon")
                .then().statusCode(200).extract().path("versionId");

        for (String table : List.of("exigence", "preuve_attendue", "regle_analyse")) {
            assertEquals(0, compter("SELECT count(*) FROM " + table + " WHERE referentiel_version_id = '"
                            + versionId + "' AND (validee_par IS NOT NULL OR validee_le IS NOT NULL)"),
                    "L'import ne valide rien : c'est une personne qui accepte, plus tard");
        }
    }

    @Test
    void leBrouillon_estAnnonceNonPubliableTantQueRienNEstRelu() {
        String jeton = jetonSuperAdmin();
        String importId = deposer(jeton);
        when(client.extraire(any())).thenReturn(reponseComplete(UUID.fromString(importId)));

        lancer(jeton, importId, cibleNeuve("REF_" + UUID.randomUUID().toString().substring(0, 8)))
                .statusCode(202);
        attendreFin(jeton, importId);

        given().header("Authorization", "Bearer " + jeton)
                .when().get(CHEMIN + "/" + importId + "/brouillon")
                .then().statusCode(200)
                .body("publiable", equalTo(false))
                .body("exigencesAValider", equalTo(1))
                .body("preuvesAttenduesAValider", equalTo(1))
                .body("reglesAValider", equalTo(2))
                .body("elementsAValider.size()", equalTo(4));
    }

    @Test
    void laPublication_estRefuseeParLaBaseTantQueLeContenuNEstPasAccepte() {
        String jeton = jetonSuperAdmin();
        String importId = deposer(jeton);
        when(client.extraire(any())).thenReturn(reponseComplete(UUID.fromString(importId)));

        lancer(jeton, importId, cibleNeuve("REF_" + UUID.randomUUID().toString().substring(0, 8)))
                .statusCode(202);
        attendreFin(jeton, importId);

        String versionId = given().header("Authorization", "Bearer " + jeton)
                .when().get(CHEMIN + "/" + importId + "/brouillon")
                .then().statusCode(200).extract().path("versionId");

        // La garantie n'est pas dans le code applicatif mais dans le
        // déclencheur de V57 : elle tient donc aussi pour un script
        // d'exploitation ou un endpoint ajouté plus tard.
        var erreur = org.junit.jupiter.api.Assertions.assertThrows(Exception.class,
                () -> publierEnBase(versionId));
        assertTrue(deroule(erreur).contains("validé"),
                "Le refus doit venir de la base, avec un motif explicite : " + deroule(erreur));
    }

    /**
     * Tente la publication en contournant tout le code applicatif.
     *
     * {@code QuarkusTransaction} plutôt que {@code @Transactional} : sur une
     * méthode que la classe s'appelle à elle-même, l'intercepteur CDI n'agit
     * pas, et l'écriture partirait hors transaction.
     */
    private void publierEnBase(String versionId) {
        io.quarkus.narayana.jta.QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery(
                            "UPDATE referentiel_version SET statut = 'PUBLIEE' WHERE id = '"
                                    + versionId + "'")
                    .executeUpdate();
            entityManager.flush();
        });
    }

    // === 5. Atomicité et refus de contenu ===================================

    @Test
    void unContenuIncoherent_neLaisseAucunBrouillon() {
        String jeton = jetonSuperAdmin();
        String code = "REF_" + UUID.randomUUID().toString().substring(0, 8);
        String importId = deposer(jeton);

        // Un critère se rattache à un sous-domaine qui n'existe pas : la
        // hiérarchie ne peut pas être reconstruite.
        var critere = new ExtractionReferentielResponseDto.CritereDto(
                null, null, null,
                "D1-01", "Critère orphelin", null, "SD-INEXISTANT", "GENERALE", null, 1.0, 1,
                List.of(), List.of(), List.of());
        var domaine = new ExtractionReferentielResponseDto.DomaineDto(
                "D1", "Domaine", null, 1, List.of(), List.of(critere));
        when(client.extraire(any())).thenReturn(new ExtractionReferentielResponseDto(
                UUID.fromString(importId),
                new ExtractionReferentielResponseDto.BrouillonDto(null, List.of(domaine)),
                Map.of()));

        lancer(jeton, importId, cibleNeuve(code)).statusCode(202);
        assertEquals("ECHEC", attendreFin(jeton, importId));

        // Ni version à moitié remplie, ni domaine orphelin : le référentiel
        // lui-même a disparu avec la transaction annulée.
        assertEquals(0, compter("SELECT count(*) FROM referentiel WHERE code = '" + code + "'"),
                "Une création partielle laisserait un référentiel vide impossible à distinguer "
                        + "d'un référentiel neuf");
    }

    @Test
    void uneRegleMalParametree_faitEchouerToutLImport() {
        String jeton = jetonSuperAdmin();
        String code = "REF_" + UUID.randomUUID().toString().substring(0, 8);
        String importId = deposer(jeton);

        // DATE_VALIDITE attend un champ ; sans lui la règle serait insérée
        // vide, et l'agent d'analyse ne saurait pas quoi contrôler.
        var regle = new ExtractionReferentielResponseDto.RegleDto(
                null, null, null,
                "R1", "DATE_VALIDITE", "Vérifier la validité", "MOYENNE", null, null, Map.of());
        var critere = new ExtractionReferentielResponseDto.CritereDto(
                null, null, null,
                "D1-01", "Critère", null, null, "GENERALE", null, 1.0, 1,
                List.of(), List.of(), List.of(regle));
        var domaine = new ExtractionReferentielResponseDto.DomaineDto(
                "D1", "Domaine", null, 1, List.of(), List.of(critere));
        when(client.extraire(any())).thenReturn(new ExtractionReferentielResponseDto(
                UUID.fromString(importId),
                new ExtractionReferentielResponseDto.BrouillonDto(null, List.of(domaine)),
                Map.of()));

        lancer(jeton, importId, cibleNeuve(code)).statusCode(202);
        assertEquals("ECHEC", attendreFin(jeton, importId));
        assertEquals(0, compter("SELECT count(*) FROM referentiel WHERE code = '" + code + "'"));

        given().header("Authorization", "Bearer " + jeton)
                .when().get(CHEMIN + "/" + importId)
                .then().statusCode(200)
                .body("erreur", containsString("R1"));
    }

    @Test
    void unTypeInconnu_estRefuseAuLieuDEtreCorrige() {
        String jeton = jetonSuperAdmin();
        String importId = deposer(jeton);

        var preuve = new ExtractionReferentielResponseDto.PreuveAttendueDto(
                null, null, null,
                "TYPE_QUI_N_EXISTE_PAS", "Une pièce", null, true, 1);
        var exigence = new ExtractionReferentielResponseDto.ExigenceDto(
                null, null, null,
                "E1", "Intitulé", "Énoncé", 1, List.of(preuve));
        var critere = new ExtractionReferentielResponseDto.CritereDto(
                null, null, null,
                "D1-01", "Critère", null, null, "GENERALE", null, 1.0, 1,
                List.of(), List.of(exigence), List.of());
        var domaine = new ExtractionReferentielResponseDto.DomaineDto(
                "D1", "Domaine", null, 1, List.of(), List.of(critere));
        when(client.extraire(any())).thenReturn(new ExtractionReferentielResponseDto(
                UUID.fromString(importId),
                new ExtractionReferentielResponseDto.BrouillonDto(null, List.of(domaine)),
                Map.of()));

        lancer(jeton, importId, cibleNeuve("REF_" + UUID.randomUUID().toString().substring(0, 8)))
                .statusCode(202);
        assertEquals("ECHEC", attendreFin(jeton, importId));

        // Retomber sur AUTRE ferait entrer dans le catalogue une pièce dont
        // le type ne dit rien, et que personne ne saurait relire.
        given().header("Authorization", "Bearer " + jeton)
                .when().get(CHEMIN + "/" + importId)
                .then().body("erreur", containsString("TYPE_QUI_N_EXISTE_PAS"));
    }

    @Test
    void deuxCriteresDeMemeCode_sontRefusesPlutotQueFusionnes() {
        String jeton = jetonSuperAdmin();
        String importId = deposer(jeton);

        var critere = new ExtractionReferentielResponseDto.CritereDto(
                null, null, null,
                "D1-01", "Critère", null, null, "GENERALE", null, 1.0, 1,
                List.of(), List.of(), List.of());
        var domaine = new ExtractionReferentielResponseDto.DomaineDto(
                "D1", "Domaine", null, 1, List.of(), List.of(critere, critere));
        when(client.extraire(any())).thenReturn(new ExtractionReferentielResponseDto(
                UUID.fromString(importId),
                new ExtractionReferentielResponseDto.BrouillonDto(null, List.of(domaine)),
                Map.of()));

        lancer(jeton, importId, cibleNeuve("REF_" + UUID.randomUUID().toString().substring(0, 8)))
                .statusCode(202);
        assertEquals("ECHEC", attendreFin(jeton, importId));
    }

    // === 6. Défaillances du service d'agents ================================

    @Test
    void serviceInjoignable_donneUnMotifSansTraceDExecution() {
        String jeton = jetonSuperAdmin();
        String importId = deposer(jeton);
        when(client.extraire(any())).thenThrow(new ProcessingException("Connection refused"));

        lancer(jeton, importId, cibleNeuve("REF_" + UUID.randomUUID().toString().substring(0, 8)))
                .statusCode(202);
        assertEquals("ECHEC", attendreFin(jeton, importId));

        String erreur = given().header("Authorization", "Bearer " + jeton)
                .when().get(CHEMIN + "/" + importId)
                .then().statusCode(200).extract().path("erreur");

        assertTrue(erreur.contains("injoignable"), "Motif inattendu : " + erreur);
        assertFalse(erreur.contains("com.smartexsustway") || erreur.contains("Exception"),
                "Le motif est réaffiché à l'administrateur : il ne doit pas décrire "
                        + "l'intérieur du service — « " + erreur + " »");
    }

    @Test
    void quotaAtteint_dItAQuiRelanceCeQuIlPeutFaire() {
        String jeton = jetonSuperAdmin();
        String importId = deposer(jeton);
        when(client.extraire(any())).thenThrow(
                new WebApplicationException(Response.status(429).build()));

        lancer(jeton, importId, cibleNeuve("REF_" + UUID.randomUUID().toString().substring(0, 8)))
                .statusCode(202);
        assertEquals("ECHEC", attendreFin(jeton, importId));

        given().header("Authorization", "Bearer " + jeton)
                .when().get(CHEMIN + "/" + importId)
                .then().body("erreur", containsString("quota"));
    }

    @Test
    void appelRefuseParLeServiceDAgents_designeLaConfigurationDesCles() {
        String jeton = jetonSuperAdmin();
        String importId = deposer(jeton);
        when(client.extraire(any())).thenThrow(
                new WebApplicationException(Response.status(401).build()));

        lancer(jeton, importId, cibleNeuve("REF_" + UUID.randomUUID().toString().substring(0, 8)))
                .statusCode(202);
        assertEquals("ECHEC", attendreFin(jeton, importId));

        given().header("Authorization", "Bearer " + jeton)
                .when().get(CHEMIN + "/" + importId)
                .then().body("erreur", containsString("clés de signature"));
    }

    @Test
    void lesMesuresDeLExtraction_sontConserveesAvecLImport() {
        String jeton = jetonSuperAdmin();
        String importId = deposer(jeton);
        when(client.extraire(any())).thenReturn(reponseComplete(UUID.fromString(importId)));

        lancer(jeton, importId, cibleNeuve("REF_" + UUID.randomUUID().toString().substring(0, 8)))
                .statusCode(202);
        attendreFin(jeton, importId);

        given().header("Authorization", "Bearer " + jeton)
                .when().get(CHEMIN + "/" + importId)
                .then().statusCode(200)
                // Ce que le service d'agents a mesuré du fichier est la seule
                // trace de ce qui s'est passé entre le document et le brouillon.
                .body("metadonnees.lots", equalTo(1))
                .body("metadonnees.modele", equalTo("gemini-3.5-flash-lite"))
                .body("metadonnees.elements_deposes.criteres", equalTo(1))
                .body("metadonnees.elements_deposes.exigences", equalTo(1));
    }

    @Test
    void leBrouillon_nEstConsultableQuUneFoisGenere() {
        String jeton = jetonSuperAdmin();
        String importId = deposer(jeton);

        given().header("Authorization", "Bearer " + jeton)
                .when().get(CHEMIN + "/" + importId + "/brouillon")
                .then().statusCode(409);
    }

    // === Outillage ==========================================================

    private static Map<?, ?> chargeUtile(String jetonOuSegment) throws Exception {
        String segment = jetonOuSegment.contains(".")
                ? jetonOuSegment.split("\\.")[1]
                : jetonOuSegment;
        return JSON.readValue(Base64.getUrlDecoder().decode(segment), Map.class);
    }

    private static String deroule(Throwable e) {
        var texte = new StringBuilder();
        for (Throwable courant = e; courant != null; courant = courant.getCause()) {
            texte.append(courant.getMessage()).append(' ');
        }
        return texte.toString();
    }
}
