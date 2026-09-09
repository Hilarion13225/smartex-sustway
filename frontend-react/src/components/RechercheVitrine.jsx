import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, X } from 'lucide-react';
import { PAGES_PUBLIQUES, rechercherPages } from '../config/pagesPubliques';

/**
 * Recherche dans les pages de la vitrine.
 *
 * Entièrement côté navigateur : l'index tient dans `config/pagesPubliques.js`,
 * il n'y a donc ni appel réseau ni dépendance au backend, et la recherche
 * répond instantanément. Elle ne couvre que les pages publiques — le contenu
 * de l'espace connecté dépend des droits de chacun et n'a rien à faire dans un
 * index consultable sans compte.
 */
export default function RechercheVitrine({ surFermeture }) {
  const [requete, definirRequete] = useState('');
  const naviguer = useNavigate();

  // Requête vide : on propose l'ensemble des pages plutôt qu'un panneau vide,
  // ce qui fait aussi office de plan du site.
  const resultats = useMemo(
    () => (requete.trim() ? rechercherPages(requete) : PAGES_PUBLIQUES),
    [requete]
  );

  useEffect(() => {
    const surTouche = (evenement) => {
      if (evenement.key === 'Escape') surFermeture();
    };
    document.addEventListener('keydown', surTouche);
    // Empêche la page de défiler derrière le panneau ouvert.
    const debordementInitial = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', surTouche);
      document.body.style.overflow = debordementInitial;
    };
  }, [surFermeture]);

  const ouvrir = (chemin) => {
    naviguer(chemin);
    surFermeture();
  };

  const surEnvoi = (evenement) => {
    evenement.preventDefault();
    if (resultats.length > 0) ouvrir(resultats[0].chemin);
  };

  /*
   * Monté dans <body> par portail, et non à sa place dans l'arbre : l'en-tête
   * porte un `backdrop-blur`, et un filtre d'arrière-plan fait du parent le
   * bloc conteneur de ses descendants `fixed`. Rendue sur place, la
   * surimpression se retrouvait enfermée dans les 84 px de la barre.
   */
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-center px-4 pt-20 sm:pt-28">
      <button
        type="button"
        aria-label="Fermer la recherche"
        onClick={surFermeture}
        className="absolute inset-0 cursor-default bg-ink-900/40 backdrop-blur-sm motion-safe:animate-apparition-tick"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recherche dans le site"
        className="relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-soft motion-safe:animate-apparition-douce"
      >
        <form onSubmit={surEnvoi} className="flex items-center gap-3 border-b border-ink-100 px-4 py-3.5">
          <Search className="h-5 w-5 shrink-0 text-ink-400" aria-hidden />
          <input
            type="search"
            value={requete}
            onChange={(evenement) => definirRequete(evenement.target.value)}
            placeholder="Rechercher une page…"
            aria-label="Rechercher une page"
            autoFocus
            className="min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
          />
          <button
            type="button"
            onClick={surFermeture}
            aria-label="Fermer la recherche"
            className="btn-ghost shrink-0 p-1.5"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </form>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {resultats.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-ink-500">
              Aucune page ne correspond à « {requete.trim()} ».
            </p>
          ) : (
            <ul>
              {resultats.map((page) => (
                <li key={page.chemin}>
                  <button
                    type="button"
                    onClick={() => ouvrir(page.chemin)}
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-ink-100"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink-900">{page.titre}</span>
                      <span className="block truncate text-xs text-ink-500">{page.description}</span>
                    </span>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-ink-300 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-brand-600"
                      aria-hidden
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
