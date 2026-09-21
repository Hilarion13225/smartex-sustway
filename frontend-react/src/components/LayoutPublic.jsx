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
const PAGES_SUSTWAY = ['/', '/solution', '/fonctionnalites', '/offres', '/ressources'];

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

  const estSustWay = PAGES_SUSTWAY.includes(pathname);

  return (
    /*
     * Une enveloppe ou l'autre, jamais les deux.
     *
     * Les deux bornent la palette publique — l'espace connecté, rendu hors
     * d'elles, garde la sienne — mais elles ne portent pas la même charte.
     * `vitrine` applique en plus les règles de forme du design « Registre de
     * preuves » (voir index.css) : rayons courts, aucune ombre, capitales non
     * espacées. La charte SMARTEX SustWay demande l'inverse sur ces trois
     * points, d'où une enveloppe distincte plutôt qu'une série d'exceptions.
     *
     * Le choix se fait ici, sur le conteneur commun, pour que l'en-tête et le
     * pied — partagés par toutes les pages publiques — suivent la charte de la
     * page qu'ils encadrent.
     */
    <div className={`${estSustWay ? 'sustway' : 'vitrine'} flex min-h-full flex-col bg-ink-50 text-ink-600`}>
      <EnTetePublic />
      <main className="flex-1">
        <Outlet />
      </main>
      <PiedPublic />
      {/* Le bandeau des référentiels est la contrepartie basse de la barre de
          navigation : il est donc rendu ici, une fois pour toute la vitrine,
          plutôt que répété page par page. */}
      {estSustWay ? null : <BandeauReferentiels />}
    </div>
  );
}
