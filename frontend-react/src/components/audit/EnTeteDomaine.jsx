import { LayoutGrid } from 'lucide-react';

/**
 * Bandeau de domaine : identité du domaine évalué à gauche, avancement et
 * accès à la liste complète des critères à droite. Posé directement sur le
 * fond de page, sans carte, pour rester en retrait de la carte du critère.
 */
export default function EnTeteDomaine({ icone: Icone, domaine, description, completes, total, surVoirTousLesCriteres }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-ink-100 bg-surface text-brand-600 shadow-sm dark:text-brand-400">
          <Icone className="h-6 w-6" strokeWidth={1.6} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-ink-900">
            Domaine&nbsp;: <span className="font-bold">{domaine}</span>
          </h2>
          <p className="mt-0.5 text-sm text-ink-500">{description}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="rounded-full bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-400">
          {completes} / {total} critères complétés
        </span>
        <button
          type="button"
          onClick={surVoirTousLesCriteres}
          className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-surface px-3.5 py-2 text-sm font-medium text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700 dark:hover:text-brand-400"
        >
          <LayoutGrid className="h-4 w-4" aria-hidden />
          Voir tous les critères
        </button>
      </div>
    </div>
  );
}
