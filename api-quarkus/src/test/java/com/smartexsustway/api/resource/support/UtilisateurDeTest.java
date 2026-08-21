package com.smartexsustway.api.resource.support;

import com.smartexsustway.api.domain.entity.Entreprise;
import com.smartexsustway.api.domain.entity.Role;
import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.RoleRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.restassured.http.ContentType;

import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;

/**
 * Helper partagé entre les tests d'intégration : inscrit, vérifie l'email
 * et connecte un utilisateur de test fraîchement créé, pour obtenir un
 * token JWT utilisable dans les tests d'endpoints protégés
 * (EntrepriseResource, SiteResource...).
 *
 * Chaque appel utilise un email unique (UUID) — voir AuthResourceTest pour
 * le pourquoi (tests exécutés contre la vraie base de dev).
 */
public final class UtilisateurDeTest {

    public final String email;
    public final String motDePasse;
    public final String id;
    public final String token;

    private UtilisateurDeTest(String email, String motDePasse, String id, String token) {
        this.email = email;
        this.motDePasse = motDePasse;
        this.id = id;
        this.token = token;
    }

    public static UtilisateurDeTest creerEtConnecter(JwtService jwtService) {
        String email = "test-" + UUID.randomUUID() + "@example.com";
        String motDePasse = "motdepasse123";

        String id = given()
                .contentType(ContentType.JSON)
                .body(Map.of("nom", "Test", "prenom", "User", "email", email, "motDePasse", motDePasse))
                .when().post("/api/v1/auth/inscription")
                .then().statusCode(201)
                .extract().path("id");

        String tokenVerification = jwtService.genererTokenVerificationEmail(UUID.fromString(id));
        given().queryParam("token", tokenVerification)
                .when().get("/api/v1/auth/verification-email")
                .then().statusCode(200);

        String token = given()
                .contentType(ContentType.JSON)
                .body(Map.of("email", email, "motDePasse", motDePasse))
                .when().post("/api/v1/auth/connexion")
                .then().statusCode(200)
                .extract().path("token");

        return new UtilisateurDeTest(email, motDePasse, id, token);
    }

    /**
     * Compte de test rattaché à un rôle donné (SUPER_ADMIN, ADMIN_AUDIT,
     * EXPERT_REVIEWER...) sur une entreprise support. Comme il n'existe
     * aucun endpoint pour attribuer un rôle (voir CDC, TODO phase F), le
     * rattachement est posé directement en base — même contournement que
     * les scripts de test manuels du dépôt (test_backoffice_crud.ps1).
     *
     * L'entreprise support est créée par un utilisateur JETABLE distinct,
     * jamais par le candidat lui-même : le rôle embarqué dans le JWT est
     * celui du rattachement le plus ANCIEN (AuthResource.emettreTokenSession,
     * tri par dateAffectation) — si le candidat créait sa propre entreprise
     * au préalable, RG05 le rattacherait automatiquement comme
     * RESPONSABLE_ENTREPRISE, rattachement plus ancien qui l'emporterait
     * sur le rôle posé ensuite.
     */
    public static UtilisateurDeTest creerAvecRole(JwtService jwtService, String roleCode,
                                                   UtilisateurRepository utilisateurRepository,
                                                   EntrepriseRepository entrepriseRepository,
                                                   RoleRepository roleRepository,
                                                   UtilisateurEntrepriseRepository utilisateurEntrepriseRepository) {
        UtilisateurDeTest candidat = creerEtConnecter(jwtService);
        UtilisateurDeTest createurEntreprise = creerEtConnecter(jwtService);

        String entrepriseId = given()
                .header("Authorization", "Bearer " + createurEntreprise.token)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "raisonSociale", "Entreprise Support Role Test",
                        "identifiantLegal", "RCCM-ROLE-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD",
                        "periodicite", "ANNUELLE"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201)
                .extract().path("entreprise.id");

        Entreprise entreprise = entrepriseRepository.findById(UUID.fromString(entrepriseId));
        UUID candidatId = UUID.fromString(candidat.id);
        QuarkusTransaction.requiringNew().run(() -> {
            Role role = roleRepository.parCode(roleCode).orElseThrow();
            var utilisateur = utilisateurRepository.findById(candidatId);
            utilisateurEntrepriseRepository.persist(new UtilisateurEntreprise(utilisateur, entreprise, null, role));
        });

        String token = given()
                .contentType(ContentType.JSON)
                .body(Map.of("email", candidat.email, "motDePasse", candidat.motDePasse))
                .when().post("/api/v1/auth/connexion")
                .then().statusCode(200)
                .extract().path("token");

        return new UtilisateurDeTest(candidat.email, candidat.motDePasse, candidat.id, token);
    }
}
