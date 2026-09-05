import { ArrowLeft, ArrowRight } from 'lucide-react';

/**
 * Barre de navigation d'un critère à l'autre, avec la position courante et sa
 * traduction en barre de progression. Les boutons se désactivent aux
 * extrémités plutôt que de disparaître, pour que la barre garde sa symétrie.
 */
export default function NavigationCritere({ indice, total, surPrecedent, surSuivant }) {
  const progression = total > 0 ? (indice / total) * 100 : 0;
  const premier = indice <= 1;
  const dernier = indice >= total;

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-ink-100 bg-surface px-5 py-3.5 shadow-sm sm:px-6">
      <button
        type="button"
        onClick={surPrecedent}
        disabled={premier}
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-600 transition-colors hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-ink-600 dark:hover:text-brand-400"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Critère précédent</span>
      </button>

      <div className="flex min-w-0 flex-col items-center gap-2">
        <p className="whitespace-nowrap text-sm font-medium text-ink-700">
          Critère {indice} sur {total}
        </p>
        <div
          className="h-1 w-40 overflow-hidden rounded-full bg-ink-100 sm:w-48"
          role="progressbar"
          aria-valuenow={indice}
          aria-valuemin={1}
          aria-valuemax={total}
        >
          <div
            className="h-full rounded-full bg-brand-600 transition-[width] duration-500"
            style={{ width: `${progression}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={surSuivant}
        disabled={dernier}
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-600 transition-colors hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-ink-600 dark:hover:text-brand-400"
      >
        <span className="hidden sm:inline">Critère suivant</span>
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
