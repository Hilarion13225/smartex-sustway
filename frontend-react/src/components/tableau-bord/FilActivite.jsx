import clsx from 'clsx';

/**
 * Journal des dernières actions, groupé par jour.
 *
 * Les entrées viennent du journal d'audit réel (RG15) : ce sont les actions
 * effectivement enregistrées côté serveur, pas une reconstitution côté
 * client, de sorte que la chronologie reste opposable.
 */
export default function FilActivite({ groupes }) {
  if (groupes.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink-200 px-4 py-8 text-center text-xs text-ink-500">
        Aucune activité enregistrée.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {groupes.map((groupe) => (
        <div key={groupe.jour}>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{groupe.jour}</p>
          <ul className="mt-3 space-y-3.5">
            {groupe.entrees.map((entree) => (
              <li key={entree.id} className="relative flex gap-3 pl-1">
                {/* Filet vertical reliant les points, interrompu au dernier. */}
                <span className="flex flex-col items-center">
                  <span className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', entree.couleur)} />
                  <span className="mt-1 w-px flex-1 bg-ink-100" />
                </span>
                <div className="min-w-0 flex-1 pb-0.5">
                  <p className="text-sm leading-snug text-ink-700">{entree.libelle}</p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    {entree.heure}
                    {entree.auteur ? ` · ${entree.auteur}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
