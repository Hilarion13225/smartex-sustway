package com.smartexsustway.api.mission;

import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Critere;
import com.smartexsustway.api.domain.entity.Domaine;
import com.smartexsustway.api.domain.entity.Entreprise;
import com.smartexsustway.api.domain.entity.Exigence;
import com.smartexsustway.api.domain.entity.Referentiel;
import com.smartexsustway.api.domain.entity.ReferentielVersion;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.entity.UtilisateurEntreprise;
import com.smartexsustway.api.domain.enums.OrigineContenu;
import com.smartexsustway.api.domain.enums.StatutAudit;
import com.smartexsustway.api.domain.enums.TypeReferentiel;
import com.smartexsustway.api.domain.repository.AbonnementRepository;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.CritereRepository;
import com.smartexsustway.api.domain.repository.DomaineRepository;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.ExigenceRepository;
import com.smartexsustway.api.domain.repository.ReferentielRepository;
import com.smartexsustway.api.domain.repository.ReferentielVersionRepository;
import com.smartexsustway.api.domain.repository.RoleRepository;
import com.smartexsustway.api.domain.repository.UtilisateurEntrepriseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.ia.EvaluerCritereResponseDto;
import com.smartexsustway.api.ia.IaEvaluationClient;
import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.scoring.ScoreHistoriqueService;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Ce qui fait avancer une mission, et ce qui la clôt.
 *
 * Deux chemins menaient à TERMINE : la clôture, explicite et gouvernée par
 * `audit:cloturer` ; et l'analyse, qui y arrivait par un effet de bord de
 * l'instantané de score dès que tous les critères étaient évalués. Le second
 * rendait la permission de clôture contournable — analyser suffisait à figer
 * une mission — et ne laissait aucune trace au journal.
 *
 * Ces tests fixent la règle : analyser fait démarrer une mission, jamais la
 * terminer. Une mission entièrement instruite reste EN_COURS, ce que l'écran
 * des missions appelle « à valider ».
 *
 * Le décor porte deux critères seulement. C'est ce qui permet d'atteindre
 * réellement l'état « tout est évalué » — sur les 92 critères du catalogue,
 * le cas serait hors de portée d'un test, et c'est précisément ce cas que la
 * correction vise.
 */
@QuarkusTest
class CycleVieMissionTest {

    @Inject JwtService jwtService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject RoleRepository roleRepository;
    @Inject UtilisateurEntrepriseRepository utilisateurEntrepriseRepository;
    @Inject ReferentielRepository referentielRepository;
    @Inject ReferentielVersionRepository versionRepository;
    @Inject DomaineRepository domaineRepository;
    @Inject CritereRepository critereRepository;
    @Inject ExigenceRepository exigenceRepository;
    @Inject AuditRepository auditRepository;
    @Inject AbonnementRepository abonnementRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject AnalyseCritereService analyseCritereService;
    @Inject ClotureMissionService clotureMissionService;
    @Inject ScoreHistoriqueService scoreHistoriqueService;
    @Inject EntityManager entityManager;

    @InjectMock
    @RestClient
    IaEvaluationClient iaEvaluationClient;

    // === Décor ==============================================================

    /** Une mission de deux critères, chacun porteur de matière à analyser. */
    private record Mission(UUID auditId, List<UUID> auditCritereIds) {
    }

    private Mission mission() {
        return missionSur(null);
    }

    /**
     * Le décor, posé sur l'entreprise demandée — ou sur la première venue
     * quand la mission n'a pas à appartenir à quelqu'un en particulier.
     */
    private Mission missionSur(UUID entrepriseId) {
        var admin = UtilisateurDeTest.creerAvecRole(jwtService, "SUPER_ADMIN",
                utilisateurRepository, entrepriseRepository, roleRepository,
                utilisateurEntrepriseRepository);
        UUID adminId = UUID.fromString(admin.id);

        return QuarkusTransaction.requiringNew().call(() -> {
            Utilisateur auteur = utilisateurRepository.findById(adminId);
            Entreprise entreprise = entrepriseId == null
                    ? entrepriseRepository.listAll().get(0)
                    : entrepriseRepository.findById(entrepriseId);

            var referentiel = new Referentiel(
                    "CYC_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                    "Référentiel de cycle de vie", TypeReferentiel.SMARTEX);
            referentielRepository.persistAndFlush(referentiel);

            var version = new ReferentielVersion(referentiel, "1.0",
                    "Décor du cycle de vie.", 0, 0, auteur);
            versionRepository.persistAndFlush(version);

            var domaine = new Domaine(version, "D1", "Domaine de cycle");
            domaineRepository.persistAndFlush(domaine);

            var audit = new Audit(entreprise, version, "Mission de cycle de vie", LocalDate.now());
            // La formule de l'abonnement, comme le fait CreationMissionService :
            // c'est elle que le contrôle d'autorisation lit pour savoir si le
            // plan retire la permission demandée.
            abonnementRepository.leplusRecentParEntreprise(entreprise.getId())
                    .ifPresent(abonnement -> audit.setFormuleAbonnement(abonnement.getFormule()));
            auditRepository.persistAndFlush(audit);

            var ids = new ArrayList<UUID>();
            for (int rang = 1; rang <= 2; rang++) {
                var critere = new Critere(domaine, "D1-0" + rang, "Critère " + rang);
                critereRepository.persistAndFlush(critere);

                // Tout critère porte au moins une exigence — c'est ce que fait
                // la création réelle (CritereCreationResource), et ce que
                // vérifie ContenuMetierReferentielTest sur toute la table. Un
                // décor qui persiste un critère nu laisserait derrière lui une
                // donnée que le produit ne sait pas produire.
                var exigence = new Exigence(critere, critere.getCode() + "-E1",
                        critere.getLibelle(), critere.getLibelle());
                exigence.setOrigine(OrigineContenu.CONTENU_INITIAL);
                exigenceRepository.persistAndFlush(exigence);

                var auditCritere = new AuditCritere(audit, critere, critere.getCriticite(), BigDecimal.ONE);
                // Sans matière, `analyser` rend RienAAnalyser et n'écrit rien.
                auditCritere.setScenario("Scénario du critère " + rang + ".");
                auditCritereRepository.persistAndFlush(auditCritere);
                ids.add(auditCritere.getId());
            }
            return new Mission(audit.getId(), ids);
        });
    }

    /** Analyse un critère par le vrai service, avec un double pour le pipeline. */
    private void analyser(Mission mission, int rang) {
        when(iaEvaluationClient.evaluerCritere(any())).thenReturn(reponseNeutre());
        QuarkusTransaction.requiringNew().run(() ->
                analyseCritereService.analyser(
                        auditRepository.findById(mission.auditId()),
                        auditCritereRepository.findById(mission.auditCritereIds().get(rang))));
    }

    private StatutAudit statut(UUID auditId) {
        entityManager.clear();
        return auditRepository.findById(auditId).getStatut();
    }

    private long compterJournal(UUID auditId, String action) {
        entityManager.clear();
        return ((Number) entityManager.createNativeQuery(
                        "SELECT count(*) FROM audit_log WHERE entite = 'audit' "
                                + "AND entite_id = ?1 AND action = ?2")
                .setParameter(1, auditId).setParameter(2, action)
                .getSingleResult()).longValue();
    }

    // === 1-3. Le démarrage ==================================================

    @Test
    void uneMissionCreee_estUnBrouillon() {
        assertEquals(StatutAudit.BROUILLON, statut(mission().auditId()));
    }

    @Test
    void uneMissionSansEvaluation_resteUnBrouillon() {
        Mission mission = mission();

        // Rien ne s'est passé : ni analyse, ni score. Le statut ne doit pas
        // bouger de lui-même.
        assertEquals(StatutAudit.BROUILLON, statut(mission.auditId()));
    }

    @Test
    void laPremiereEvaluation_faitDemarrerLaMission() {
        Mission mission = mission();

        analyser(mission, 0);

        assertEquals(StatutAudit.EN_COURS, statut(mission.auditId()),
                "Une mission qui porte un critère instruit n'est plus un brouillon");
    }

    @Test
    void uneAnalysePartielle_laisseLaMissionEnCours() {
        Mission mission = mission();

        analyser(mission, 0);

        assertEquals(StatutAudit.EN_COURS, statut(mission.auditId()));
    }

    // === 4. Le cœur de la correction ========================================

    @Test
    void uneAnalyseComplete_neCloturePasLaMission() {
        Mission mission = mission();

        analyser(mission, 0);
        analyser(mission, 1);

        // Les deux critères de la mission sont évalués : c'est exactement le
        // cas où l'ancien code posait TERMINE, sans que personne n'ait
        // demandé la clôture ni détenu la permission de le faire.
        assertEquals(StatutAudit.EN_COURS, statut(mission.auditId()),
                "Analyser instruit une mission, cela ne la clôt pas");
        assertNotEquals(StatutAudit.TERMINE, statut(mission.auditId()));
    }

    @Test
    void uneAnalyseComplete_neJournalisAucuneCloture() {
        Mission mission = mission();

        analyser(mission, 0);
        analyser(mission, 1);

        assertEquals(0, compterJournal(mission.auditId(), "MISSION_CLOTUREE"),
                "Une mission close sans trace serait une mission close par personne");
    }

    // === 11. L'instantané de score n'est plus qu'un instantané ==============

    @Test
    void enregistrerUnScore_neChangeJamaisLeStatut() {
        Mission mission = mission();
        analyser(mission, 0);
        analyser(mission, 1);
        assertEquals(StatutAudit.EN_COURS, statut(mission.auditId()));

        // Appel direct, hors de tout flux d'analyse : le service d'instantané
        // ne doit rien décider du cycle de vie, même sur une mission
        // entièrement évaluée.
        QuarkusTransaction.requiringNew().run(() ->
                scoreHistoriqueService.enregistrer(auditRepository.findById(mission.auditId())));

        assertEquals(StatutAudit.EN_COURS, statut(mission.auditId()),
                "Historiser un score n'est pas une décision métier");
    }

    @Test
    void enregistrerUnScore_neFaitPasDemarrerUneMissionVierge() {
        Mission mission = mission();

        QuarkusTransaction.requiringNew().run(() ->
                scoreHistoriqueService.enregistrer(auditRepository.findById(mission.auditId())));

        assertEquals(StatutAudit.BROUILLON, statut(mission.auditId()));
    }

    // === 5-6. La clôture, seul chemin vers l'état terminal ==================

    @Test
    void laCloture_estLeSeulCheminVersTermine() {
        Mission mission = mission();
        analyser(mission, 0);
        analyser(mission, 1);

        assertTrue(clotureMissionService.obstacleACloture(mission.auditId()).isEmpty(),
                "Une mission entièrement analysée doit être clôturable");

        clotureMissionService.cloturer(mission.auditId());

        assertEquals(StatutAudit.TERMINE, statut(mission.auditId()));
    }

    @Test
    void uneMissionDejaClose_neSeRecloturePas() {
        Mission mission = mission();
        analyser(mission, 0);
        analyser(mission, 1);
        clotureMissionService.cloturer(mission.auditId());

        var obstacle = clotureMissionService.obstacleACloture(mission.auditId());

        assertTrue(obstacle.isPresent(), "La seconde clôture doit être refusée");
        assertTrue(obstacle.get().contains("déjà clôturée"), obstacle.get());
    }

    @Test
    void uneMissionClose_resteClose() {
        Mission mission = mission();
        analyser(mission, 0);
        clotureMissionService.cloturer(mission.auditId());
        assertEquals(StatutAudit.TERMINE, statut(mission.auditId()));

        // Analyser le critère restant ne doit ni rouvrir la mission, ni la
        // faire retomber en EN_COURS : les états terminaux le sont.
        analyser(mission, 1);

        assertEquals(StatutAudit.TERMINE, statut(mission.auditId()),
                "Une mission close ne redevient pas en cours parce qu'on l'analyse");
    }

    // === 12. La démonstration bout-en-bout : analyser n'est pas clôturer ====

    /**
     * `analyse:executer` ≠ `audit:cloturer`, prouvé de bout en bout.
     *
     * Les tests précédents passent par les services ; celui-ci passe par
     * l'API, avec un jeton réel, sur une identité qui ne détient que la
     * permission d'analyse. Il joue le scénario complet — instruire les deux
     * critères de la mission, puis tenter de la clôturer — parce que c'est
     * la combinaison des deux qui était vulnérable : avant cette correction,
     * l'analyse du dernier critère posait TERMINE toute seule, si bien que
     * le refus opposé à l'appel de clôture ne protégeait plus rien. La
     * mission était déjà close, sans permission et sans trace.
     *
     * Le rôle technique est celui d'{@code AutorisationAnalyseTest}
     * ({@code TEST_ANALYSE_SEULE}, `analyse:executer` et rien d'autre) :
     * l'insertion est tolérante au conflit, les deux classes peuvent donc
     * s'exécuter dans n'importe quel ordre.
     */
    @Test
    void analyseSeule_instruitToutLaMission_maisNeLaClotJamais() {
        creerRoleAnalyseSeule();

        // Une entreprise créée par un tiers jetable, puis le candidat y est
        // rattaché : s'il la créait lui-même, RG05 en ferait un
        // RESPONSABLE_ENTREPRISE, rattachement plus ancien dont le rôle
        // l'emporterait dans le jeton (voir UtilisateurDeTest).
        var createur = UtilisateurDeTest.creerEtConnecter(jwtService);
        String entrepriseId = given()
                .header("Authorization", "Bearer " + createur.token)
                .contentType(ContentType.JSON)
                .body(java.util.Map.of(
                        "raisonSociale", "Entreprise Cycle De Vie",
                        "identifiantLegal", "RCCM-CYC-" + UUID.randomUUID(),
                        "formuleCode", "STANDARD"))
                .when().post("/api/v1/entreprises")
                .then().statusCode(201)
                .extract().path("entreprise.id");

        var candidat = UtilisateurDeTest.creerEtConnecter(jwtService);
        rattacher(UUID.fromString(candidat.id), UUID.fromString(entrepriseId), ROLE_ANALYSE_SEULE);
        String jeton = given()
                .contentType(ContentType.JSON)
                .body(java.util.Map.of("email", candidat.email, "motDePasse", candidat.motDePasse))
                .when().post("/api/v1/auth/connexion")
                .then().statusCode(200)
                .extract().path("token");

        Mission mission = missionSur(UUID.fromString(entrepriseId));
        when(iaEvaluationClient.evaluerCritere(any())).thenReturn(reponseNeutre());

        // 1. L'analyse complète, par l'API, avec le seul droit d'analyser.
        for (UUID auditCritereId : mission.auditCritereIds()) {
            given()
                    .header("Authorization", "Bearer " + jeton)
                    .contentType(ContentType.JSON)
                    .body("{}")
                    .when().post("/api/v1/entreprises/" + entrepriseId + "/audits/" + mission.auditId()
                            + "/criteres/" + auditCritereId + "/evaluations")
                    .then().statusCode(201);
        }

        // 2. Les deux critères sont instruits : la mission est à 100 %.
        // Le backend n'expose aucun champ `progression` — l'écran des
        // missions la calcule à partir de ces deux compteurs — la
        // vérification porte donc sur eux.
        assertEquals(2, compterCriteres(mission.auditId(), null),
                "Le décor doit bien porter deux critères");
        assertEquals(2, compterCriteres(mission.auditId(), "EVALUE"),
                "Les deux critères doivent être évalués : progression 100 %");

        // 3. Et pourtant la mission n'est pas close.
        assertEquals(StatutAudit.EN_COURS, statut(mission.auditId()),
                "Une mission entièrement instruite reste EN_COURS — « à valider »");

        // 4. La clôture, elle, reste fermée à cette identité.
        given()
                .header("Authorization", "Bearer " + jeton)
                .contentType(ContentType.JSON)
                .body("{}")
                .when().post("/api/v1/entreprises/" + entrepriseId + "/audits/" + mission.auditId() + "/cloture")
                .then().statusCode(403);

        // 5. Le refus n'a rien laissé passer.
        assertEquals(StatutAudit.EN_COURS, statut(mission.auditId()),
                "Un refus de clôture ne doit pas laisser la mission changer d'état");
        assertEquals(0, compterJournal(mission.auditId(), "MISSION_CLOTUREE"),
                "Aucune clôture ne s'est produite : le journal ne doit rien en dire");
    }

    /** Rôle technique d'AutorisationAnalyseTest : `analyse:executer` seule. */
    private static final String ROLE_ANALYSE_SEULE = "TEST_ANALYSE_SEULE";

    @Transactional
    void creerRoleAnalyseSeule() {
        entityManager.createNativeQuery(
                        "INSERT INTO role (code, nom, description) VALUES (?1, ?2, ?3) "
                                + "ON CONFLICT (code) DO NOTHING")
                .setParameter(1, ROLE_ANALYSE_SEULE)
                .setParameter(2, "Rôle de test — analyse seule")
                .setParameter(3, "Créé pour isoler la capacité d'analyse de celle de clôture.")
                .executeUpdate();

        entityManager.createNativeQuery(
                        "INSERT INTO role_permission (role_id, permission_id) "
                                + "SELECT r.id, p.id FROM role r, permission p "
                                + "WHERE r.code = ?1 AND p.code = ?2 "
                                + "AND NOT EXISTS (SELECT 1 FROM role_permission rp "
                                + "                WHERE rp.role_id = r.id AND rp.permission_id = p.id)")
                .setParameter(1, ROLE_ANALYSE_SEULE).setParameter(2, "analyse:executer")
                .executeUpdate();
    }

    @Transactional
    void rattacher(UUID utilisateurId, UUID entrepriseId, String roleCode) {
        var role = roleRepository.parCode(roleCode).orElseThrow();
        utilisateurEntrepriseRepository.persist(new UtilisateurEntreprise(
                utilisateurRepository.findById(utilisateurId),
                entrepriseRepository.findById(entrepriseId), null, role));
    }

    /** Nombre de critères de la mission, tous statuts ou un seul. */
    private long compterCriteres(UUID auditId, String statut) {
        entityManager.clear();
        String sql = "SELECT count(*) FROM audit_critere WHERE audit_id = ?1"
                + (statut == null ? "" : " AND statut = ?2");
        var requete = entityManager.createNativeQuery(sql).setParameter(1, auditId);
        if (statut != null) {
            requete.setParameter(2, statut);
        }
        return ((Number) requete.getSingleResult()).longValue();
    }

    // === Outillage ==========================================================

    /** Réponse sans intérêt : ces tests portent sur le statut, pas sur la note. */
    private static EvaluerCritereResponseDto reponseNeutre() {
        return new EvaluerCritereResponseDto(
                UUID.randomUUID(), 0.8, 0.8, true, "Analyse de décor",
                List.of(), false, null, null, false, null);
    }
}
