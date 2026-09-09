package com.smartexsustway.api.mission;

import com.smartexsustway.api.conformite.NonConformiteService;
import com.smartexsustway.api.domain.entity.Audit;
import com.smartexsustway.api.domain.entity.AuditCritere;
import com.smartexsustway.api.domain.entity.Document;
import com.smartexsustway.api.domain.entity.Evaluation;
import com.smartexsustway.api.domain.entity.EvaluationDocumentAnalyse;
import com.smartexsustway.api.domain.entity.Preuve;
import com.smartexsustway.api.domain.entity.ReponseQuestion;
import com.smartexsustway.api.domain.enums.SourceEvaluation;
import com.smartexsustway.api.domain.enums.StatutEvaluation;
import com.smartexsustway.api.domain.repository.EvaluationDocumentAnalyseRepository;
import com.smartexsustway.api.domain.repository.EvaluationRepository;
import com.smartexsustway.api.domain.repository.ExigenceRepository;
import com.smartexsustway.api.domain.repository.PreuveAttendueRepository;
import com.smartexsustway.api.domain.repository.PreuveRepository;
import com.smartexsustway.api.domain.repository.RegleAnalyseRepository;
import com.smartexsustway.api.domain.repository.ReponseQuestionRepository;
import com.smartexsustway.api.domain.rules.NiveauMaturite;
import com.smartexsustway.api.domain.rules.ScoringEngine;
import com.smartexsustway.api.ia.EvaluerCritereRequestDto;
import com.smartexsustway.api.ia.EvaluerCritereResponseDto;
import com.smartexsustway.api.ia.IaEvaluationClient;
import com.smartexsustway.api.scoring.ScoreHistoriqueService;
import com.smartexsustway.api.stockage.StorageService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Analyse IA d'un critère : orchestre le pipeline d'agents Python puis
 * convertit la probabilité renvoyée en niveau d'engagement via ScoringEngine
 * (RG27 — l'IA ne produit jamais de note directement).
 *
 * Extrait d'EvaluationResource pour que la clôture d'une mission puisse
 * rejouer exactement la même analyse sur tous ses critères : dupliquer cette
 * orchestration ferait diverger l'analyse unitaire et la passe de clôture dès
 * la première évolution du pipeline.
 *
 * Depuis que seule l'IA produit une note, ce service est le seul chemin par
 * lequel un critère obtient un niveau — la déclaration de l'organisation
 * n'est qu'une des sources qu'il lit.
 */
@ApplicationScoped
public class AnalyseCritereService {

    private static final Logger LOG = Logger.getLogger(AnalyseCritereService.class);
    private static final String FORMULE_AVANCEES = "AVANCEES";
    /** Reflète AuditCritere.statut (voir AuditCritere.java). */
    public static final String STATUT_EVALUE = "EVALUE";
    /** Renseigné par l'organisation, en attente d'analyse. Posé à la saisie du questionnaire. */
    public static final String STATUT_DECLARE = "DECLARE";

    @Inject PreuveRepository preuveRepository;
    @Inject ExigenceRepository exigenceRepository;
    @Inject PreuveAttendueRepository preuveAttendueRepository;
    @Inject RegleAnalyseRepository regleAnalyseRepository;
    @Inject ReponseQuestionRepository reponseQuestionRepository;
    @Inject EvaluationRepository evaluationRepository;
    @Inject EvaluationDocumentAnalyseRepository documentAnalyseRepository;
    @Inject NonConformiteService nonConformiteService;
    @Inject ScoreHistoriqueService scoreHistoriqueService;
    @Inject StorageService storageService;

    @Inject
    @RestClient
    IaEvaluationClient iaEvaluationClient;

    /**
     * Issue d'une analyse. Les échecs sont des valeurs et non des exceptions :
     * la passe de clôture doit pouvoir continuer sur les critères suivants
     * quand l'un d'eux échoue, ce qu'un flot d'exceptions rendrait pénible.
     */
    public sealed interface Resultat {
        /** Le critère porte désormais une évaluation IA. */
        record Analyse(Evaluation evaluation) implements Resultat {}

        /** Rien à analyser : ni preuve, ni réponse, ni scénario. */
        record RienAAnalyser() implements Resultat {}

        /** Le pipeline ou le stockage a échoué ; le message est destiné à l'appelant. */
        record Echec(String message) implements Resultat {}
    }

    /**
     * Analyse un critère et enregistre l'évaluation qui en résulte.
     *
     * RG09 : la collecte déclarative (réponses au questionnaire, scénario) est
     * une source d'analyse au même titre que les preuves documentaires —
     * l'analyse n'est refusée que si le critère ne porte aucun élément.
     */
    public Resultat analyser(Audit audit, AuditCritere auditCritere) {
        UUID auditCritereId = auditCritere.getId();

        List<Preuve> preuves = preuveRepository.parAuditCritere(auditCritereId);
        List<EvaluerCritereRequestDto.ReponseDeclareeDto> reponses = reponsesDeclarees(auditCritereId);
        String scenario = auditCritere.getScenario();

        if (preuves.isEmpty() && reponses.isEmpty() && scenario == null) {
            return new Resultat.RienAAnalyser();
        }

        // RG21 : le pipeline d'agents dépend de la formule souscrite — elle
        // détermine si le Risk Agent et le Recommendation Agent sont exécutés.
        boolean formuleAvancees = estFormuleAvancees(audit);

        List<EvaluerCritereRequestDto.DocumentPourEvaluationDto> documents = new ArrayList<>();
        for (Preuve preuve : preuves) {
            Document document = preuve.getDocument();
            byte[] contenu;
            try {
                contenu = storageService.telecharger(document.getCheminStockage());
            } catch (Exception e) {
                LOG.warnf(e, "Lecture du document %s impossible pour l'analyse IA", document.getId());
                return new Resultat.Echec("Impossible de lire le document '"
                        + document.getNomOriginal() + "' depuis le stockage");
            }
            documents.add(new EvaluerCritereRequestDto.DocumentPourEvaluationDto(
                    document.getNomOriginal(), document.getTypeMime(),
                    Base64.getEncoder().encodeToString(contenu)));
        }

        // Contexte métier du critère, lu dans la version que la mission a
        // auditée : ses exigences, ce qu'elles appellent en démonstration, et
        // les règles qui disent comment confronter les deux. Ces listes sont
        // vides tant que le référentiel n'a pas été enrichi — le pipeline se
        // comporte alors exactement comme avant cette phase.
        UUID critereId = auditCritere.getCritere().getId();
        var exigences = exigenceRepository.parCritere(critereId);
        var exigencesTransmises = exigences.stream()
                .map(e -> new EvaluerCritereRequestDto.ExigenceDto(
                        e.getCode(), e.getIntitule(), e.getEnonce()))
                .toList();
        var preuvesAttendues = preuveAttendueRepository.parCritere(critereId).stream()
                .map(p -> new EvaluerCritereRequestDto.PreuveAttendueDto(
                        p.getExigence().getCode(), p.getType().name(), p.getLibelle(),
                        p.getDescription(), p.isObligatoire()))
                .toList();
        var reglesAnalyse = regleAnalyseRepository.parCritere(critereId).stream()
                .map(r -> new EvaluerCritereRequestDto.RegleAnalyseDto(
                        r.getCode(), r.getType().name(), r.getLibelle(), r.getSeverite().name(),
                        r.getExigence() == null ? null : r.getExigence().getCode(),
                        r.getPreuveAttendue() == null ? null : r.getPreuveAttendue().getLibelle(),
                        r.getDefinition()))
                .toList();

        EvaluerCritereRequestDto requete = new EvaluerCritereRequestDto(
                auditCritereId,
                auditCritere.getCritere().getCode(),
                auditCritere.getCritere().getLibelle(),
                auditCritere.getCritere().getDescription(),
                exigencesTransmises,
                preuvesAttendues,
                reglesAnalyse,
                documents,
                scenario,
                reponses,
                formuleAvancees, // analyseRisque (Risk Agent)
                formuleAvancees  // genererRecommandation — même condition aujourd'hui (RG21),
                                 // champs distincts pour rester découplables
        );

        EvaluerCritereResponseDto reponse;
        try {
            reponse = iaEvaluationClient.evaluerCritere(requete);
        } catch (Exception e) {
            LOG.warnf(e, "Échec du pipeline d'agents IA pour le critère %s",
                    auditCritere.getCritere().getCode());
            return new Resultat.Echec("Échec du pipeline d'agents IA — réessayez plus tard");
        }

        BigDecimal probabilite = BigDecimal.valueOf(reponse.probabiliteConformite())
                .setScale(4, RoundingMode.HALF_UP);
        BigDecimal confiance = BigDecimal.valueOf(reponse.confianceIa()).setScale(4, RoundingMode.HALF_UP);

        // RG27 : conversion probabilité -> niveau exclusivement via ScoringEngine.
        int niveau = ScoringEngine.niveauEngagement(probabilite);

        Evaluation evaluation = new Evaluation(auditCritere, probabilite, (short) niveau);
        evaluation.setConfianceIa(confiance);
        evaluation.setJustification(reponse.justification());
        evaluation.setSource(SourceEvaluation.IA);
        evaluation.setSignalRisque(reponse.signalRisque());
        evaluation.setCategorieRisque(reponse.categorieRisque());
        evaluation.setJustificationRisque(reponse.justificationRisque());
        evaluation.setRecommandationNecessaire(reponse.recommandationNecessaire());
        evaluation.setPistesAmelioration(reponse.pistesAmelioration());
        // Traçabilité : sans la couverture de preuve et la liste des documents
        // lus, un résultat de conformité n'est pas contrôlable par le superviseur.
        evaluation.setCouverturePreuve(reponse.couverturePreuve());
        // Niveau déclaré au moment de l'analyse, figé ici : le relire plus tard
        // ne dirait rien, les réponses ayant pu changer depuis.
        evaluation.setNiveauDeclare(niveauDeclare(auditCritereId));
        // RG16 : l'analyse constitue directement l'évaluation définitive.
        evaluation.setStatut(StatutEvaluation.VALIDEE);
        // persistAndFlush : @CreationTimestamp n'est renseigné qu'au flush, et
        // la date fait partie de la réponse renvoyée (RG14).
        evaluationRepository.persistAndFlush(evaluation);

        var documentsLus = reponse.documentsAnalyses() == null
                ? List.<EvaluerCritereResponseDto.DocumentAnalyseDto>of()
                : reponse.documentsAnalyses();
        for (int rang = 0; rang < documentsLus.size(); rang++) {
            var lu = documentsLus.get(rang);
            documentAnalyseRepository.persist(
                    new EvaluationDocumentAnalyse(evaluation, lu.nom(), lu.resume(), rang));
        }

        auditCritere.setStatut(STATUT_EVALUE);
        nonConformiteService.genererSiNecessaire(evaluation);
        scoreHistoriqueService.enregistrer(audit);

        return new Resultat.Analyse(evaluation);
    }

    /** Niveau déclaré sur ce critère, s'il en existe un. */
    private Short niveauDeclare(UUID auditCritereId) {
        return reponseQuestionRepository.parAuditCritere(auditCritereId).stream()
                .map(ReponseQuestion::getNiveau)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    /** RG09 : réponses déjà saisies sur le critère, transmises au pipeline avec les preuves. */
    private List<EvaluerCritereRequestDto.ReponseDeclareeDto> reponsesDeclarees(UUID auditCritereId) {
        return reponseQuestionRepository.parAuditCritere(auditCritereId).stream()
                .filter(r -> r.getNiveau() != null || r.getValeur() != null || r.getCommentaire() != null)
                .map(r -> new EvaluerCritereRequestDto.ReponseDeclareeDto(
                        r.getAuditQuestion().getQuestion().getLibelle(),
                        valeurDeclaree(r),
                        r.getCommentaire()))
                .toList();
    }

    /**
     * Réponse transmise aux agents, sous forme de texte : le niveau de
     * maturité depuis V26 (« 4 — Active »), à défaut l'ancienne valeur fermée
     * pour les réponses saisies avant ce changement.
     */
    private static String valeurDeclaree(ReponseQuestion reponse) {
        String niveau = NiveauMaturite.libelleComplet(
                reponse.getNiveau() == null ? null : reponse.getNiveau().intValue());
        if (niveau != null) {
            return niveau;
        }
        return reponse.getValeur() != null ? reponse.getValeur().name() : null;
    }

    private static boolean estFormuleAvancees(Audit audit) {
        return audit.getFormuleAbonnement() != null
                && FORMULE_AVANCEES.equals(audit.getFormuleAbonnement().getCode());
    }
}
