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
import com.smartexsustway.api.domain.enums.OrigineContenu;
import com.smartexsustway.api.domain.enums.SourceEvaluation;
import com.smartexsustway.api.domain.enums.StatutEvaluation;
import com.smartexsustway.api.domain.enums.TypeReferentiel;
import com.smartexsustway.api.domain.repository.AbonnementRepository;
import com.smartexsustway.api.domain.repository.AuditCritereRepository;
import com.smartexsustway.api.domain.repository.AuditRepository;
import com.smartexsustway.api.domain.repository.CritereRepository;
import com.smartexsustway.api.domain.repository.DomaineRepository;
import com.smartexsustway.api.domain.repository.EntrepriseRepository;
import com.smartexsustway.api.domain.repository.EvaluationRepository;
import com.smartexsustway.api.domain.repository.ExigenceRepository;
import com.smartexsustway.api.domain.repository.ReferentielRepository;
import com.smartexsustway.api.domain.repository.ReferentielVersionRepository;
import com.smartexsustway.api.domain.repository.UtilisateurRepository;
import com.smartexsustway.api.ia.EvaluerCritereResponseDto;
import com.smartexsustway.api.ia.IaEvaluationClient;
import com.smartexsustway.api.resource.support.UtilisateurDeTest;
import com.smartexsustway.api.scoring.AuditScoreService;
import com.smartexsustway.api.security.JwtService;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Un critère sans déclaration ni preuve compte dans le score.
 *
 * Il n'y comptait pas. Un critère du périmètre sur lequel l'organisation
 * n'avait rien fourni ne recevait aucune évaluation, et le calcul l'ignorait
 * des deux côtés : ni note au numérateur, ni coefficient au dénominateur.
 * Mesuré sur une mission réelle : treize critères instruits sur
 * quatre-vingt-douze affichaient un score construit sur ces treize seuls,
 * indiscernable de celui d'une mission complète. Ne rien répondre ne coûtait
 * rien — c'était même la façon la plus sûre de ne pas faire baisser sa note.
 *
 * La passe pose désormais un constat d'absence : niveau 1, minimum de la
 * grille de Likert (RG27), source SYSTEME pour qu'aucun audit ne le confonde
 * avec un jugement du pipeline.
 *
 * Le constat est réversible, et c'est le point que ces tests gardent le plus
 * étroitement : il dit ce qui manquait au moment où la passe est passée, pas
 * ce que vaut le critère pour toujours.
 */
@QuarkusTest
class ConstatAbsenceTest {

    @Inject JwtService jwtService;
    @Inject UtilisateurRepository utilisateurRepository;
    @Inject EntrepriseRepository entrepriseRepository;
    @Inject ReferentielRepository referentielRepository;
    @Inject ReferentielVersionRepository versionRepository;
    @Inject DomaineRepository domaineRepository;
    @Inject CritereRepository critereRepository;
    @Inject ExigenceRepository exigenceRepository;
    @Inject AuditRepository auditRepository;
    @Inject AbonnementRepository abonnementRepository;
    @Inject AuditCritereRepository auditCritereRepository;
    @Inject EvaluationRepository evaluationRepository;
    @Inject AnalyseCritereService analyseCritereService;
    @Inject AnalyseTransactionnelle analyseTransactionnelle;
    @Inject AuditScoreService auditScoreService;

    @InjectMock
    @RestClient
    IaEvaluationClient iaEvaluationClient;

    /** Une mission de deux critères : le premier porte un scénario, le second rien. */
    private record Mission(UUID auditId, UUID avecMatiere, UUID sansRien) {
    }

    @Test
    void unCritereSansAucunElementEstNoteAuMinimumEtEntreDansLeScore() {
        var mission = mission();

        var resultat = analyser(mission, mission.sansRien());

        var constat = assertInstanceOf(AnalyseCritereService.Resultat.AbsenceConstatee.class, resultat);
        assertEquals(SourceEvaluation.SYSTEME, constat.evaluation().getSource(),
                "le constat ne doit pas se faire passer pour une analyse du pipeline");
        assertEquals(StatutEvaluation.VALIDEE, constat.evaluation().getStatut(),
                "seules les évaluations validées entrent dans le score");
        assertEquals(1, constat.evaluation().getNote(),
                "niveau 1, minimum de la grille de Likert");

        // Le pipeline n'a pas été sollicité : il n'y avait rien à lui lire.
        org.mockito.Mockito.verifyNoInteractions(iaEvaluationClient);

        var score = auditScoreService.calculer(auditRepository.findById(mission.auditId()));
        assertEquals(1, score.nombreCriteresEvalues(),
                "le critère vide compte désormais parmi les critères qui font le score");
        assertEquals(0, new BigDecimal("1").compareTo(score.coefficientTotal()),
                "il pèse au dénominateur avec son coefficient");
    }

    @Test
    void leScoreDistingueUnCritereVideDUnCritereInstruit() {
        var mission = mission();
        when(iaEvaluationClient.evaluerCritere(any())).thenReturn(reponseFavorable());

        analyser(mission, mission.avecMatiere());
        analyser(mission, mission.sansRien());

        var score = auditScoreService.calculer(auditRepository.findById(mission.auditId()));

        // Probabilité 0,80 -> niveau 4 (RG27) ; absence -> niveau 1. Les deux
        // coefficients valent 1, donc (4 + 1) / 2 = 2,50.
        assertEquals(2, score.nombreCriteresEvalues());
        assertEquals(0, new BigDecimal("5").compareTo(score.noteTotale()));
        assertEquals(0, new BigDecimal("2").compareTo(score.coefficientTotal()));
        assertEquals(0, new BigDecimal("2.50").compareTo(score.scoreGlobal()),
                "le critère vide tire le score vers le bas au lieu de disparaître du calcul");
    }

    @Test
    void lePassageRepeteNEmpilePasLesConstats() {
        var mission = mission();

        analyser(mission, mission.sansRien());
        analyser(mission, mission.sansRien());
        analyser(mission, mission.sansRien());

        assertEquals(1, evaluationRepository.parAuditCritere(mission.sansRien()).size(),
                "la passe repasse sur ces critères à chaque tour : un constat par tour "
                        + "gonflerait l'historique sans rien apprendre");
    }

    @Test
    void leConstatNeFermePasLaPorteAUneAnalyseVeritable() {
        var mission = mission();

        analyser(mission, mission.sansRien());

        // Le critère reste dans la liste de la passe suivante : c'est ce qui
        // rend le constat réversible. Une garde posée sur toutes les sources
        // confondues l'aurait figé pour toujours.
        assertTrue(analyseTransactionnelle.idsDesCriteresAAnalyser(mission.auditId())
                        .contains(mission.sansRien()),
                "un critère qui ne porte qu'un constat d'absence reste à analyser");

        // L'organisation le renseigne, puis la passe repasse.
        QuarkusTransaction.requiringNew().run(() -> {
            var auditCritere = auditCritereRepository.findById(mission.sansRien());
            auditCritere.setScenario("L'organisation a fini par décrire sa pratique.");
        });
        when(iaEvaluationClient.evaluerCritere(any())).thenReturn(reponseFavorable());

        var resultat = analyser(mission, mission.sansRien());
        assertInstanceOf(AnalyseCritereService.Resultat.Analyse.class, resultat,
                "le critère renseigné doit être analysé pour de bon");

        // Et c'est l'analyse qui fait la note, sans que le constat ait eu
        // besoin d'être effacé : la trace de ce que la mission valait avant
        // reste en base.
        var score = auditScoreService.calculer(auditRepository.findById(mission.auditId()));
        assertEquals(0, new BigDecimal("4").compareTo(score.noteTotale()),
                "l'analyse prime sur le constat");
        assertFalse(evaluationRepository.dernierConstatAbsence(mission.sansRien()).isEmpty(),
                "le constat reste en base au titre de la traçabilité");
    }

    @Test
    void unCritereInstruitNEstJamaisReanalyse() {
        var mission = mission();
        when(iaEvaluationClient.evaluerCritere(any())).thenReturn(reponseFavorable());

        analyser(mission, mission.avecMatiere());
        var second = analyser(mission, mission.avecMatiere());

        assertInstanceOf(AnalyseCritereService.Resultat.DejaAnalyse.class, second,
                "une analyse par critère, définitive — le constat d'absence n'a pas "
                        + "assoupli cette règle-là");
    }

    @Test
    void unCritereHorsPerimetreNeRecoitAucunConstat() {
        var mission = mission();

        // RG35 : le critère est retiré du périmètre de la mission.
        QuarkusTransaction.requiringNew().run(() -> {
            var auditCritere = auditCritereRepository.findById(mission.sansRien());
            auditCritere.setApplicable(false);
        });

        var resultat = analyser(mission, mission.sansRien());

        // Vide et hors périmètre ne se confondent pas. Un critère dont
        // l'organisation n'a rien dit est un manque, et il se paie ; un critère
        // qui ne la concerne pas n'est pas un manque, et le noter au minimum
        // reviendrait à la sanctionner pour une activité qu'elle n'exerce pas.
        // La garde de périmètre passe donc avant le constat, et non après.
        assertInstanceOf(AnalyseCritereService.Resultat.HorsPerimetre.class, resultat,
                "un critère hors périmètre n'est ni analysé ni constaté");
        assertTrue(evaluationRepository.parAuditCritere(mission.sansRien()).isEmpty(),
                "rien n'a été écrit sur un critère que la mission ne porte plus");

        var score = auditScoreService.calculer(auditRepository.findById(mission.auditId()));
        assertEquals(0, score.nombreCriteresEvalues(),
                "il ne pèse pas davantage au dénominateur qu'il ne pesait avant");
    }

    // === Décor ==============================================================

    private AnalyseCritereService.Resultat analyser(Mission mission, UUID auditCritereId) {
        return QuarkusTransaction.requiringNew().call(() ->
                analyseCritereService.analyser(
                        auditRepository.findById(mission.auditId()),
                        auditCritereRepository.findById(auditCritereId)));
    }

    private Mission mission() {
        // Un compte ordinaire suffit : le décor n'exerce aucune permission, il
        // lui faut seulement un auteur pour la version du référentiel. Passer
        // par SUPER_ADMIN échouerait — c'est un rôle de plateforme, qui ne se
        // rattache à aucune organisation.
        var compte = UtilisateurDeTest.creerEtConnecter(jwtService);
        UUID adminId = UUID.fromString(compte.id);

        return QuarkusTransaction.requiringNew().call(() -> {
            Utilisateur auteur = utilisateurRepository.findById(adminId);
            Entreprise entreprise = entrepriseRepository.listAll().get(0);

            var referentiel = new Referentiel(
                    "ABS_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(),
                    "Référentiel de constat d'absence", TypeReferentiel.SMARTEX);
            referentielRepository.persistAndFlush(referentiel);

            var version = new ReferentielVersion(referentiel, "1.0",
                    "Décor du constat d'absence.", 0, 0, auteur);
            versionRepository.persistAndFlush(version);

            var domaine = new Domaine(version, "D1", "Domaine de constat");
            domaineRepository.persistAndFlush(domaine);

            var audit = new Audit(entreprise, version, "Mission de constat d'absence", LocalDate.now());
            abonnementRepository.leplusRecentParEntreprise(entreprise.getId())
                    .ifPresent(abonnement -> audit.setFormuleAbonnement(abonnement.getFormule()));
            auditRepository.persistAndFlush(audit);

            UUID avecMatiere = null;
            UUID sansRien = null;
            for (int rang = 1; rang <= 2; rang++) {
                var critere = new Critere(domaine, "D1-0" + rang, "Critère " + rang);
                critereRepository.persistAndFlush(critere);

                var exigence = new Exigence(critere, critere.getCode() + "-E1",
                        critere.getLibelle(), critere.getLibelle());
                exigence.setOrigine(OrigineContenu.CONTENU_INITIAL);
                exigenceRepository.persistAndFlush(exigence);

                var auditCritere = new AuditCritere(audit, critere, critere.getCriticite(), BigDecimal.ONE);
                if (rang == 1) {
                    // Le seul des deux qui donne au pipeline de quoi travailler.
                    auditCritere.setScenario("Scénario du critère instruit.");
                }
                auditCritereRepository.persistAndFlush(auditCritere);

                if (rang == 1) {
                    avecMatiere = auditCritere.getId();
                } else {
                    sansRien = auditCritere.getId();
                }
            }
            return new Mission(audit.getId(), avecMatiere, sansRien);
        });
    }

    /** Probabilité 0,80 : niveau 4 sur la grille (RG27). */
    private static EvaluerCritereResponseDto reponseFavorable() {
        return new EvaluerCritereResponseDto(
                UUID.randomUUID(), 0.8, 0.8, true, "Analyse de décor",
                List.of(), false, null, null, false, null);
    }
}
