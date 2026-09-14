/*
 * Éléments de langage visuel partagés par les pages de la vitrine.
 *
 * Refonte « Registre de preuves » (voir DESIGN-VITRINE.md). Les exports gardent
 * leur nom et leur signature : les pages qui les importent n'ont pas à changer
 * pour adopter le nouveau langage.
 */

/*
 * Pastilles d'icônes. Les cinq teintes pastel de la version précédente
 * (rose, bleu, vert, ambre, violet) disent toutes « décoration » : dans un
 * produit d'audit, la couleur doit garder un sens — vert pour conforme,
 * bordeaux pour action requise. Toutes les pastilles passent donc sur une
 * même teinte encre ; les clés restent, pour ne casser aucun appel.
 */
const PASTILLE_ENCRE = 'bg-ink-100 text-ink-900';
export const PASTELS = {
  rouge: PASTILLE_ENCRE,
  bleu: PASTILLE_ENCRE,
  vert: PASTILLE_ENCRE,
  orange: PASTILLE_ENCRE,
  violet: PASTILLE_ENCRE,
};

/*
 * Soulignement tracé à main levée. Retiré du nouveau langage — le spécimen du
 * héros est le seul élément ornemental de la vitrine. Le composant reste
 * exporté et ne rend rien, pour que les pages qui l'appellent ne cassent pas.
 */
export function TraitManuscrit() {
  return null;
}

/*
 * Libellé de section, en casse de phrase. Remplace l'intitulé en petites
 * capitales rouges encadré de filets. `filetDroit` n'a plus d'effet ; il est
 * accepté pour la compatibilité des appels.
 */
// eslint-disable-next-line no-unused-vars
export function Etiquette({ children, filetDroit }) {
  return <p className="sur-titre">{children}</p>;
}
