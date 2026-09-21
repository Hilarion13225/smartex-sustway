import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import EnTetePublic from './EnTetePublic';
import PiedPublic from './PiedPublic';
import BandeauReferentiels from './vitrine/BandeauReferentiels';

/*
 * Les cinq pages de la charte SMARTEX SustWay.
 *
 * Elles portent leurs propres fonds et se terminent toutes par un appel à
 * l'action : le bandeau des référentiels viendrait s'ajouter juste en dessous,
 * et répéterait un appel là où il y en a déjà un.
 */
const PAGES_SUSTWAY = ['/accueil', '/solution', '/fonctionnalites', '/offres', '/ressources'];

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
 */
const PAGES_EN_TETE_SOMBRE = [
  '/',
  '/solution',
  '/fonctionnalites',
  '/offres',
  '/ressources',
  '/services',
  '/methodologie',
  '/formules',
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
   * Trois régimes de mise en page, et non deux.
   *
   * La racine porte la page d'entrée, dont le décor impose le sombre à toute
   * la page : elle ne reçoit aucune des deux enveloppes, pour garder la
   * palette de `:root` que ce décor attend, et s'arrête à son héros — ni pied
   * de page ni bandeau.
   *
   * Les cinq pages de la charte prennent `sustway` : leur palette, leur
   * typographie à une seule famille, et pas de bandeau non plus, chacune
   * finissant déjà par un appel à l'action.
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
  const estEntree = pathname === '/';
  const estSustWay = PAGES_SUSTWAY.includes(pathname);
  const enveloppe = estEntree ? '' : estSustWay ? 'sustway ' : 'vitrine ';
  const enTeteSombre = PAGES_EN_TETE_SOMBRE.includes(pathname);

  return (
    <div className={`${enveloppe}flex min-h-full flex-col bg-ink-50 text-ink-600`}>
      <EnTetePublic surFondSombre={enTeteSombre} />

      {/*
        * La barre étant en position fixe, elle ne réserve plus sa hauteur.
        * Les pages qui ouvrent sur un bandeau n'ont rien à compenser : leur
        * bandeau passe volontairement dessous, et son titre est assez bas pour
        * n'être jamais couvert. Les autres démarreraient sinon sous la barre.
        */}
      <main className={`flex-1 ${enTeteSombre ? '' : 'pt-[72px]'}`}>
        <Outlet />
      </main>

      {/* La page d'entrée s'arrête à son héros : elle n'affiche pas le pied de page. */}
      {estEntree ? null : <PiedPublic />}

      {/* Le bandeau des référentiels est la contrepartie basse de la barre de
          navigation : il est donc rendu ici, une fois pour toutes les pages
          héritées, plutôt que répété page par page. */}
      {estEntree || estSustWay ? null : <BandeauReferentiels />}
    </div>
  );
}
