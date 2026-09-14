import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import EnTetePublic from './EnTetePublic';
import PiedPublic from './PiedPublic';

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

  // La page d'entrée garde son design d'origine : seul l'en-tête y reçoit la
  // nouvelle identité. `contents` ne crée aucune boîte — l'en-tête reste
  // collant — mais transmet les variables de couleur de `vitrine`.
  const estEntree = pathname === '/';

  return (
    // `vitrine` borne la palette publique à cette enveloppe : l'espace connecté,
    // rendu hors d'elle, garde la sienne.
    <div className={`${estEntree ? '' : 'vitrine '}flex min-h-full flex-col bg-ink-50 text-ink-600`}>
      {estEntree ? (
        <div className="vitrine contents">
          <EnTetePublic />
        </div>
      ) : (
        <EnTetePublic />
      )}
      <main className="flex-1">
        <Outlet />
      </main>
      {/* La page d'entrée s'arrête à son héros : elle n'affiche pas le pied de page. */}
      {estEntree ? null : <PiedPublic />}
    </div>
  );
}
