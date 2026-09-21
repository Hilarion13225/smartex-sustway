import { useEffect, useState } from 'react';

/*
 * Section actuellement lue, pour marquer l'entrée correspondante dans la
 * navigation.
 *
 * Le repère est une bande horizontale fine placée sous l'en-tête plutôt que la
 * fenêtre entière : avec `rootMargin: '-88px 0px -70% 0px'`, seule la portion
 * haute du contenu compte. Sans cela, deux sections seraient « visibles » en
 * même temps pendant la moitié du défilement, et l'entrée active clignoterait
 * entre les deux.
 *
 * Les 88 px du haut sont la hauteur de l'en-tête collant : une section passée
 * dessous n'est plus lue, elle ne doit donc plus être active. C'est la même
 * valeur que le `scroll-padding-top` de la page, pour que cliquer sur une
 * entrée amène bien la section dans la bande qui la rend active.
 *
 * `actif` vaut `null` tant qu'aucune section n'est repérée — en haut de page,
 * ou sur une page qui n'a aucune de ces ancres. Aucune entrée n'est alors
 * marquée, ce qui vaut mieux que d'en marquer une au hasard.
 */
export function useSectionActive(ancres, { actif: observationActive = true } = {}) {
  const [active, definirActive] = useState(null);

  useEffect(() => {
    if (!observationActive || typeof IntersectionObserver === 'undefined') {
      definirActive(null);
      return undefined;
    }

    const sections = ancres.map((ancre) => document.getElementById(ancre)).filter(Boolean);
    if (sections.length === 0) return undefined;

    // Les sections traversant la bande. Un `Set` plutôt qu'un tableau : une
    // section entre et sort plusieurs fois au fil du défilement, et on ne veut
    // pas de doublons.
    const traversantes = new Set();

    const observateur = new IntersectionObserver(
      (entrees) => {
        entrees.forEach((entree) => {
          if (entree.isIntersecting) traversantes.add(entree.target.id);
          else traversantes.delete(entree.target.id);
        });
        /*
         * La dernière dans l'ordre du document, et non la première.
         *
         * Deux sections traversent la bande pendant toute la transition de
         * l'une à l'autre : la fin de celle qu'on quitte et le début de celle
         * qu'on aborde. Retenir la première laissait la navigation sur la
         * section précédente — mesuré au navigateur, « Solution » restait
         * marquée alors que « Fonctionnalités » occupait tout l'écran.
         * La dernière est celle dont le titre vient de passer le repère,
         * c'est-à-dire celle qu'on lit.
         */
        const courante = [...ancres].reverse().find((ancre) => traversantes.has(ancre));
        definirActive(courante ?? null);
      },
      { rootMargin: '-88px 0px -70% 0px', threshold: 0 }
    );

    sections.forEach((section) => observateur.observe(section));
    return () => observateur.disconnect();
    // `ancres` est une constante de module côté appelant ; la sérialiser
    // évite de dépendre de son identité de tableau, qui changerait à chaque
    // rendu si elle était construite en ligne.
  }, [ancres.join(','), observationActive]); // eslint-disable-line react-hooks/exhaustive-deps

  return active;
}
