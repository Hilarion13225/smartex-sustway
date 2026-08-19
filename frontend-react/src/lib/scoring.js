import { CRITICITE_POIDS, criticiteEffective, critereParId } from '../data/referentiel';
export const SEUIL_CONFIANCE_IA = 0.8;
export const NIVEAUX_ENGAGEMENT = {
  5: 'Fortement active',
  4: 'Active',
  3: 'Réactive',
  2: 'Hésitante',
  1: 'Totalement inactive'
};

/** RG27 / section 11.1 — niveau d'engagement 1 à 5 dérivé de la probabilité de conformité. */
export function niveauEngagement(probabilite) {
  if (probabilite >= 0.9) return 5;
  if (probabilite >= 0.75) return 4;
  if (probabilite >= 0.5) return 3;
  if (probabilite >= 0.25) return 2;
  return 1;
}

/** RG31 — note obtenue = niveau d'engagement × coefficient de pondération. */
export function noteObtenue(evaluation) {
  const niveau = evaluation.noteExpert ?? niveauEngagement(evaluation.probabilite);
  return niveau * evaluation.coefficient;
}

/** RG32 / RG35 — score = Σ notes obtenues / Σ coefficients, sur les seuls critères actifs. */
export function scorePondere(evaluations) {
  const actives = evaluations.filter(e => e.statut !== 'NON_EVALUEE');
  if (actives.length === 0) return 0;
  const numerateur = actives.reduce((total, e) => total + noteObtenue(e), 0);
  const denominateur = actives.reduce((total, e) => total + e.coefficient, 0);
  return denominateur === 0 ? 0 : numerateur / denominateur;
}

/** Score exprimé en pourcentage de l'échelle 1-5. */
export function scoreEnPourcent(score) {
  return Math.round(score / 5 * 100);
}

/** Section 11.3 — risque attendu = (1 − probabilité) × poids de criticité. */
export function risqueAttendu(evaluation, secteur) {
  const critere = critereParId(evaluation.critereId);
  if (!critere) return 0;
  const poids = CRITICITE_POIDS[criticiteEffective(critere, secteur)];
  return (1 - evaluation.probabilite) * poids;
}
export function prioriteDepuisRisque(risque) {
  if (risque >= 2.4) return 'CRITIQUE';
  if (risque >= 1.5) return 'MAJEURE';
  if (risque >= 0.8) return 'MODEREE';
  return 'MINEURE';
}

/** RG22 / RG38 — file de revue experte en deçà du seuil de confiance, en formule Avancées. */
export function necessiteRevueExperte(evaluation, plan) {
  return plan === 'AVANCEES' && evaluation.confianceIa < SEUIL_CONFIANCE_IA;
}

/** RG41 — indice de préparation bailleur, calculé sur les seuls critères tagués. */
export function indicePreparationBailleur(evaluations) {
  const bailleur = evaluations.filter(e => critereParId(e.critereId)?.bailleurIfc);
  return scorePondere(bailleur);
}
export function scoreParDomaine(evaluations, criteres) {
  const parDomaine = {};
  for (const evaluation of evaluations) {
    const critere = criteres.find(c => c.id === evaluation.critereId);
    if (!critere) continue;
    parDomaine[critere.domaineId] = [...(parDomaine[critere.domaineId] ?? []), evaluation];
  }
  return Object.fromEntries(Object.entries(parDomaine).map(([id, liste]) => [id, scorePondere(liste)]));
}
export function formaterPourcent(valeur, decimales = 0) {
  return `${(valeur * 100).toFixed(decimales)} %`;
}
export function formaterScore(score) {
  return score.toFixed(2);
}
