import clsx from 'clsx';

/**
 * Indicateur clé du tableau de bord : une valeur, son intitulé et une
 * précision. L'icône reste discrète — sur quatre cartes alignées, un aplat
 * de couleur par carte transformerait la ligne en bandeau publicitaire.
 */
export default function CarteKpi({ icone: Icone, valeur, libelle, precision, ton = 'neutre' }) {
  const tons = {
    neutre: 'bg-ink-100 text-ink-500',
    marque: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400',
    alerte: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
    succes: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  };

  return (
    <div className="rounded-2xl border border-ink-100 bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{libelle}</p>
        <span className={clsx('hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:flex', tons[ton])}>
          <Icone className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-ink-900 sm:text-3xl">{valeur}</p>
      {precision ? <p className="mt-1 text-xs text-ink-500">{precision}</p> : null}
    </div>
  );
}
