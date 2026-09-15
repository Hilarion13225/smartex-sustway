package com.smartexsustway.api.conformite;

import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.entity.NonConforme;
import com.smartexsustway.api.domain.enums.SourceEvaluation;
import com.smartexsustway.api.domain.enums.StatutEvaluation;
import com.smartexsustway.api.domain.enums.StatutNonConformite;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.EvaluationRepository;
import com.smartexsustway.api.domain.repository.NonConformeRepository;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Une non-conformité courante par critère, et pas une de plus.
 *
 * <p>Le défaut corrigé : {@code genererSiNecessaire} persistait sans
 * condition, et aucune contrainte d'unicité ne l'en empêchait. Chaque
 * ré-analyse d'un critère non conforme créait une non-conformité de plus,
 * avec le même titre — la base de développement en portait 39 pour 22
 * critères, soit 17 lignes en excès.
 *
 * <p>Ce qui est éprouvé ici, ce n'est pas seulement l'absence de doublon :
 * c'est que la correction <strong>ne détruit rien</strong> et
 * <strong>ne réinitialise pas</strong> le travail humain déjà engagé sur
 * un écart.
 */
@QuarkusTest
class NonConformiteCouranteTest {

    @Inject NonConformiteService nonConformiteService;
    @Inject NonConformeRepository nonConformeRepository;
    @Inject EvaluationRepository evaluationRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject EntityManager entityManager;

    /**
     * Une mission minimale portant un critère de criticité connue.
     *
     * <p>La criticité est indispensable : sans elle, le service refuse de
     * tracer un écart plutôt que d'inventer un niveau arbitraire (RG37).
     */
    @Transactional
    UUID critereDeTest() {
        UUID entrepriseId = (UUID) entityManager.createNativeQuery(
                        "INSERT INTO entreprise (raison_sociale, identifiant_legal, statut) "
                                + "VALUES (?1, ?2, 'ACTIF') RETURNING id")
                .setParameter(1, "Entreprise NC courante")
                .setParameter(2, "RCCM-NCC-" + UUID.randomUUID())
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
                .setParameter(4, "Mission NC courante")
                .setParameter(5, LocalDate.now())
                .getSingleResult();

        Object[] critere = (Object[]) entityManager.createNativeQuery(
                        "SELECT c.id, c.coefficient_ponderation FROM critere c "
                                + "WHERE c.referentiel_version_id = ?1 AND c.actif = true "
                                + "ORDER BY c.code LIMIT 1")
                .setParameter(1, version[0])
                .getSingleResult();

        UUID criticiteId = (UUID) entityManager.createNativeQuery(
                        "SELECT id FROM criticite ORDER BY poids DESC LIMIT 1")
                .getSingleResult();

        return (UUID) entityManager.createNativeQuery(
                        "INSERT INTO audit_critere (audit_id, critere_id, actif, applicable, "
                                + "coefficient_ponderation, criticite_id, statut) "
                                + "VALUES (?1, ?2, true, true, ?3, ?4, 'A_EVALUER') RETURNING id")
                .setParameter(1, auditId)
                .setParameter(2, critere[0])
                .setParameter(3, critere[1])
                .setParameter(4, criticiteId)
                .getSingleResult();
    }

    /**
     * Une évaluation validée sur ce critère, avec la note voulue.
     *
     * <p>Le texte passé alimente les <em>pistes d'amélioration</em>, et non
     * la justification : depuis le correctif D1, le constat de la
     * non-conformité est bâti sur les pistes seules. La justification est
     * tout de même renseignée, avec un témoin distinct, pour que les tests
     * ci-dessous puissent vérifier qu'elle ne ressort nulle part.
     */
    @Transactional
    UUID analyser(UUID auditCritereId, int note, String pistes) {
        AuditCritere auditCritere = auditCritereRepository.findById(auditCritereId);
        // Probabilité cohérente avec la note : le service dérive le risque
        // attendu de la probabilité, pas de la note.
        BigDecimal probabilite = BigDecimal.valueOf(note).divide(BigDecimal.valueOf(5), 4, java.math.RoundingMode.HALF_UP);

        Evaluation evaluation = new Evaluation(auditCritere, probabilite, (short) note);
        evaluation.setSource(SourceEvaluation.IA);
        evaluation.setStatut(StatutEvaluation.VALIDEE);
        evaluation.setJustification("RAISONNEMENT-INTERNE : " + pistes);
        evaluation.setPistesAmelioration(pistes);
        evaluationRepository.persistAndFlush(evaluation);

        nonConformiteService.genererSiNecessaire(evaluation);
        entityManager.flush();
        return evaluation.getId();
    }

    @Transactional
    List<NonConforme> toutesLesNc(UUID auditCritereId) {
        return nonConformeRepository.list("auditCritere.id = ?1 order by createdAt asc", auditCritereId);
    }

    @Transactional
    void marquerEnTraitement(UUID auditCritereId) {
        nonConformeRepository.couranteParAuditCritere(auditCritereId)
                .orElseThrow()
                .setStatut(StatutNonConformite.EN_TRAITEMENT);
    }

    // === L'invariant ======================================================

    @Test
    void unePremiereAnalyseNonConformeCreeUneNonConformiteCourante() {
        UUID critereId = critereDeTest();

        analyser(critereId, 2, "Première analyse : preuve absente.");

        List<NonConforme> nc = toutesLesNc(critereId);
        assertEquals(1, nc.size());
        assertTrue(nc.get(0).isCourante());
        assertEquals(critereId, nc.get(0).getAuditCritere().getId());
    }

    @Test
    void uneReanalyseNeCreeAucunDoublon() {
        UUID critereId = critereDeTest();

        analyser(critereId, 2, "Première analyse.");
        analyser(critereId, 2, "Deuxième analyse.");
        analyser(critereId, 2, "Troisième analyse.");

        // Le comportement d'avant aurait produit trois lignes portant le
        // même titre — c'est exactement ainsi que la base est arrivée à 39
        // non-conformités pour 22 critères.
        List<NonConforme> nc = toutesLesNc(critereId);
        assertEquals(1, nc.size(), "trois analyses du même écart ne font qu'un écart");
        assertTrue(nc.get(0).isCourante());
    }

    @Test
    void uneReanalyseActualiseLaDescriptionEtLaGravite() {
        UUID critereId = critereDeTest();
        analyser(critereId, 1, "Écart majeur constaté.");
        var apresPremiere = toutesLesNc(critereId).get(0);
        var graviteInitiale = apresPremiere.getNiveau();

        // Le critère s'améliore sans devenir conforme : l'écart demeure,
        // mais il est moins grave.
        analyser(critereId, 4, "Écart résiduel après remédiation partielle.");

        List<NonConforme> nc = toutesLesNc(critereId);
        assertEquals(1, nc.size());
        assertTrue(nc.get(0).getDescription().contains("Écart résiduel après remédiation partielle."),
                "le constat suit la dernière analyse");
        // D1 : la ré-actualisation ne doit pas réintroduire par la bande le
        // raisonnement que le correctif vient d'en retirer.
        assertFalse(nc.get(0).getDescription().contains("RAISONNEMENT-INTERNE"),
                "actualiser un écart ne fait pas rentrer la justification IA");
        assertNotNull(nc.get(0).getNiveau());
        assertTrue(nc.get(0).getNiveau() != graviteInitiale
                        || nc.get(0).getRisqueAttendu() != null,
                "la ré-analyse doit rafraîchir la gravité ou le risque attendu");
    }

    @Test
    void uneReanalyseNeReinitialisePasLeStatutMetier() {
        UUID critereId = critereDeTest();
        analyser(critereId, 2, "Écart initial.");

        // Quelqu'un a commencé à traiter l'écart.
        marquerEnTraitement(critereId);

        analyser(critereId, 2, "Écart toujours présent.");

        // Relancer une analyse ne doit pas effacer le travail engagé, ni
        // orpheliner les actions correctives rattachées.
        assertEquals(StatutNonConformite.EN_TRAITEMENT,
                toutesLesNc(critereId).get(0).getStatut());
    }

    @Test
    void unCritereDevenuConformeVoitSonEcartCloture_jamaisSupprime() {
        UUID critereId = critereDeTest();
        analyser(critereId, 2, "Écart constaté.");

        analyser(critereId, 5, "Critère désormais pleinement conforme.");

        List<NonConforme> nc = toutesLesNc(critereId);
        // La ligne reste : effacer l'écart effacerait aussi la trace du
        // travail accompli pour le résorber.
        assertEquals(1, nc.size(), "l'écart résolu reste en base");
        assertEquals(StatutNonConformite.CLOTUREE, nc.get(0).getStatut());
    }

    @Test
    void unCritereConformeDesLePremierCoupNeCreeAucunEcart() {
        UUID critereId = critereDeTest();

        analyser(critereId, 5, "Conforme dès la première analyse.");

        assertTrue(toutesLesNc(critereId).isEmpty());
    }

    // === Ce que voient les lectures métier ================================

    /** L'identifiant de mission, lu dans une session ouverte. */
    @Transactional
    UUID auditDe(UUID auditCritereId) {
        return auditCritereRepository.findById(auditCritereId).getAudit().getId();
    }

    @Test
    void laLectureParDefautNeRendQueLesEcartsCourants() {
        UUID critereId = critereDeTest();
        analyser(critereId, 2, "Écart courant.");
        UUID auditId = auditDe(critereId);

        // Une ligne historique, telle que la migration en a produit pour
        // les 17 doublons conservés.
        archiverEtAjouterUnHistorique(critereId);

        assertEquals(2, toutesLesNc(critereId).size(), "l'historique reste en base");
        assertEquals(1, nonConformeRepository.parAudit(auditId).size(),
                "la lecture métier ne doit voir qu'un écart");
        assertEquals(2, nonConformeRepository.parAuditAvecHistorique(auditId).size(),
                "l'historique reste atteignable, mais explicitement");
    }

    /** Reproduit une ligne historique : archivée, conservée, non courante. */
    @Transactional
    void archiverEtAjouterUnHistorique(UUID auditCritereId) {
        NonConforme courante = nonConformeRepository.couranteParAuditCritere(auditCritereId).orElseThrow();
        Evaluation evaluation = courante.getEvaluation();
        courante.archiver();
        entityManager.flush();

        NonConforme nouvelle = new NonConforme(evaluation, courante.getTitre(),
                "Nouvel état courant.", courante.getNiveau(), courante.getRisqueAttendu());
        nonConformeRepository.persistAndFlush(nouvelle);
    }

    @Test
    void deuxCoccurantesPourUnMemeCritereSontRefuseesParLaBase() {
        UUID critereId = critereDeTest();
        analyser(critereId, 2, "Écart courant.");

        // L'index unique partiel est la garantie structurelle : même un
        // chemin de code fautif — ou un script d'exploitation — ne peut pas
        // créer un second écart courant sur le même critère.
        boolean refuse = false;
        try {
            insererSecondeCourante(critereId);
        } catch (Exception e) {
            refuse = true;
        }
        assertTrue(refuse, "la base doit refuser une seconde non-conformité courante");
    }

    @Transactional
    void insererSecondeCourante(UUID auditCritereId) {
        NonConforme courante = nonConformeRepository.couranteParAuditCritere(auditCritereId).orElseThrow();
        NonConforme doublon = new NonConforme(courante.getEvaluation(), courante.getTitre(),
                "Doublon interdit.", courante.getNiveau(), courante.getRisqueAttendu());
        nonConformeRepository.persistAndFlush(doublon);
    }

    @Test
    void unEcartArchiveNEstPlusLeCourant() {
        UUID critereId = critereDeTest();
        analyser(critereId, 2, "Écart.");
        archiverEtAjouterUnHistorique(critereId);

        List<NonConforme> nc = toutesLesNc(critereId);
        assertEquals(2, nc.size());
        assertFalse(nc.get(0).isCourante(), "la première ligne est devenue historique");
        assertTrue(nc.get(1).isCourante());
    }
}
