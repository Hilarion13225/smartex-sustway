/**
 * Un critère porte deux textes : son libellé, formulation déclarative reprise
 * dans les tableaux et les rapports, et la question du référentiel, tournée
 * vers celui qui répond.
 *
 * Ils ne coïncident pas toujours — mais dans la grille RSE importée depuis
 * l'Excel du client, les 136 critères ont un libellé rigoureusement identique
 * à leur question. Afficher les deux revenait alors à imprimer deux fois la
 * même phrase à l'écran. On compare donc avant d'afficher, en ignorant la
 * casse, les espaces multiples et la ponctuation de fin : deux formulations
 * qui ne diffèrent que par un point d'interrogation sont la même phrase pour
 * le lecteur.
 */
export function memeTexte(a, b) {
  if (!a || !b) return false;
  return normaliser(a) === normaliser(b);
}

function normaliser(texte) {
  return texte
    .toLocaleLowerCase('fr')
    .replace(/\s+/g, ' ')
    .replace(/[.?!\s]+$/, '')
    .trim();
}
