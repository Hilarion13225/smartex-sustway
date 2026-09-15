package com.smartexsustway.api.resource;

import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.RapportRepository;
import com.smartexsustway.api.domain.repository.RoleRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.security.JwtService;
import com.smartexsustway.api.stockage.StorageService;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Le rapport comme livrable de l'audit.
 *
 * <p>Ce que l'audit produit — axes retenus, plans, actions, responsables,
 * échéances — n'avait jusqu'ici aucune sortie : tout restait à l'écran. Ces
 * tests vérifient que le document rendu au client contient réellement ce
 * travail, et seulement ce qui a été décidé.
 *
 * <p>Deux exigences s'y croisent. Le <strong>contenu</strong> : un axe validé
 * y figure, un axe proposé non — présenter une suggestion de machine comme une
 * recommandation d'auditeur serait un contresens. Et l'<strong>accès</strong> :
 * le fichier déposé dans le stockage n'est jamais atteignable autrement que par
 * l'API, qui rejoue le même contrôle qu'à la génération.
 */
@QuarkusTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class RapportEnrichiTest {

    @Inject JwtService jwtService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject RapportRepository rapportRepository;
    @Inject StorageService storageService;

    private record Mission(String entrepriseId, String auditId, String critereId, String token) {
    }

    private Mission mission;
    private Mission etrangere;
    private String jetonStaff;

    /**
     * Un compte portant `rapport:detaille`.
     *
     * <p>Cette permission n'appartient qu'à SUPER_ADMIN : le responsable
     * d'entreprise, pourtant créateur de la mission, ne peut pas produire de
     * rapport détaillé. La convention est celle de RapportResourceTest.
     */
    private String jetonStaff() {
        if (jetonStaff == null) {
            jetonStaff = UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                    utilisateurRepository, entrepriseRepository, roleRepository,
                    utilisateurEntrepriseRepository).token;
        }
        return jetonStaff;
    }

    private Mission mission() {
        if (mission == null) {
            mission = construireMission("Entreprise Rapport Enrichi");
            preparerContenu(mission);
        }
        return mission;
    }

    private Mission etrangere() {
        if (etrangere == null) etrangere = construireMission("Entreprise Rapport Etrangere");
        return etrangere;
    }

    private Mission construireMission(String raisonSociale) {
        var proprietaire = UtilisateurDeTest.creerEtConnecter(jwtService);

        String entrepriseId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .contentType(ContentType.JSON)
                .body(Map.of("raisonSociale", raisonSociale,
                        "identifiantLegal", "RCCM-RAPP-" + UUID.randomUUID(),
                        "formuleCode", "AVANCEES"))
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
                        "nom", "Mission rapport enrichi",
                        "dateDebut", LocalDate.now().toString()))
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits")
                .then().statusCode(201).extract().path("id");

        String critereId = given()
                .header("Authorization", "Bearer " + proprietaire.token)
                .when().get("/api/v1/entreprises/" + entrepriseId + "/audits/" + auditId + "/criteres")
                .then().statusCode(200).extract().path("[0].id");

        return new Mission(entrepriseId, auditId, critereId, proprietaire.token);
    }

    /** Un axe validé, un axe proposé, un plan et une action affectée. */
    private void preparerContenu(Mission m) {
        String axeValide = creerAxe(m, "AXE-VALIDE-RAPPORT formaliser la politique");
        given().header("Authorization", "Bearer " + m.token()).contentType(ContentType.JSON)
                .when().post(urlAxes(m) + "/" + axeValide + "/validation").then().statusCode(200);
        creerAxe(m, "AXE-PROPOSE-RAPPORT ne doit pas figurer");

        String planId = given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("titre", "PLAN-RAPPORT gouvernance", "dateEcheance", "2026-12-31"))
                .when().post(urlPlans(m)).then().statusCode(201).extract().path("id");

        var candidat = UtilisateurDeTest.creerEtConnecter(jwtService);
        rattacher(UUID.fromString(candidat.id), UUID.fromString(m.entrepriseId()), "COLLABORATEUR");

        given().header("Authorization", "Bearer " + m.token()).contentType(ContentType.JSON)
                .body(Map.of("titre", "ACTION-RAPPORT rédiger la politique",
                        "responsableId", candidat.id,
                        "dateEcheance", "2026-11-30",
                        "axeIds", List.of(axeValide)))
                .when().post(urlPlans(m) + "/" + planId + "/actions").then().statusCode(201);

        given().header("Authorization", "Bearer " + m.token()).contentType(ContentType.JSON)
                .body(Map.of("titre", "ACTION-RAPPORT seconde tâche"))
                .when().post(urlPlans(m) + "/" + planId + "/actions").then().statusCode(201);
    }

    private String creerAxe(Mission m, String libelle) {
        return given().header("Authorization", "Bearer " + m.token())
                .contentType(ContentType.JSON)
                .body(Map.of("libelle", libelle, "auditCritereId", m.critereId()))
                .when().post(urlAxes(m)).then().statusCode(201).extract().path("id");
    }

    @Transactional
    void rattacher(UUID utilisateurId, UUID entrepriseId, String roleCode) {
        var role = roleRepository.parCode(roleCode).orElseThrow();
        utilisateurEntrepriseRepository.persist(new UtilisateurEntreprise(
                utilisateurRepository.findById(utilisateurId),
                entrepriseRepository.findById(entrepriseId), null, role));
    }

    private String urlAxes(Mission m) {
        return "/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId() + "/axes-amelioration";
    }

    private String urlPlans(Mission m) {
        return "/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId() + "/plans-action";
    }

    private String urlRapports(Mission m) {
        return "/api/v1/entreprises/" + m.entrepriseId() + "/audits/" + m.auditId() + "/rapports";
    }

    private String generer(Mission m, String type, String format, String jeton) {
        return given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON).body(Map.of("type", type, "format", format))
                .when().post(urlRapports(m)).then().statusCode(201).extract().path("id");
    }

    private String telechargerTexte(Mission m, String rapportId, String jeton) {
        return given().header("Authorization", "Bearer " + jeton)
                .when().get(urlRapports(m) + "/" + rapportId + "/telechargement")
                .then().statusCode(200).extract().asString();
    }

    // === 5.9-A : contenu du livrable =====================================

    @Test
    void leRapportDetailleContientLesAxesValides() {
        Mission m = mission();
        String id = generer(m, "DETAILLE", "CSV", jetonStaff());
        String contenu = telechargerTexte(m, id, jetonStaff());

        assertTrue(contenu.contains("Axes d'amelioration valides"));
        assertTrue(contenu.contains("AXE-VALIDE-RAPPORT formaliser la politique"));
    }

    @Test
    void unAxeProposeNeFigurePasDansLeLivrable() {
        Mission m = mission();
        String contenu = telechargerTexte(m, generer(m, "DETAILLE", "CSV", jetonStaff()), jetonStaff());

        // Un axe que personne n'a accepté n'est pas une recommandation
        // d'auditeur : le présenter comme telle dans le document remis au
        // client donnerait à une sortie de modèle une autorité qu'elle n'a pas.
        assertFalse(contenu.contains("AXE-PROPOSE-RAPPORT"));
    }

    @Test
    void leRapportDetailleContientLesPlansEtLeursActions() {
        Mission m = mission();
        String contenu = telechargerTexte(m, generer(m, "DETAILLE", "CSV", jetonStaff()), jetonStaff());

        assertTrue(contenu.contains("Plans d'amelioration"));
        assertTrue(contenu.contains("PLAN-RAPPORT gouvernance"));
        assertTrue(contenu.contains("ACTION-RAPPORT rédiger la politique"));
        assertTrue(contenu.contains("BROUILLON"), "le statut du plan est restitué");
    }

    @Test
    void leResponsableEtLEcheanceDUneActionSontRestitues() {
        Mission m = mission();
        String contenu = telechargerTexte(m, generer(m, "DETAILLE", "CSV", jetonStaff()), jetonStaff());

        assertTrue(contenu.contains("Responsable"));
        assertTrue(contenu.contains("30/11/2026") || contenu.contains("2026-11-30"),
                "l'échéance de l'action figure au rapport");
        assertTrue(contenu.contains("Non affectee"),
                "une action sans responsable le dit plutôt que de laisser un vide");
    }

    @Test
    void laProgressionVientDuBackendEtNonDuGenerateur() {
        Mission m = mission();
        String contenu = telechargerTexte(m, generer(m, "DETAILLE", "CSV", jetonStaff()), jetonStaff());

        // Deux actions, aucune terminée : la valeur est celle que le service
        // calcule pour l'écran, pas une seconde arithmétique.
        assertTrue(contenu.contains("Avancement;0%"), "avancement attendu : 0 %");
    }

    @Test
    void laVersionDuReferentielFigureAuRapport() {
        Mission m = mission();
        String contenu = telechargerTexte(m, generer(m, "DETAILLE", "CSV", jetonStaff()), jetonStaff());

        assertTrue(contenu.contains("Référentiel;SMARTEX_SUSTWAY v"),
                "le rapport dit sous quelle version la mission a été conduite");
    }

    // === 5.9-B : génération, stockage, téléchargement =====================

    @Test
    void leFichierEstReellementDeposeDansLeStockageEtRecuperable() {
        Mission m = mission();
        String rapportId = generer(m, "DETAILLE", "PDF", jetonStaff());

        // 1. La métadonnée existe, et porte sa clé.
        String cle = cleDuRapport(UUID.fromString(rapportId));
        assertNotNull(cle, "le rapport enregistré porte une clé de stockage");
        assertTrue(cle.startsWith("entreprises/" + m.entrepriseId() + "/rapports/"),
                "la clé range le fichier sous son entreprise : " + cle);

        // 2. Le fichier existe réellement dans le stockage — un 200 HTTP ne le
        //    prouve pas, c'est l'octet récupéré qui le prouve.
        byte[] octets = storageService.telecharger(cle);
        assertNotNull(octets);
        assertTrue(octets.length > 0, "le fichier stocké n'est pas vide");
        String entete = new String(octets, 0, Math.min(5, octets.length), StandardCharsets.ISO_8859_1);
        assertTrue(entete.startsWith("%PDF"), "le fichier stocké est bien un PDF : " + entete);

        // 3. Et il redescend par l'API.
        byte[] parApi = given().header("Authorization", "Bearer " + jetonStaff())
                .when().get(urlRapports(m) + "/" + rapportId + "/telechargement")
                .then().statusCode(200).extract().asByteArray();
        assertTrue(parApi.length > 0);
    }

    @Transactional
    String cleDuRapport(UUID rapportId) {
        var rapport = rapportRepository.findById(rapportId);
        return rapport == null ? null : rapport.getCheminStockage();
    }

    @Test
    void leRapportGenereApparaitDansLaListeDeLaMission() {
        Mission m = mission();
        String rapportId = generer(m, "DETAILLE", "CSV", jetonStaff());

        List<String> ids = given().header("Authorization", "Bearer " + jetonStaff())
                .when().get(urlRapports(m))
                .then().statusCode(200).extract().jsonPath().getList("id", String.class);

        assertTrue(ids.contains(rapportId));
    }

    // === Sécurité : D1, isolation, permissions ===========================

    @Test
    void leCollaborateurNObtientPasLeRapportDetaille() {
        Mission m = mission();
        var candidat = UtilisateurDeTest.creerEtConnecter(jwtService);
        rattacher(UUID.fromString(candidat.id), UUID.fromString(m.entrepriseId()), "COLLABORATEUR");
        String jeton = given().contentType(ContentType.JSON)
                .body(Map.of("email", candidat.email, "motDePasse", candidat.motDePasse))
                .when().post("/api/v1/auth/connexion").then().statusCode(200).extract().path("token");

        // Le rapport détaillé porte la justification de l'IA : D1 s'applique
        // aux documents générés comme aux écrans.
        given().header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON).body(Map.of("type", "DETAILLE", "format", "CSV"))
                .when().post(urlRapports(m))
                .then().statusCode(403);
    }

    @Test
    void leTelechargementRejoueLeControleDeLaGeneration() {
        Mission m = mission();
        String rapportId = generer(m, "DETAILLE", "CSV", jetonStaff());

        var candidat = UtilisateurDeTest.creerEtConnecter(jwtService);
        rattacher(UUID.fromString(candidat.id), UUID.fromString(m.entrepriseId()), "COLLABORATEUR");
        String jeton = given().contentType(ContentType.JSON)
                .body(Map.of("email", candidat.email, "motDePasse", candidat.motDePasse))
                .when().post("/api/v1/auth/connexion").then().statusCode(200).extract().path("token");

        // Un rapport déjà produit ne devient pas accessible parce qu'il
        // existe : le contrôle est rejoué au téléchargement.
        given().header("Authorization", "Bearer " + jeton)
                .when().get(urlRapports(m) + "/" + rapportId + "/telechargement")
                .then().statusCode(403);
    }

    @Test
    void leRapportDUneAutreEntrepriseNEstPasTelechargeable() {
        Mission m = mission();
        String rapportId = generer(m, "DETAILLE", "CSV", jetonStaff());
        Mission autre = etrangere();

        given().header("Authorization", "Bearer " + autre.token())
                .when().get(urlRapports(autre) + "/" + rapportId + "/telechargement")
                .then().statusCode(404);

        given().header("Authorization", "Bearer " + autre.token())
                .when().get(urlRapports(m) + "/" + rapportId + "/telechargement")
                .then().statusCode(403);
    }

    @Test
    void unRapportInexistantRend404() {
        Mission m = mission();

        given().header("Authorization", "Bearer " + jetonStaff())
                .when().get(urlRapports(m) + "/" + UUID.randomUUID() + "/telechargement")
                .then().statusCode(404);
    }

    // === Différenciation du contenu par rôle ==============================

    /** Un responsable d'entreprise rattaché à la mission. */
    private String jetonResponsable(Mission m) {
        var candidat = UtilisateurDeTest.creerEtConnecter(jwtService);
        rattacher(UUID.fromString(candidat.id), UUID.fromString(m.entrepriseId()), "RESPONSABLE_ENTREPRISE");
        return given().contentType(ContentType.JSON)
                .body(Map.of("email", candidat.email, "motDePasse", candidat.motDePasse))
                .when().post("/api/v1/auth/connexion").then().statusCode(200).extract().path("token");
    }

    @Test
    void leResponsableObtientUnDetailleAvecSesPlansEtSesAxes() {
        Mission m = mission();
        String jeton = jetonResponsable(m);
        String contenu = telechargerTexte(m, generer(m, "DETAILLE", "CSV", jeton), jeton);

        assertTrue(contenu.contains("Plans d'amelioration"));
        assertTrue(contenu.contains("PLAN-RAPPORT gouvernance"));
        assertTrue(contenu.contains("Axes d'amelioration valides"));
        assertTrue(contenu.contains("AXE-VALIDE-RAPPORT formaliser la politique"));
        assertTrue(contenu.contains("Avancement;"));
        assertTrue(contenu.contains("Score global;"));
    }

    @Test
    void leDetailleDuResponsableNeContientAucuneJustificationIa() {
        Mission m = mission();
        String jeton = jetonResponsable(m);
        String contenu = telechargerTexte(m, generer(m, "DETAILLE", "CSV", jeton), jeton);

        // L'assertion porte sur les octets du fichier, pas sur un champ que
        // l'interface aurait masqué : c'est la seule preuve qui vaille.
        assertFalse(contenu.contains("Justification"));
        assertFalse(contenu.contains("RAISONNEMENT"));
    }

    @Test
    void leDetailleDuResponsableEnPdfEstUnFichierReel() {
        Mission m = mission();
        String jeton = jetonResponsable(m);
        String rapportId = generer(m, "DETAILLE", "PDF", jeton);

        byte[] octets = given().header("Authorization", "Bearer " + jeton)
                .when().get(urlRapports(m) + "/" + rapportId + "/telechargement")
                .then().statusCode(200).extract().asByteArray();

        assertTrue(octets.length > 0);
        String entete = new String(octets, 0, Math.min(5, octets.length), StandardCharsets.ISO_8859_1);
        assertTrue(entete.startsWith("%PDF"));
        assertNotNull(cleDuRapport(UUID.fromString(rapportId)));
    }

    @Test
    void leDetailleDuStaffConserveSesJustifications() {
        Mission m = mission();
        String contenu = telechargerTexte(m, generer(m, "DETAILLE", "CSV", jetonStaff()), jetonStaff());

        assertTrue(contenu.contains("Justification"));
    }

    @Test
    void leResponsableNeTelechargePasLeDetailleProduitPourLeStaff() {
        Mission m = mission();
        String duStaff = generer(m, "DETAILLE", "CSV", jetonStaff());
        String jeton = jetonResponsable(m);

        // Le fichier du staff contient le raisonnement : le rendre au
        // responsable le lui livrerait, quelles que soient ses propres règles
        // de contenu.
        given().header("Authorization", "Bearer " + jeton)
                .when().get(urlRapports(m) + "/" + duStaff + "/telechargement")
                .then().statusCode(403);
    }

    @Test
    void unResponsableDUneAutreEntrepriseResteRefuse() {
        Mission m = mission();
        String intrus = jetonResponsable(etrangere());

        given().header("Authorization", "Bearer " + intrus)
                .contentType(ContentType.JSON).body(Map.of("type", "DETAILLE", "format", "CSV"))
                .when().post(urlRapports(m))
                .then().statusCode(403);
    }


    // === Régression : les quatre types restent cohérents ==================

    @Test
    void leRapportDeSyntheseNExposeAucuneJustificationIa() {
        Mission m = mission();
        String contenu = telechargerTexte(m, generer(m, "SYNTHESE", "CSV", m.token()), m.token());

        // La synthèse est ouverte à tous les rôles (`rapport:consulter`) :
        // elle ne doit porter que des constats, jamais le raisonnement.
        assertFalse(contenu.contains("Justification"));
        assertFalse(contenu.contains("justification"));
    }

    @Test
    void lesQuatreTypesRestentGenerables() {
        Mission m = mission();

        assertNotNull(generer(m, "SYNTHESE", "CSV", m.token()));
        assertNotNull(generer(m, "DETAILLE", "CSV", jetonStaff()));
        assertNotNull(generer(m, "PLAN_ACTION", "CSV", m.token()));
        // INDICE_FINANCEMENTS_VERTS exige un bailleur et la formule Avancées :
        // il est couvert par RapportResourceTest, et n'est pas rejoué ici.
    }

    @Test
    void leFormatExcelResteRefuse() {
        Mission m = mission();

        given().header("Authorization", "Bearer " + jetonStaff())
                .contentType(ContentType.JSON).body(Map.of("type", "DETAILLE", "format", "EXCEL"))
                .when().post(urlRapports(m))
                .then().statusCode(400);
    }
}
