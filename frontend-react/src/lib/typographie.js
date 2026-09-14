/**
 * Typographie française : une espace fine insécable avant « ? », « ! », « ; »
 * et « : », et à l'intérieur des guillemets.
 *
 * Sans elle, un titre qui se termine par « RSE ? » peut laisser le point
 * d'interrogation seul en début de ligne — une faute qu'un lecteur francophone
 * voit tout de suite, et qui trahit un gabarit pensé en anglais.
 */
const ESPACE_FINE = ' ';

export function typoFr(texte) {
  if (typeof texte !== 'string') return texte;
  return texte
    .replace(/ ([?!;:])/g, `${ESPACE_FINE}$1`)
    .replace(/« /g, `«${ESPACE_FINE}`)
    .replace(/ »/g, `${ESPACE_FINE}»`);
}
