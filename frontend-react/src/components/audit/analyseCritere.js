import { api } from '../../lib/apiClient';

/**
 * Point d'entrée unique de l'analyse IA d'un critère.
 *
 * Toute la couche d'affichage (PanneauAnalyseIa et ses cartes) ne connaît que
 * la forme normalisée renvoyée ici — `{ score, niveau, justification, ... }`.
 * Remplacer le fournisseur d'analyse (autre pipeline, service externe, jeu de
 * données simulé) se limite donc à changer `analyserCritere` sans toucher aux
 * composants.
 */

/**
 * Traduit le niveau d'engagement retenu par le serveur (ScoringEngine, grille
 * de Likert 1 à 5) en appréciation lisible, pour qu'une même évaluation ne
 * soit pas qualifiée « élevée » ici et de niveau 3 ailleurs.
 *
 * V74-C3 : le libellé suit ce niveau, jamais le pourcentage affiché. Arrondie à
 * l'entier, une probabilité de 0,7450 s'affiche « 75 % » alors que le serveur
 * retient le niveau 3 (seuil 0,75) ; en déduire un palier ici la dirait
 * « élevée ».
 */
export function libelleNiveau(niveau) {
  const n = Number(niveau);
  if (n >= 4) return 'Élevée';
  if (n === 3) return 'Moyenne';
  if (n === 2) return 'Faible';
  if (n === 1) return 'Très faible';
  return null;
}

/**
 * Convertit une évaluation renvoyée par l'API en analyse affichable.
 * Renvoie `null` pour une évaluation saisie par un auditeur : la probabilité y
 * est une valeur représentative du niveau choisi (voir EvaluationResource,
 * RG27), pas le résultat d'une analyse — l'afficher comme telle laisserait
 * croire à une analyse IA qui n'a pas eu lieu.
 */
export function analyseDepuisEvaluation(evaluation) {
  if (!evaluation || evaluation.source !== 'IA') return null;
  const score = Math.round(Number(evaluation.probabiliteConforme ?? 0) * 100);
  return {
    score,
    niveau: libelleNiveau(evaluation.niveauEngagement),
    confiance:
      evaluation.confianceIa == null ? null : Math.round(Number(evaluation.confianceIa) * 100),
    justification: evaluation.justification ?? null,
    // Traçabilité : ce que l'IA a jugé des preuves et ce qu'elle a lu.
    couverturePreuve: evaluation.couverturePreuve ?? null,
    // Rectification : ce que l'entreprise déclarait, et ce que l'IA a retenu.
    niveauDeclare: evaluation.niveauDeclare ?? null,
    niveauRetenu: evaluation.niveauEngagement ?? null,
    documentsAnalyses: evaluation.documentsAnalyses ?? [],
    signalRisque: evaluation.signalRisque ?? false,
    categorieRisque: evaluation.categorieRisque ?? null,
    justificationRisque: evaluation.justificationRisque ?? null,
    pistesAmelioration: evaluation.pistesAmelioration ?? null,
    dateEvaluation: evaluation.dateEvaluation ?? null,
  };
}

/**
 * Lance le pipeline d'agents IA sur un critère et renvoie l'analyse produite.
 *
 * L'appel est délibérément explicite plutôt que déclenché à chaque frappe : il
 * transmet les preuves au pipeline, écrit une évaluation dans l'historique
 * (RG14), peut générer une non-conformité et journalise l'opération. Le
 * relancer automatiquement à chaque modification polluerait cet historique.
 */
export async function analyserCritere({ entrepriseId, auditId, critereId }) {
  const evaluation = await api.post(
    `/api/v1/entreprises/${entrepriseId}/audits/${auditId}/criteres/${critereId}/evaluations`
  );
  return analyseDepuisEvaluation(evaluation);
}
