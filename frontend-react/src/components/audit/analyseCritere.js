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
 * Traduit une probabilité de conformité en appréciation lisible. Les seuils
 * reprennent les paliers de la grille de Likert du ScoringEngine côté serveur
 * (0,75 et 0,50), pour qu'une même évaluation ne soit pas qualifiée « élevée »
 * ici et de niveau 3 ailleurs.
 */
export function libelleNiveau(score) {
  if (score >= 75) return 'Élevée';
  if (score >= 50) return 'Moyenne';
  if (score >= 25) return 'Faible';
  return 'Très faible';
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
    niveau: libelleNiveau(score),
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
