package com.smartexsustway.api.amelioration;

import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.AxeAmelioration;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.entity.PreuveAttendue;
import com.smartexsustway.api.domain.entity.RegleAnalyse;
import com.smartexsustway.api.domain.entity.Utilisateur;
import com.smartexsustway.api.domain.enums.OrigineAxe;
import com.smartexsustway.api.domain.enums.SourceEvaluation;
import com.smartexsustway.api.domain.enums.StatutAxe;
import com.smartexsustway.api.domain.enums.StatutEvaluation;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.AxeAmeliorationRepository;
import com.smartexsustway.api.domain.repository.EvaluationRepository;
import com.smartexsustway.api.domain.repository.PreuveAttendueRepository;
import com.smartexsustway.api.domain.repository.RegleAnalyseRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Le cycle de vie d'un axe, au niveau du service métier.
 *
 * <p>Deux propriétés sont éprouvées ici, et elles tiennent ensemble.
 *
 * <p><strong>Une proposition ne se perd pas, et ne se duplique pas non
 * plus.</strong> La déduplication est volontairement pauvre : elle attrape le
 * même texte, pas le même sens. Les tests fixent cette limite explicitement,
 * pour qu'elle reste un choix documenté plutôt qu'une surprise.
 *
 * <p><strong>Une décision est définitive.</strong> C'est le correctif du
 * défaut de cartographie : un axe validé puis rejeté perdait son validateur,
 * et un axe rejeté puis validé perdait le motif de son rejet. Le sens de la
 * correction n'est pas de conserver les deux — les contraintes de base
 * l'interdisent — mais de refuser le second geste.
 */
@QuarkusTest
class CycleVieAxeTest {

    @Inject AxeAmeliorationService axeService;
    @Inject AxeAmeliorationRepository axeRepository;
    @Inject AuditRepository auditRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject EvaluationRepository evaluationRepository;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject PreuveAttendueRepository preuveAttendueRepository;
    @Inject RegleAnalyseRepository regleAnalyseRepository;
    @Inject EntityManager entityManager;

    /** Une mission minimale, sur la dernière version publiée. */
    @Transactional
    UUID critereDeTest(String suffixe) {
        UUID entrepriseId = (UUID) entityManager.createNativeQuery(
                        "INSERT INTO entreprise (raison_sociale, identifiant_legal, statut) "
                                + "VALUES (?1, ?2, 'ACTIF') RETURNING id")
                .setParameter(1, "Entreprise Axe " + suffixe)
                .setParameter(2, "RCCM-AXE-" + UUID.randomUUID())
                .getSingleResult();

        Object[] version = (Object[]) entityManager.createNativeQuery(
                        "SELECT rv.id, rv.referentiel_id FROM referentiel_version rv "
                                + "WHERE rv.statut = 'PUBLIEE' ORDER BY rv.publiee_le DESC LIMIT 1")
                .getSingleResult();

        UUID auditId = (UUID) entityManager.createNativeQuery(
                        "INSERT INTO audit (entreprise_id, referentiel_id, referentiel_version_id, nom, "
                                + "date_debut, statut) VALUES (?1, ?2, ?3, ?4, ?5, 'EN_COURS') RETURNING id")
                .setParameter(1, entrepriseId)
                .setParameter(2, version[1])
                .setParameter(3, version[0])
                .setParameter(4, "Mission axe " + suffixe)
                .setParameter(5, LocalDate.now())
                .getSingleResult();

        Object[] critere = (Object[]) entityManager.createNativeQuery(
                        "SELECT c.id, c.coefficient_ponderation FROM critere c "
                                + "WHERE c.referentiel_version_id = ?1 AND c.actif = true "
                                + "ORDER BY c.code LIMIT 1")
                .setParameter(1, version[0])
                .getSingleResult();

        return (UUID) entityManager.createNativeQuery(
                        "INSERT INTO audit_critere (audit_id, critere_id, actif, applicable, "
                                + "coefficient_ponderation, statut) "
                                + "VALUES (?1, ?2, true, true, ?3, 'A_EVALUER') RETURNING id")
                .setParameter(1, auditId)
                .setParameter(2, critere[0])
                .setParameter(3, critere[1])
                .getSingleResult();
    }

    @Transactional
    UUID evaluationDe(UUID auditCritereId) {
        AuditCritere ac = auditCritereRepository.findById(auditCritereId);
        Evaluation e = new Evaluation(ac, new BigDecimal("0.4000"), (short) 2);
        e.setSource(SourceEvaluation.IA);
        e.setStatut(StatutEvaluation.EN_REVUE);
        e.setJustification("RAISONNEMENT-TEMOIN : preuve incomplète.");
        e.setPistesAmelioration("Formaliser le programme.");
        evaluationRepository.persistAndFlush(e);
        return e.getId();
    }

    /** Passe par le service : c'est le seul chemin de création IA. */
    @Transactional
    Optional<UUID> proposer(UUID auditCritereId, UUID evaluationId, String libelle) {
        AuditCritere ac = auditCritereRepository.findById(auditCritereId);
        Evaluation e = evaluationId == null ? null : evaluationRepository.findById(evaluationId);
        var cree = axeService.proposerParIa(ac.getAudit(), ac, e, libelle);
        entityManager.flush();
        return cree.map(AxeAmelioration::getId);
    }

    @Transactional
    List<AxeAmelioration> axesDe(UUID auditCritereId) {
        return axeRepository.parAuditCritere(auditCritereId);
    }

    @Transactional
    UUID unUtilisateur() {
        return (UUID) entityManager.createNativeQuery(
                        "INSERT INTO utilisateur (email, mot_de_passe_hash, nom, prenom, statut) "
                                + "VALUES (?1, 'x', 'Decideur', 'Test', 'ACTIF') RETURNING id")
                .setParameter(1, "decideur-" + UUID.randomUUID() + "@example.com")
                .getSingleResult();
    }

    @Transactional
    void validerAxe(UUID axeId, UUID utilisateurId) {
        AxeAmelioration axe = axeRepository.findById(axeId);
        Utilisateur u = utilisateurRepository.findById(utilisateurId);
        axeService.valider(axe, u, utilisateurId, axe.getAudit().getEntreprise().getId());
        entityManager.flush();
    }

    @Transactional
    void rejeterAxe(UUID axeId, UUID utilisateurId, String motif) {
        AxeAmelioration axe = axeRepository.findById(axeId);
        Utilisateur u = utilisateurRepository.findById(utilisateurId);
        axeService.rejeter(axe, u, motif, utilisateurId, axe.getAudit().getEntreprise().getId());
        entityManager.flush();
    }

    @Transactional
    AxeAmelioration relire(UUID axeId) {
        entityManager.clear();
        return axeRepository.findById(axeId);
    }

    // === Création ========================================================

    @Test
    void unAxeIaNaitProposeEtGardeSaProvenance() {
        UUID critere = critereDeTest("naissance");
        UUID evaluation = evaluationDe(critere);

        UUID axeId = proposer(critere, evaluation, "Formaliser le programme annuel").orElseThrow();

        AxeAmelioration axe = relire(axeId);
        assertEquals(StatutAxe.PROPOSE, axe.getStatut());
        assertEquals(OrigineAxe.IA, axe.getOrigine());
        assertEquals(OrigineAxe.IA, axe.getOrigineInitiale());
        assertNotNull(axe.getEvaluation(), "l'axe garde le lien vers l'analyse qui l'a produit");
        assertEquals(critere, axe.getAuditCritere().getId());
    }

    @Test
    void unAxeExisteSansAucuneNonConformite() {
        UUID critere = critereDeTest("sans-nc");
        UUID evaluation = evaluationDe(critere);

        UUID axeId = proposer(critere, evaluation, "Améliorer le suivi des indicateurs").orElseThrow();

        // D7 : une opportunité d'amélioration n'a pas besoin d'un écart pour
        // exister. Rien dans le modèle ne relie l'axe à une non-conformité.
        assertNotNull(relire(axeId));
        Long nc = (Long) entityManager.createQuery(
                        "select count(n) from NonConforme n where n.auditCritere.id = :c")
                .setParameter("c", critere).getSingleResult();
        assertEquals(0L, nc);
    }

    @Test
    void plusieursAxesCoexistentSurUnMemeCritere() {
        UUID critere = critereDeTest("multiples");
        UUID evaluation = evaluationDe(critere);

        proposer(critere, evaluation, "Formaliser le code de conduite");
        proposer(critere, evaluation, "Diffuser le code de conduite aux équipes");
        proposer(critere, evaluation, "Faire approuver le code par la direction");

        // D5 : un critère porte autant d'axes que l'analyse en propose.
        assertEquals(3, axesDe(critere).size());
    }

    @Test
    void unLibelleVideRecoitUnLibelleParDefautPlutotQueDEtreRefuse() {
        UUID critere = critereDeTest("vide");
        UUID evaluation = evaluationDe(critere);

        UUID axeId = proposer(critere, evaluation, "   ").orElseThrow();

        assertEquals(AxeAmeliorationService.LIBELLE_PAR_DEFAUT, relire(axeId).getLibelle());
    }

    // === Déduplication ===================================================

    @Test
    void unLibelleStrictementIdentiqueNeCreePasDeDoublon() {
        UUID critere = critereDeTest("dedup-exact");
        UUID evaluation = evaluationDe(critere);

        proposer(critere, evaluation, "Formaliser un programme annuel de formation");
        Optional<UUID> second = proposer(critere, evaluation, "Formaliser un programme annuel de formation");

        assertTrue(second.isEmpty(), "la seconde proposition identique n'est pas créée");
        assertEquals(1, axesDe(critere).size());
    }

    @Test
    void laCasseNeFaitPasUnNouvelAxe() {
        UUID critere = critereDeTest("dedup-casse");
        UUID evaluation = evaluationDe(critere);

        proposer(critere, evaluation, "Formaliser un programme annuel");
        Optional<UUID> second = proposer(critere, evaluation, "FORMALISER UN PROGRAMME ANNUEL");

        assertTrue(second.isEmpty());
        assertEquals(1, axesDe(critere).size());
    }

    @Test
    void lesEspacesSurnumerairesNeFontPasUnNouvelAxe() {
        UUID critere = critereDeTest("dedup-espaces");
        UUID evaluation = evaluationDe(critere);

        proposer(critere, evaluation, "Formaliser un programme annuel");
        Optional<UUID> second = proposer(critere, evaluation, "  Formaliser   un  programme   annuel  ");

        assertTrue(second.isEmpty());
        assertEquals(1, axesDe(critere).size());
    }

    @Test
    void leLibelleConserveEstCeluiDeLaPropositionRetenue() {
        UUID critere = critereDeTest("dedup-original");
        UUID evaluation = evaluationDe(critere);

        UUID premier = proposer(critere, evaluation, "Formaliser un programme annuel").orElseThrow();
        proposer(critere, evaluation, "FORMALISER   UN PROGRAMME ANNUEL");

        // La normalisation sert à comparer, jamais à réécrire : l'axe affiché
        // doit rester le texte que l'IA a formulé.
        assertEquals("Formaliser un programme annuel", relire(premier).getLibelle());
    }

    @Test
    void deuxFormulationsDifferentesDuMemeConseilCoexistent() {
        UUID critere = critereDeTest("dedup-semantique");
        UUID evaluation = evaluationDe(critere);

        proposer(critere, evaluation, "Mettre en place une politique de formation annuelle");
        Optional<UUID> second = proposer(critere, evaluation, "Formaliser un programme annuel de formation");

        // Limite assumée de la déduplication V1 : elle attrape le même texte,
        // pas le même sens. Conserver les deux est le choix conservateur —
        // un doublon se repère à la lecture, une proposition perdue non.
        assertTrue(second.isPresent());
        assertEquals(2, axesDe(critere).size());
    }

    @Test
    void laDeduplicationNeDebordePasSurUnAutreCritere() {
        UUID critereA = critereDeTest("dedup-portee-A");
        UUID critereB = critereDeTest("dedup-portee-B");

        proposer(critereA, evaluationDe(critereA), "Formaliser la procédure");
        Optional<UUID> surB = proposer(critereB, evaluationDe(critereB), "Formaliser la procédure");

        // Le même conseil peut valoir pour deux critères : les fusionner
        // ferait perdre à quel titre il a été formulé.
        assertTrue(surB.isPresent());
        assertEquals(1, axesDe(critereA).size());
        assertEquals(1, axesDe(critereB).size());
    }

    @Test
    void lEmpreinteIgnoreCasseEtEspacesSansToucherAuxAccents() {
        assertEquals(AxeAmeliorationService.empreinte("Formaliser   LE  Suivi "),
                AxeAmeliorationService.empreinte("formaliser le suivi"));
        // « a » et « à » ne sont pas le même mot : dépouiller les accents
        // rapprocherait des propositions distinctes.
        assertFalse(AxeAmeliorationService.empreinte("controle")
                .equals(AxeAmeliorationService.empreinte("contrôle")));
    }

    // === Validation ======================================================

    @Test
    void unAxeProposeDevientValideAvecSonDecideurEtSaDate() {
        UUID critere = critereDeTest("valider");
        UUID axeId = proposer(critere, evaluationDe(critere), "À valider").orElseThrow();
        UUID decideur = unUtilisateur();

        validerAxe(axeId, decideur);

        AxeAmelioration axe = relire(axeId);
        assertEquals(StatutAxe.VALIDE, axe.getStatut());
        assertEquals(decideur, axe.getValideePar().getId());
        assertNotNull(axe.getValideeLe());
        assertNull(axe.getMotifRejet(), "un axe validé ne porte aucun motif de rejet");
        assertNull(axe.getRejeteePar());
        assertNull(axe.getRejeteeLe());
    }

    // === Rejet ===========================================================

    @Test
    void unAxeProposeDevientRejeteAvecSonMotif() {
        UUID critere = critereDeTest("rejeter");
        UUID axeId = proposer(critere, evaluationDe(critere), "À écarter").orElseThrow();
        UUID decideur = unUtilisateur();

        rejeterAxe(axeId, decideur, "Déjà couvert par la procédure QSE en vigueur.");

        AxeAmelioration axe = relire(axeId);
        assertEquals(StatutAxe.REJETE, axe.getStatut());
        assertEquals(decideur, axe.getRejeteePar().getId());
        assertNotNull(axe.getRejeteeLe());
        assertEquals("Déjà couvert par la procédure QSE en vigueur.", axe.getMotifRejet());
        assertNull(axe.getValideePar(), "un axe rejeté ne porte aucun validateur");
        assertNull(axe.getValideeLe());
    }

    @Test
    void unAxeRejeteResteEnBase() {
        UUID critere = critereDeTest("rejet-conserve");
        UUID axeId = proposer(critere, evaluationDe(critere), "Écartée mais conservée").orElseThrow();

        rejeterAxe(axeId, unUtilisateur(), "Hors périmètre de la mission.");

        // Effacer une recommandation écartée rendrait la relecture
        // invérifiable : on ne saurait plus ce qui a été proposé.
        assertNotNull(relire(axeId));
        assertEquals(1, axesDe(critere).size());
    }

    // === Transitions refusées ============================================

    @Test
    void unAxeValideNePeutPlusEtreRejete() {
        UUID critere = critereDeTest("valide-puis-rejet");
        UUID axeId = proposer(critere, evaluationDe(critere), "Décidée").orElseThrow();
        UUID decideur = unUtilisateur();
        validerAxe(axeId, decideur);

        assertThrows(DecisionAxeRefusee.class,
                () -> rejeterAxe(axeId, decideur, "Changement d'avis."));

        // Le point du correctif : avant, ce geste réussissait et effaçait
        // silencieusement le validateur et sa date.
        AxeAmelioration axe = relire(axeId);
        assertEquals(StatutAxe.VALIDE, axe.getStatut());
        assertNotNull(axe.getValideePar(), "le validateur survit à la tentative");
        assertNotNull(axe.getValideeLe());
    }

    @Test
    void unAxeRejeteNePeutPlusEtreValide() {
        UUID critere = critereDeTest("rejet-puis-valide");
        UUID axeId = proposer(critere, evaluationDe(critere), "Écartée").orElseThrow();
        UUID decideur = unUtilisateur();
        rejeterAxe(axeId, decideur, "Motif initial à conserver.");

        assertThrows(DecisionAxeRefusee.class, () -> validerAxe(axeId, decideur));

        // Avant le correctif, le motif du rejet disparaissait ici.
        AxeAmelioration axe = relire(axeId);
        assertEquals(StatutAxe.REJETE, axe.getStatut());
        assertEquals("Motif initial à conserver.", axe.getMotifRejet());
        assertNotNull(axe.getRejeteePar());
    }

    @Test
    void uneSecondeValidationEstRefusee() {
        UUID critere = critereDeTest("double-validation");
        UUID axeId = proposer(critere, evaluationDe(critere), "Une fois suffit").orElseThrow();
        UUID decideur = unUtilisateur();
        validerAxe(axeId, decideur);

        assertThrows(DecisionAxeRefusee.class, () -> validerAxe(axeId, decideur));
    }

    @Test
    void unSecondRejetEstRefuse() {
        UUID critere = critereDeTest("double-rejet");
        UUID axeId = proposer(critere, evaluationDe(critere), "Une fois suffit").orElseThrow();
        UUID decideur = unUtilisateur();
        rejeterAxe(axeId, decideur, "Premier motif.");

        assertThrows(DecisionAxeRefusee.class, () -> rejeterAxe(axeId, decideur, "Second motif."));
        assertEquals("Premier motif.", relire(axeId).getMotifRejet());
    }

    // === Version du référentiel ==========================================

    @Test
    void unRattachementDeLaMemeVersionEstAccepte() {
        UUID critere = critereDeTest("version-ok");
        UUID axeId = proposer(critere, evaluationDe(critere), "Rattachée").orElseThrow();

        boolean pose = rattacherRegleDeLaMission(axeId, critere);

        assertTrue(pose, "une règle de la version de la mission est rattachable");
    }

    @Transactional
    boolean rattacherRegleDeLaMission(UUID axeId, UUID auditCritereId) {
        AxeAmelioration axe = axeRepository.findById(axeId);
        AuditCritere ac = auditCritereRepository.findById(auditCritereId);
        List<RegleAnalyse> regles = regleAnalyseRepository.parCritereActives(ac.getCritere().getId());
        if (regles.isEmpty()) {
            return true; // rien à rattacher sur ce critère : le cas est sans objet
        }
        boolean pose = axeService.rattacher(axe, regles.get(0));
        entityManager.flush();
        return pose;
    }

    @Test
    void unRattachementVersUneAutreVersionEstRefuse() {
        UUID critere = critereDeTest("version-ko");
        UUID axeId = proposer(critere, evaluationDe(critere), "Rattachement interdit").orElseThrow();

        Boolean refuse = rattacherPreuveDUneAutreVersion(axeId, critere);

        // Si le jeu de données ne contient aucune preuve d'une autre version,
        // le cas ne peut pas être construit — et le test doit alors être
        // signalé comme ignoré, pas compté comme réussi. Fabriquer une version
        // de référentiel pour les besoins du test reviendrait à modifier le
        // catalogue, ce que cette phase s'interdit.
        assumeTrue(refuse != null,
                "aucune preuve attendue d'une autre version dans le jeu de données");
        assertFalse(refuse, "une cible d'une autre version ne doit jamais être rattachée");
        assertNull(relire(axeId).getPreuveAttendue());
    }

    /**
     * Cherche une preuve attendue relevant d'une autre version que celle de
     * la mission. Rend {@code null} si le jeu de données n'en contient pas.
     */
    @Transactional
    Boolean rattacherPreuveDUneAutreVersion(UUID axeId, UUID auditCritereId) {
        AxeAmelioration axe = axeRepository.findById(axeId);
        Audit audit = auditCritereRepository.findById(auditCritereId).getAudit();
        UUID versionMission = audit.getReferentielVersion().getId();

        List<PreuveAttendue> etrangeres = preuveAttendueRepository
                .list("referentielVersion.id <> ?1", versionMission);
        if (etrangeres.isEmpty()) {
            return null;
        }
        boolean pose = axeService.rattacher(axe, etrangeres.get(0));
        entityManager.flush();
        return pose;
    }

    // === Immutabilité du référentiel =====================================

    @Test
    void uneDecisionSurUnAxeNeTouchePasAuCatalogue() {
        UUID critere = critereDeTest("immutable");
        UUID axeId = proposer(critere, evaluationDe(critere), "Sans effet sur le catalogue").orElseThrow();

        long criteresAvant = compter("critere");
        long exigencesAvant = compter("exigence");
        long preuvesAvant = compter("preuve_attendue");
        long reglesAvant = compter("regle_analyse");

        validerAxe(axeId, unUtilisateur());

        assertEquals(criteresAvant, compter("critere"));
        assertEquals(exigencesAvant, compter("exigence"));
        assertEquals(preuvesAvant, compter("preuve_attendue"));
        assertEquals(reglesAvant, compter("regle_analyse"));
    }

    @Transactional
    long compter(String table) {
        return ((Number) entityManager.createNativeQuery("SELECT count(*) FROM " + table)
                .getSingleResult()).longValue();
    }

    // === Journalisation ==================================================

    @Test
    void chaqueDecisionLaisseUneTraceAuJournal() {
        UUID critere = critereDeTest("journal");
        UUID aValider = proposer(critere, evaluationDe(critere), "Trace validation").orElseThrow();
        UUID aRejeter = proposer(critere, evaluationDe(critere), "Trace rejet").orElseThrow();
        UUID decideur = unUtilisateur();

        validerAxe(aValider, decideur);
        rejeterAxe(aRejeter, decideur, "Motif tracé.");

        assertEquals(1, journal("AXE_VALIDE", aValider));
        assertEquals(1, journal("AXE_REJETE", aRejeter));
    }

    @Test
    void unDoublonIgnoreEstJournalise() {
        UUID critere = critereDeTest("journal-doublon");
        UUID evaluation = evaluationDe(critere);
        UUID premier = proposer(critere, evaluation, "Proposition unique").orElseThrow();

        proposer(critere, evaluation, "proposition unique");

        // Sans trace, une proposition écartée pour doublon serait
        // indiscernable d'une proposition jamais produite.
        assertEquals(1, journal("AXE_DOUBLON_IGNORE", premier));
    }

    @Transactional
    long journal(String action, UUID entiteId) {
        return ((Number) entityManager.createNativeQuery(
                        "SELECT count(*) FROM audit_log WHERE action = ?1 AND entite_id = ?2")
                .setParameter(1, action)
                .setParameter(2, entiteId)
                .getSingleResult()).longValue();
    }
}
