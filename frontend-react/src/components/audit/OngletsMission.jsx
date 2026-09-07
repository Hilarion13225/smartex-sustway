import clsx from 'clsx';

/**
 * Onglets du détail d'une mission.
 *
 * Rendus en boutons plutôt qu'en liens : les volets partagent les données
 * déjà chargées par la page (score, critères, preuves), les recharger à
 * chaque changement d'onglet serait du gaspillage. Les onglets qui mènent à
 * une page distincte sont fournis comme `lien` et rendus par le parent.
 */
export default function OngletsMission({ onglets, actif, surChangement }) {
  return (
    <div className="border-b border-ink-100">
      <div
        role="tablist"
        aria-label="Sections de la mission"
        className="-mb-px flex gap-1 overflow-x-auto"
      >
        {onglets.map((onglet) => {
          const selectionne = onglet.cle === actif;
          return (
            <button
              key={onglet.cle}
              type="button"
              role="tab"
              aria-selected={selectionne}
              onClick={() => surChangement(onglet.cle)}
              className={clsx(
                'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                selectionne
                  ? 'border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300'
                  : 'border-transparent text-ink-500 hover:border-ink-200 hover:text-ink-800'
              )}
            >
              {onglet.libelle}
              {onglet.compteur != null ? (
                <span className="ml-2 rounded-full bg-ink-100 px-1.5 py-0.5 text-[11px] tabular-nums text-ink-600">
                  {onglet.compteur}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
