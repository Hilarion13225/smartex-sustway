import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import EnTetePublic from './EnTetePublic';
import PiedPublic from './PiedPublic';
import BandeauReferentiels from './vitrine/BandeauReferentiels';

/*
 * Les cinq pages de la charte SMARTEX SustWay.
 *
 * Elles portent leurs propres fonds, leur palette et leur typographie. Le
 * bandeau des référentiels, lui, n'est plus réservé aux pages héritées : il
 * court désormais sous toutes les pages publiques.
 */
const PAGES_SUSTWAY = ['/', '/solution', '/fonctionnalites', '/offres', '/ressources'];

/*
 * Les pages qui n'ont pas de pied de page.
 *
 * L'accueil seul. Il ne porte plus que son héros et tient dans une fenêtre,
 * sans rien à faire défiler : un pied de page en dessous rouvrirait le
 * défilement pour lui seul, et l'écran d'entrée ne serait plus fixe.
 *
 * Le plan du site et les mentions légales restent atteignables, puisque toutes
 * les autres pages publiques gardent leur pied. La barre de navigation, elle,
 * est présente ici comme ailleurs.
 */
const PAGES_SANS_PIED = ['/'];

/*
 * Pages dont le haut est sombre, et sur lesquelles la barre de navigation se
 * pose en transparent avec un texte clair.
 *
 * Ce sont celles qui ouvrent sur un bandeau — les quatre pages intérieures de
 * la charte, les bandeaux photo des pages antérieures, et le décor de la page
 * d'entrée. Luminances relevées au navigateur juste sous la barre : 0,054 pour
 * le vert Forest des bandeaux, 0,007 pour le décor de la page d'entrée, contre
 * 0,925 pour le fond Mist des pages qui n'en ont pas.
 *
 * Une liste plutôt qu'une mesure au chargement : le résultat est le même et il
 * ne dépend pas de l'instant où l'on regarde. En contrepartie, une page à
 * bandeau ajoutée plus tard doit être inscrite ici, faute de quoi sa barre
 * restera en texte sombre sur un fond sombre. Le défaut est volontairement de
 * ce côté : une page sans bandeau oubliée garde un texte lisible.
 *
 * « /solution » n'y figure plus : son bandeau photographique a été retiré, la
 * page s'ouvre sur un fond blanc, et sa barre doit donc revenir au texte
 * sombre — sinon du blanc sur du blanc.
 */
const PAGES_EN_TETE_SOMBRE = [
  '/',
  '/fonctionnalites',
  '/offres',
  '/ressources',
  '/methodologie',
  '/deploiement',
];

/** Mise en page commune des pages publiques (vitrine) : en-tête, contenu, pied de page. */
export default function LayoutPublic() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const cible = document.querySelector(hash);
      if (cible) {
        // Défilement doux vers l'ancre, sauf si le visiteur a demandé moins
        // d'animations : le saut direct est alors la bonne réponse.
        const sansAnimation = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        cible.scrollIntoView({ behavior: sansAnimation ? 'auto' : 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, hash]);

  /*
   * Deux régimes de mise en page.
   *
   * Les cinq pages de la charte prennent `sustway` : leur palette et leur
   * typographie à une seule famille.
   *
   * Les autres pages publiques gardent `vitrine`, qui porte en plus les règles
   * de forme du design « Registre de preuves » (voir index.css) : rayons
   * courts, aucune ombre, capitales non espacées. La charte SustWay demande
   * l'inverse sur ces trois points, d'où deux enveloppes distinctes plutôt
   * qu'une série d'exceptions.
   *
   * Le choix se fait ici, sur le conteneur commun, pour que l'en-tête et le
   * pied — partagés par toutes les pages publiques — suivent la charte de la
   * page qu'ils encadrent.
   */
  /*
   * La hauteur du bandeau, publiée en `--hauteur-bandeau`.
   *
   * Le bandeau est une barre fixe au bas de la fenêtre : il prend une
   * soixantaine de pixels à toutes les pages, et les sections qui doivent
   * tenir dans un écran doivent les retrancher, sans quoi leur bas passe
   * dessous. Voir `pleineHauteur` dans `sustway/Section.jsx`.
   *
   * La mesure est prise ici plutôt que dans le bandeau lui-même, qui rend déjà
   * au document la hauteur qu'il lui prend et n'a pas à connaître ses
   * lecteurs. Même motif que `--hauteur-pied`, publiée par le pied.
   *
   * L'élément est cherché par sa classe : il est rendu par un enfant, et un
   * élément en position fixe ne donne pas sa hauteur à l'enveloppe qui le
   * contient.
   */
  useEffect(() => {
    const bandeau = document.querySelector('.bandeau-arret');
    if (!bandeau) return undefined;

    const publier = () => {
      document.documentElement.style.setProperty('--hauteur-bandeau', `${bandeau.offsetHeight}px`);
    };
    publier();

    const observateur = typeof ResizeObserver === 'function' ? new ResizeObserver(publier) : null;
    if (observateur) observateur.observe(bandeau);
    else window.addEventListener('resize', publier);

    return () => {
      document.documentElement.style.removeProperty('--hauteur-bandeau');
      if (observateur) observateur.disconnect();
      else window.removeEventListener('resize', publier);
    };
  }, []);

  const estSustWay = PAGES_SUSTWAY.includes(pathname);
  const enTeteSombre = PAGES_EN_TETE_SOMBRE.includes(pathname);
  const avecPied = !PAGES_SANS_PIED.includes(pathname);

  return (
    <div className={`${estSustWay ? 'sustway' : 'vitrine'} flex min-h-full flex-col bg-ink-50 text-ink-600`}>
      <EnTetePublic surFondSombre={enTeteSombre} />

      <main className={`flex-1 ${enTeteSombre ? '' : 'pt-[72px]'}`}>
        <Outlet />
      </main>

      {avecPied ? <PiedPublic /> : null}

      {/* Le bandeau des référentiels est la contrepartie basse de la barre de
          navigation : il est donc rendu ici, une fois pour toutes les pages
          publiques, plutôt que répété page par page. */}
      <BandeauReferentiels />
    </div>
  );
}
