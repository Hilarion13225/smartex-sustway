/**
 * Lecture d'un indice de préparation bailleur.
 *
 * Le serveur rend `score: null` dès que `statut` n'est pas `CALCULE` — parce
 * qu'un zéro affiché faute de données se lit comme une préparation nulle,
 * c'est-à-dire l'inverse de la vérité. `Number(null).toFixed(2)` rendant
 * `"0.00"`, reproduire ce défaut à l'écran ne demanderait aucun effort : d'où
 * ce module, partagé par les deux pages qui affichent un indice, plutôt que
 * la même condition réécrite dans chacune.
 */

/** Ce que l'écran affiche à la place du chiffre, en nommant la cause. */
const LIBELLES_SANS_SCORE = {
  NON_CALCULABLE: 'Non calculable',
  SANS_EVALUATION: 'En attente d’évaluations',
};

/** Explication complète, pour une infobulle ou une ligne secondaire. */
const EXPLICATIONS = {
  NON_CALCULABLE: 'Aucun critère n’est rattaché à ce bailleur : le périmètre de mesure reste à définir.',
  SANS_EVALUATION: 'Des critères sont rattachés à ce bailleur, mais aucun n’est encore validé dans cette mission.',
};

/** Vrai lorsque l'indice porte un score exploitable. */
export function porteUnScore(indice) {
  return indice?.statut === 'CALCULE' && indice?.score !== null && indice?.score !== undefined;
}

/** Le score formaté, ou le motif de son absence. Jamais « 0.00 » par défaut. */
export function libelleIndice(indice) {
  if (porteUnScore(indice)) return `${Number(indice.score).toFixed(2)} / 5`;
  return LIBELLES_SANS_SCORE[indice?.statut] ?? 'Indisponible';
}

/** La phrase qui explique une absence de score, ou null si l'indice en porte un. */
export function explicationIndice(indice) {
  if (porteUnScore(indice)) return null;
  return EXPLICATIONS[indice?.statut] ?? null;
}

/** « 3 critères retenus sur 12 rattachés » — le périmètre réel du calcul. */
export function libellePerimetre(indice) {
  if (!indice || indice.nombreCriteresTagues === undefined) return null;
  return `${indice.nombreCriteresRetenus} critère(s) retenu(s) sur ${indice.nombreCriteresTagues} rattaché(s) à ce bailleur`;
}
