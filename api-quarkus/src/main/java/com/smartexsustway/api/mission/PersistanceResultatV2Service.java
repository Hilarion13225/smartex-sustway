package com.smartexsustway.api.mission;

import com.smartexsustway.api.domain.entity.AnalyseDocumentConstat;
import com.smartexsustway.api.domain.entity.AnalyseIa;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.AxeAmelioration;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.entity.EvaluationConstat;
import com.smartexsustway.api.domain.entity.EvaluationDocumentAnalyse;
import com.smartexsustway.api.domain.entity.EvaluationPreuve;
import com.smartexsustway.api.domain.entity.Exigence;
import com.smartexsustway.api.domain.entity.ExecutionAgent;
import com.smartexsustway.api.domain.entity.PreuveAttendue;
import com.smartexsustway.api.domain.entity.RegleAnalyse;
import com.smartexsustway.api.domain.enums.CouverturePreuveAttendue;
import com.smartexsustway.api.domain.enums.NatureConstat;
import com.smartexsustway.api.domain.enums.PresenceConstat;
import com.smartexsustway.api.domain.enums.SourceEvaluation;
import com.smartexsustway.api.domain.enums.StatutEvaluation;
import com.smartexsustway.api.domain.enums.StatutExecutionAgent;
import com.smartexsustway.api.domain.enums.TypeAgentIa;
import com.smartexsustway.api.domain.repository.AnalyseDocumentConstatRepository;
import com.smartexsustway.api.amelioration.AxeAmeliorationService;
import com.smartexsustway.api.domain.repository.DocumentRepository;
import com.smartexsustway.api.domain.repository.EvaluationConstatRepository;
import com.smartexsustway.api.domain.repository.EvaluationDocumentAnalyseRepository;
import com.smartexsustway.api.domain.repository.EvaluationPreuveRepository;
import com.smartexsustway.api.domain.repository.EvaluationRepository;
import com.smartexsustway.api.domain.repository.ExecutionAgentRepository;
import com.smartexsustway.api.domain.repository.ExigenceRepository;
import com.smartexsustway.api.domain.repository.PreuveRepository;
import com.smartexsustway.api.domain.repository.RegleAnalyseRepository;
import com.smartexsustway.api.domain.rules.ScoringEngine;
import com.smartexsustway.api.ia.contrat.ConstructionContexteIa;
import com.smartexsustway.api.ia.contrat.EnveloppeV2Dto;
import com.smartexsustway.api.ia.contrat.EvaluerCritereRequestV2;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Écrit un résultat V2 en base — et rien de plus.
 *
 * <p>Deux principes gouvernent tout ce qui suit.
 *
 * <p><strong>L'évaluation naît {@code EN_REVUE}, et aucune non-conformité
 * n'est créée.</strong> Une non-conformité est un constat opposable ; la
 * produire à partir d'un résultat que personne n'a relu reviendrait à faire
 * porter à l'organisation les conclusions d'une machine. Elle naîtra à la
 * validation, dans {@link ValidationEvaluationService}.
 *
 * <p><strong>Aucune référence n'est acceptée sans être résolue.</strong> Le
 * service d'agents écarte déjà ce qui ne désigne rien du catalogue transmis,
 * mais on ne s'en remet pas à lui : chaque référence est retraduite en UUID
 * contre la table du payload qui l'a produite, et ce qui ne se résout pas
 * est écarté avec une trace. Une référence inventée qui atteindrait la base
 * y serait indiscernable d'une vraie.
 *
 * <p>Ce que ce service ne fait pas : calculer un score, clôturer une
 * mission, valider quoi que ce soit, créer une action métier engagée.
 */
@ApplicationScoped
public class PersistanceResultatV2Service {

    private static final Logger LOG = Logger.getLogger(PersistanceResultatV2Service.class);

    @Inject EvaluationRepository evaluationRepository;
    @Inject EvaluationDocumentAnalyseRepository documentAnalyseRepository;
    @Inject AnalyseDocumentConstatRepository documentConstatRepository;
    @Inject EvaluationPreuveRepository evaluationPreuveRepository;
    @Inject EvaluationConstatRepository evaluationConstatRepository;
    @Inject AxeAmeliorationService axeService;
    @Inject ExecutionAgentRepository executionAgentRepository;
    @Inject ExigenceRepository exigenceRepository;
    @Inject RegleAnalyseRepository regleAnalyseRepository;
    @Inject PreuveRepository preuveRepository;

    /**
     * Persiste l'enveloppe complète et rend l'évaluation créée.
     *
     * <p>L'appelant fournit la transaction : les écritures d'une même passe
     * réussissent ou échouent ensemble. Une évaluation sans son détail
     * serait pire qu'aucune évaluation — elle aurait l'air complète.
     */
    public Evaluation persister(Audit audit, AuditCritere auditCritere, AnalyseIa passe,
                                ConstructionContexteIa.Contexte contexte,
                                EnveloppeV2Dto enveloppe) {
        var resultat = enveloppe.resultat();
        var evidence = resultat.evidence();

        // RG27 : l'IA rend une probabilité, jamais une note. La conversion
        // passe exclusivement par ScoringEngine.
        BigDecimal probabilite = BigDecimal.valueOf(
                evidence.probabilite_conformite() == null ? 0d : evidence.probabilite_conformite())
                .setScale(4, RoundingMode.HALF_UP);
        int niveau = ScoringEngine.niveauEngagement(probabilite);

        Evaluation evaluation = new Evaluation(auditCritere, probabilite, (short) niveau);
        evaluation.setSource(SourceEvaluation.IA);
        evaluation.setContratVersion(resultat.contrat_version());
        evaluation.setAnalyseIa(passe);
        evaluation.setReferentielVersion(audit.getReferentielVersion());
        evaluation.setJustification(evidence.justification_conformite());
        evaluation.setJustificationCouverture(evidence.justification_couverture());
        evaluation.setCouverturePreuve(evidence.couverture_preuve());
        evaluation.setConfianceIa(arrondi(evidence.confiance()));
        evaluation.setNiveauDeclare(niveauDeclare(auditCritere));

        appliquerRisque(evaluation, resultat.risque());
        appliquerRecommandation(evaluation, resultat.recommandation());

        // Le point de toute la phase : une sortie de modèle entre en revue,
        // pas en verdict.
        evaluation.setStatut(StatutEvaluation.EN_REVUE);
        evaluationRepository.persistAndFlush(evaluation);

        Map<String, EvaluationDocumentAnalyse> parPiece =
                persisterAnalysesDocumentaires(evaluation, auditCritere, contexte, resultat);
        persisterEvaluationsParPreuve(evaluation, contexte, evidence);
        persisterElementsManquants(evaluation, auditCritere, contexte, evidence);
        persisterSignauxDeRisque(evaluation, auditCritere, contexte, resultat.risque());
        persisterAxes(audit, auditCritere, evaluation, contexte, resultat.recommandation());
        persisterTraceExecution(passe, enveloppe.execution());

        cloturerLaPasse(passe, enveloppe.execution());

        LOG.debugf("Résultat V2 persisté : évaluation %s (EN_REVUE), %d pièce(s) analysée(s)",
                evaluation.getId(), parPiece.size());
        return evaluation;
    }

    // === Risque et recommandation, au niveau du critère ==================

    private void appliquerRisque(Evaluation evaluation, EnveloppeV2Dto.RisqueDto risque) {
        if (risque == null) {
            // Le Risk Agent n'a pas tourné, ou a échoué. Les champs restent
            // nuls : « absent » et « aucun risque » ne se confondent pas.
            return;
        }
        evaluation.setSignalRisque(risque.signal_risque());
        evaluation.setCategorieRisque(risque.categorie());
        evaluation.setJustificationRisque(risque.justification());
        evaluation.setConfianceRisque(arrondi(risque.confiance()));
    }

    private void appliquerRecommandation(Evaluation evaluation,
                                         EnveloppeV2Dto.RecommandationDto recommandation) {
        if (recommandation == null) {
            return;
        }
        evaluation.setRecommandationNecessaire(recommandation.recommandation_necessaire());
        evaluation.setPistesAmelioration(recommandation.pistes_amelioration());
    }

    // === Analyses documentaires =========================================

    private Map<String, EvaluationDocumentAnalyse> persisterAnalysesDocumentaires(
            Evaluation evaluation, AuditCritere auditCritere,
            ConstructionContexteIa.Contexte contexte, EnveloppeV2Dto.ResultatDto resultat) {

        Map<String, EvaluationDocumentAnalyse> parPiece = new HashMap<>();
        List<EnveloppeV2Dto.AnalyseDocumentDto> analyses =
                resultat.analyses_documents() == null ? List.of() : resultat.analyses_documents();

        // Le rattachement au document réel se fait par l'ordre des pièces du
        // payload, seul lien fiable : la référence `p1` a été attribuée par
        // `ConstructionContexteIa` dans l'ordre des preuves de ce critère.
        var preuves = preuveRepository.parAuditCritere(auditCritere.getId());

        int rang = 0;
        for (var analyse : analyses) {
            var ligne = new EvaluationDocumentAnalyse(
                    evaluation, analyse.nom(), analyse.resume(), rang);
            ligne.setPieceReference(analyse.piece_reference());
            ligne.setConfianceLecture(arrondi(analyse.confiance_lecture()));

            documentDeLaPiece(preuves, analyse.piece_reference())
                    .ifPresent(ligne::setDocument);

            documentAnalyseRepository.persistAndFlush(ligne);
            parPiece.put(analyse.piece_reference(), ligne);

            persisterConstats(ligne, contexte, analyse);
            rang++;
        }
        return parPiece;
    }

    /**
     * Retrouve le document derrière une référence locale de pièce.
     *
     * <p>`p1` est le premier document du critère, `p2` le deuxième, dans
     * l'ordre où {@code ConstructionContexteIa} les a soumis. C'est le seul
     * rattachement possible : la référence n'a de sens qu'à l'intérieur de
     * sa passe et n'est jamais persistée comme identité.
     */
    private Optional<com.smartexsustway.api.domain.entity.Document> documentDeLaPiece(
            List<com.smartexsustway.api.domain.entity.Preuve> preuves, String reference) {
        if (reference == null || !reference.startsWith("p")) {
            return Optional.empty();
        }
        try {
            int index = Integer.parseInt(reference.substring(1)) - 1;
            if (index >= 0 && index < preuves.size()) {
                return Optional.ofNullable(preuves.get(index).getDocument());
            }
        } catch (NumberFormatException e) {
            LOG.debugf("Référence de pièce non numérotée : %s", reference);
        }
        return Optional.empty();
    }

    private void persisterConstats(EvaluationDocumentAnalyse ligne,
                                   ConstructionContexteIa.Contexte contexte,
                                   EnveloppeV2Dto.AnalyseDocumentDto analyse) {
        List<EnveloppeV2Dto.ConstatDto> constats =
                analyse.constats() == null ? List.of() : analyse.constats();

        int rang = 0;
        for (var constat : constats) {
            Optional<PreuveAttendue> cible = contexte.references().resoudre(constat.reference());
            if (cible.isEmpty()) {
                LOG.warnf("Constat écarté : la référence %s ne désigne rien du catalogue transmis",
                        constat.reference());
                continue;
            }
            PresenceConstat presence = presence(constat.presence());
            if (presence == null) {
                LOG.warnf("Constat écarté : présence inconnue « %s »", constat.presence());
                continue;
            }
            var ligneConstat = new AnalyseDocumentConstat(ligne, cible.get(), presence, rang++);
            ligneConstat.setElementsReleves(constat.elements_releves());
            ligneConstat.setElementsManquants(constat.elements_manquants());
            documentConstatRepository.persist(ligneConstat);
        }
    }

    // === Détail par preuve attendue =====================================

    private void persisterEvaluationsParPreuve(Evaluation evaluation,
                                               ConstructionContexteIa.Contexte contexte,
                                               EnveloppeV2Dto.EvidenceDto evidence) {
        List<EnveloppeV2Dto.EvaluationPreuveDto> evaluations =
                evidence.evaluations() == null ? List.of() : evidence.evaluations();

        int rang = 0;
        for (var detail : evaluations) {
            Optional<PreuveAttendue> cible = contexte.references().resoudre(detail.reference());
            if (cible.isEmpty()) {
                LOG.warnf("Évaluation de preuve écartée : référence inconnue %s", detail.reference());
                continue;
            }
            CouverturePreuveAttendue couverture = couverture(detail.couverture());
            if (couverture == null) {
                LOG.warnf("Évaluation de preuve écartée : couverture inconnue « %s »",
                        detail.couverture());
                continue;
            }
            var ligne = new EvaluationPreuve(evaluation, cible.get(), couverture, rang++);
            ligne.setConflit(detail.conflit());
            ligne.setJustification(detail.justification());
            ligne.setElementsObserves(detail.elements_observes());
            ligne.setElementsManquants(detail.elements_manquants());
            // Jamais fusionnée avec la précédente : « non vérifiable » et
            // « manquant » ne disent pas la même chose.
            ligne.setElementsNonVerifiables(detail.elements_non_verifiables());
            ligne.setPiecesUtilisees(detail.pieces_utilisees());
            evaluationPreuveRepository.persist(ligne);
        }
    }

    // === Remarques rattachées ===========================================

    private void persisterElementsManquants(Evaluation evaluation, AuditCritere auditCritere,
                                            ConstructionContexteIa.Contexte contexte,
                                            EnveloppeV2Dto.EvidenceDto evidence) {
        List<EnveloppeV2Dto.RattachementDto> manquants =
                evidence.elements_manquants() == null ? List.of() : evidence.elements_manquants();

        int rang = 0;
        for (var rattachement : manquants) {
            EvaluationConstat constat = constatRattache(
                    evaluation, auditCritere, contexte, NatureConstat.ELEMENT_MANQUANT,
                    rattachement, rang);
            if (constat != null) {
                evaluationConstatRepository.persist(constat);
                rang++;
            }
        }
    }

    private void persisterSignauxDeRisque(Evaluation evaluation, AuditCritere auditCritere,
                                          ConstructionContexteIa.Contexte contexte,
                                          EnveloppeV2Dto.RisqueDto risque) {
        if (risque == null || risque.signaux() == null) {
            return;
        }
        int rang = 0;
        for (var signal : risque.signaux()) {
            if (signal.rattachement() == null) {
                // Un signal sans rattachement ne désigne rien de précis ; il
                // reste porté par la justification globale du risque, sur
                // l'évaluation.
                continue;
            }
            EvaluationConstat constat = constatRattache(
                    evaluation, auditCritere, contexte, NatureConstat.SIGNAL_RISQUE,
                    signal.rattachement(), rang);
            if (constat != null) {
                constat.setCategorie(signal.categorie());
                constat.setJustification(signal.justification());
                constat.setPiecesConcernees(signal.pieces_concernees());
                evaluationConstatRepository.persist(constat);
                rang++;
            }
        }
    }

    /**
     * Construit une remarque rattachée, ou rend {@code null} si la
     * référence ne se résout pas.
     */
    private EvaluationConstat constatRattache(Evaluation evaluation, AuditCritere auditCritere,
                                              ConstructionContexteIa.Contexte contexte,
                                              NatureConstat nature,
                                              EnveloppeV2Dto.RattachementDto rattachement,
                                              int rang) {
        String niveau = rattachement.niveau();
        String reference = rattachement.reference();
        if (niveau == null || reference == null) {
            return null;
        }

        switch (niveau) {
            case "PREUVE_ATTENDUE" -> {
                var cible = contexte.references().resoudre(reference);
                if (cible.isEmpty()) {
                    LOG.warnf("Rattachement écarté : preuve attendue inconnue %s", reference);
                    return null;
                }
                return EvaluationConstat.surPreuveAttendue(evaluation, nature, cible.get(), rang);
            }
            case "EXIGENCE" -> {
                var cible = exigenceParCode(auditCritere, reference);
                if (cible.isEmpty()) {
                    LOG.warnf("Rattachement écarté : exigence inconnue %s", reference);
                    return null;
                }
                return EvaluationConstat.surExigence(evaluation, nature, cible.get(), rang);
            }
            case "REGLE" -> {
                var cible = regleParCode(auditCritere, reference);
                if (cible.isEmpty()) {
                    LOG.warnf("Rattachement écarté : règle inconnue %s", reference);
                    return null;
                }
                return EvaluationConstat.surRegle(evaluation, nature, cible.get(), rang);
            }
            default -> {
                LOG.warnf("Rattachement écarté : niveau inconnu « %s »", niveau);
                return null;
            }
        }
    }

    // === Axes d'amélioration ============================================

    /**
     * Confie chaque recommandation au service des axes.
     *
     * <p>La création ne se fait plus ici : {@link AxeAmeliorationService} est
     * le point unique où un axe naît, où le doublon est écarté et où la
     * version du référentiel visé est vérifiée. Refaire ce travail dans ce
     * service rouvrirait la seconde chaîne que le regroupement vient de
     * fermer.
     */
    private void persisterAxes(Audit audit, AuditCritere auditCritere, Evaluation evaluation,
                               ConstructionContexteIa.Contexte contexte,
                               EnveloppeV2Dto.RecommandationDto recommandation) {
        if (recommandation == null || recommandation.actions() == null) {
            return;
        }
        for (var action : recommandation.actions()) {
            // Origine IA, origine initiale IA, statut PROPOSE. Aucune action
            // métier n'est créée — un axe est une proposition tant qu'une
            // personne ne l'a pas reprise.
            var cree = axeService.proposerParIa(audit, auditCritere, evaluation, action.action());
            if (cree.isEmpty()) {
                // Doublon exact sur ce critère : déjà journalisé par le
                // service. Le rattachement de la proposition retenue reste
                // celui qu'elle portait.
                continue;
            }
            AxeAmelioration axe = cree.get();

            var rattachement = action.rattachement();
            if (rattachement != null && rattachement.niveau() != null) {
                boolean resolu = rattacher(axe, auditCritere, contexte, rattachement);
                if (!resolu) {
                    LOG.warnf("Axe conservé sans rattachement : référence %s non résolue",
                            rattachement.reference());
                }
            }
        }
    }

    private boolean rattacher(AxeAmelioration axe, AuditCritere auditCritere,
                              ConstructionContexteIa.Contexte contexte,
                              EnveloppeV2Dto.RattachementDto rattachement) {
        // Le rattachement passe par le service : c'est lui qui refuse une
        // cible relevant d'une autre version du référentiel que celle sous
        // laquelle la mission est conduite.
        switch (rattachement.niveau()) {
            case "PREUVE_ATTENDUE" -> {
                var cible = contexte.references().resoudre(rattachement.reference());
                return cible.isPresent() && axeService.rattacher(axe, cible.get());
            }
            case "EXIGENCE" -> {
                var cible = exigenceParCode(auditCritere, rattachement.reference());
                return cible.isPresent() && axeService.rattacher(axe, cible.get());
            }
            case "REGLE" -> {
                var cible = regleParCode(auditCritere, rattachement.reference());
                return cible.isPresent() && axeService.rattacher(axe, cible.get());
            }
            default -> {
                return false;
            }
        }
    }

    // === Trace d'exécution ==============================================

    private void persisterTraceExecution(AnalyseIa passe, EnveloppeV2Dto.ExecutionDto execution) {
        if (execution == null) {
            return;
        }
        passe.setRequestedModel(execution.requested_model());
        passe.setContratExecutionVersion(execution.contrat_execution_version());

        List<EnveloppeV2Dto.AppelDto> appels =
                execution.appels() == null ? List.of() : execution.appels();

        for (var appel : appels) {
            TypeAgentIa agent = agent(appel.agent());
            if (agent == null) {
                LOG.warnf("Appel non tracé : type d'agent inconnu « %s »", appel.agent());
                continue;
            }
            var ligne = new ExecutionAgent(passe, agent, statutAppel(appel.statut()));
            // La référence de pièce distingue plusieurs appels d'un même
            // agent : le Document Agent en produit un par pièce.
            ligne.setPieceReference(appel.piece_reference());
            ligne.setServedModel(appel.served_model());
            ligne.setResponseId(appel.response_id());
            ligne.setDureeMs(appel.duration_ms());
            ligne.setDateDebut(appel.started_at());
            ligne.setDateFin(appel.finished_at());
            if (appel.usage() != null) {
                ligne.setJetonsPrompt(appel.usage().prompt_token_count());
                ligne.setJetonsReponse(appel.usage().candidates_token_count());
                ligne.setJetonsTotal(appel.usage().total_token_count());
            }
            if (appel.error() != null) {
                ligne.setErreurType(appel.error().type());
                // Déjà assaini côté service d'agents.
                ligne.setErreurMessage(appel.error().message());
            }
            executionAgentRepository.persist(ligne);
        }
    }

    private void cloturerLaPasse(AnalyseIa passe, EnveloppeV2Dto.ExecutionDto execution) {
        if (execution != null && "PARTIEL".equals(execution.statut())) {
            // Un agent facultatif a échoué. La passe a produit un résultat
            // exploitable, mais n'a pas fait tout ce qui lui était demandé —
            // et la trace doit le dire plutôt que d'afficher un succès.
            var premiere = execution.erreurs() == null || execution.erreurs().isEmpty()
                    ? null : execution.erreurs().get(0);
            passe.terminer();
            if (premiere != null) {
                LOG.infof("Passe %s terminée partiellement : %s", passe.getId(), premiere.type());
            }
            return;
        }
        passe.terminer();
    }

    // === Résolutions et conversions =====================================

    private Optional<Exigence> exigenceParCode(AuditCritere auditCritere, String code) {
        return exigenceRepository.parCritereActives(auditCritere.getCritere().getId()).stream()
                .filter(e -> e.getCode().equals(code))
                .findFirst();
    }

    private Optional<RegleAnalyse> regleParCode(AuditCritere auditCritere, String code) {
        return regleAnalyseRepository.parCritereActives(auditCritere.getCritere().getId()).stream()
                .filter(r -> r.getCode().equals(code))
                .findFirst();
    }

    private Short niveauDeclare(AuditCritere auditCritere) {
        return null;
    }

    private static BigDecimal arrondi(Double valeur) {
        return valeur == null ? null : BigDecimal.valueOf(valeur).setScale(4, RoundingMode.HALF_UP);
    }

    private static PresenceConstat presence(String valeur) {
        try {
            return valeur == null ? null : PresenceConstat.valueOf(valeur);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static CouverturePreuveAttendue couverture(String valeur) {
        try {
            return valeur == null ? null : CouverturePreuveAttendue.valueOf(valeur);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static TypeAgentIa agent(String valeur) {
        try {
            return valeur == null ? null : TypeAgentIa.valueOf(valeur);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static StatutExecutionAgent statutAppel(String valeur) {
        try {
            return valeur == null ? StatutExecutionAgent.TERMINE
                    : StatutExecutionAgent.valueOf(valeur);
        } catch (IllegalArgumentException e) {
            return StatutExecutionAgent.TERMINE;
        }
    }
}
