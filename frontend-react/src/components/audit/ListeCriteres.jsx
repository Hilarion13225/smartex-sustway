import clsx from 'clsx';
import { Check } from 'lucide-react';
import { estRenseigne } from './statutsCritere';

/**
 * Grille de tous les critères de la mission, servant de raccourci de
 * navigation : la saisie se faisant critère par critère, atteindre un critère
 * éloigné imposerait sinon d'enchaîner les flèches « suivant ».
 */
export default function ListeCriteres({ criteres, indiceCourant, surSelection }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-surface p-4 shadow-sm">
      <ul className="flex flex-wrap gap-2">
        {criteres.map((critere, indice) => {
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
