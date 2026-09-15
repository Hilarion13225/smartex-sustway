/**
 * Présentation d'un score sur 5 (V74-C3).
 *
 * Le serveur rend les scores à quatre décimales ; les rapports les impriment
 * à deux, arrondis au plus proche, égalité vers le haut (HALF_UP décimal, voir
 * RapportGenerationService.formaterScore). `Number.toFixed` arrondit la valeur
 * binaire du nombre, pas son écriture décimale : 3.0050 y devient « 3.00 » là
 * où le rapport écrit « 3.01 ». L'arrondi se fait donc ici sur l'écriture.
 *
 * Ce module ne sert qu'à la présentation. Les tris et les calculs gardent la
 * valeur brute ; une couleur ou un style qui dépend d'un score lit
 * `valeurScoreAffichee`, pour qu'un « 4.00 » affiché ne soit jamais classé
 * comme 3,995.
 */

/** Le score en centièmes, arrondi HALF_UP ; null s'il n'y a pas de nombre. */
function centiemes(valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return null;
  const nombre = Number(valeur);
  if (!Number.isFinite(nombre)) return null;
  // String() rend l'écriture décimale la plus courte qui redonne le même
  // nombre : pour une valeur à quatre décimales venue du JSON, c'est celle du
  // serveur. La notation exponentielle ne concerne que des valeurs hors échelle.
  let ecriture = String(nombre);
  if (/e/i.test(ecriture)) ecriture = nombre.toFixed(20);
  const [, signe, entier, decimales = ''] = /^(-?)(\d+)(?:\.(\d+))?$/.exec(ecriture);
  const chiffres = decimales.padEnd(3, '0');
  let resultat = Number(entier) * 100 + Number(chiffres.slice(0, 2));
  if (Number(chiffres[2]) >= 5) resultat += 1;
  return signe && resultat !== 0 ? -resultat : resultat;
}

/** Le score tel qu'il s'affiche : deux décimales, « — » à défaut de valeur. */
export function formaterScore(valeur) {
  const c = centiemes(valeur);
  if (c === null) return '—';
  const absolu = Math.abs(c);
  return `${c < 0 ? '-' : ''}${Math.floor(absolu / 100)}.${String(absolu % 100).padStart(2, '0')}`;
}

/** La valeur affichée, en nombre : la seule à comparer aux seuils de présentation. */
export function valeurScoreAffichee(valeur) {
  const c = centiemes(valeur);
  return c === null ? null : c / 100;
}
