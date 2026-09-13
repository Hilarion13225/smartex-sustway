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

/**
 * Ce que l'écran affiche à la place du chiffre, en nommant la cause.
 *
 * Les libellés restent volontairement génériques : le nom du bailleur est
 * déjà affiché à côté, et écrire « IFC/SFI » en dur mentirait le jour où un
 * second bailleur existera.
 */
const LIBELLES_SANS_SCORE = {
  NON_CALCULABLE: 'Mapping non disponible',
  SANS_EVALUATION: 'En attente d’évaluations',
};

/**
 * Explication complète, pour une infobulle ou une ligne secondaire.
 *
 * `NON_CALCULABLE` dit ce qui manque et à quelle condition cela se comble :
 * le rattachement des critères à un bailleur engage une décision de
 * financement, il vient d'un document officiel et d'une relecture humaine,
 * jamais d'une déduction. Tant qu'il n'existe pas, aucun financement n'est
 * recommandé sur ce référentiel — et le dire vaut mieux que de laisser
 * croire à un calcul qui n'a pas eu lieu.
 */
const EXPLICATIONS = {
  NON_CALCULABLE:
    'Aucun critère n’est rattaché à ce bailleur. Ce rattachement exige une source officielle vérifiable : '
    + 'aucun financement n’est recommandé sur ce référentiel pour le moment.',
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
