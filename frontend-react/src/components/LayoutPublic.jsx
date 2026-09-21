import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import EnTetePublic from './EnTetePublic';
import PiedPublic from './PiedPublic';
import BandeauReferentiels from './vitrine/BandeauReferentiels';

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

  // La page d'accueil est un parcours d'une seule page, dont les sections
  // portent leurs propres fonds : elle n'affiche pas le bandeau des
  // référentiels, qui viendrait s'ajouter sous son appel à l'action final.
  const estAccueil = pathname === '/';

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
    <div className={`${estAccueil ? 'sustway' : 'vitrine'} flex min-h-full flex-col bg-ink-50 text-ink-600`}>
      <EnTetePublic />
      <main className="flex-1">
        <Outlet />
      </main>
      <PiedPublic />
      {/* Le bandeau des référentiels est la contrepartie basse de la barre de
          navigation : il est donc rendu ici, une fois pour toute la vitrine,
          plutôt que répété page par page. */}
      {estAccueil ? null : <BandeauReferentiels />}
    </div>
  );
}
