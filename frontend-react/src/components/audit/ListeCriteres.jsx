import { useState } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { estRenseigne } from './statutsCritere';

/**
 * Grille de tous les critères de la mission, servant de raccourci de
 * navigation : la saisie se faisant critère par critère, atteindre un critère
 * éloigné imposerait sinon d'enchaîner les flèches « suivant ».
 *
 * La bascule « ne montrer que ce qui reste » vit ici, au-dessus de la grille
 * qu'elle filtre, et non dans le bandeau du domaine : c'est cette grille
 * qu'elle change. Elle ne sert à rien tant que presque rien n'est fait — elle
 * ne paraît donc qu'à partir du premier critère renseigné, et disparaît quand
 * tout l'est, n'ayant alors plus rien à masquer.
 *
 * Les indices passés à `surSelection` restent ceux de la liste complète : le
 * filtre change ce qu'on voit, jamais ce que la sélection désigne.
 */
export default function ListeCriteres({ criteres, indiceCourant, surSelection }) {
  const [masquerFaits, definirMasquerFaits] = useState(false);
  const nombreFaits = criteres.filter((critere) => estRenseigne(critere)).length;
  const basculeUtile = nombreFaits > 0 && nombreFaits < criteres.length;
  const visibles = criteres
    .map((critere, indice) => ({ critere, indice }))
    // Le critère courant reste visible même s'il est fait : le masquer
    // retirerait de la grille le seul repère qui dit où l'on est.
    .filter(({ critere, indice }) => !masquerFaits || !estRenseigne(critere) || indice === indiceCourant);

  return (
    <div className="rounded-2xl border border-ink-100 bg-surface p-4 shadow-sm">
      {basculeUtile ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-ink-500">
            {masquerFaits
              ? `${criteres.length - nombreFaits} critère${criteres.length - nombreFaits > 1 ? 's' : ''} restant${criteres.length - nombreFaits > 1 ? 's' : ''}`
              : `${criteres.length} critères · ${nombreFaits} fait${nombreFaits > 1 ? 's' : ''}`}
          </p>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-ink-600">
            <input
              type="checkbox"
              checked={masquerFaits}
              onChange={(evenement) => definirMasquerFaits(evenement.target.checked)}
              className="h-3.5 w-3.5 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
            />
            Ne montrer que ce qui reste
          </label>
        </div>
      ) : null}
      <ul className="flex flex-wrap gap-2">
        {visibles.map(({ critere, indice }) => {
          // Coche verte dès que l'organisation a renseigné le critère : la
          // grille sert à repérer ce qui reste à faire, or l'analyse IA
          // n'intervient qu'à la clôture.
          const evalue = estRenseigne(critere);
          const courant = indice === indiceCourant;
          return (
            <li key={critere.id}>
              <button
                type="button"
                onClick={() => surSelection(indice)}
                aria-current={courant ? 'true' : undefined}
                title={critere.critereLibelle}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                  courant
                    ? 'border-brand-500 bg-brand-600 text-white'
                    : evalue
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : 'border-ink-200 bg-surface text-ink-600 hover:border-brand-300 hover:text-brand-700 dark:hover:text-brand-400'
                )}
              >
                {evalue && !courant ? <Check className="h-3 w-3" aria-hidden /> : null}
                {critere.critereCode}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
