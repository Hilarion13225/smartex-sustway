import clsx from 'clsx';

/**
 * Carte d'un niveau de maturité. Rendue en `<button>` plutôt qu'en `<div>`
 * cliquable : le niveau se sélectionne alors aussi au clavier, et
 * `aria-pressed` annonce l'état choisi aux lecteurs d'écran.
 */
export default function CarteNiveauMaturite({ niveau, titre, description, selectionne, surSelection }) {
  return (
    <button
      type="button"
      onClick={surSelection}
      aria-pressed={selectionne}
      className={clsx(
        'flex h-full flex-col items-center rounded-2xl border p-5 text-center transition duration-200',
        selectionne
          ? 'border-brand-500 bg-brand-50/60 shadow-sm dark:bg-brand-500/10'
          : 'border-ink-100 bg-surface hover:border-brand-200 hover:bg-ink-50/60'
      )}
    >
      <span
        className={clsx(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-semibold transition duration-200',
          selectionne ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500'
        )}
      >
        {niveau}
      </span>
      <span
        className={clsx(
          'mt-4 text-sm font-semibold leading-snug',
          selectionne ? 'text-ink-900' : 'text-ink-800'
        )}
      >
        {titre}
      </span>
      <span className="mt-2.5 text-xs leading-relaxed text-ink-500">{description}</span>
    </button>
  );
}
