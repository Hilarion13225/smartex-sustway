import clsx from 'clsx';
import { Check } from 'lucide-react';

/**
 * Fil des cinq étapes de l'import assisté.
 *
 * Voisin visuel des onglets de mission, mais ce n'est pas la même chose : un
 * onglet se choisit, une étape s'atteint. Rien n'est cliquable — l'étape
 * courante est déduite de l'état du serveur, et laisser sauter en avant
 * afficherait un écran qui n'a pas encore de quoi se remplir. D'où
 * `aria-current="step"` plutôt qu'un `role="tablist"`.
 *
 * Vertical sous `sm` : cinq libellés côte à côte sur un téléphone deviennent
 * cinq colonnes illisibles.
 */
export const ETAPES = [
  { cle: 'importer', libelle: 'Importer' },
  { cle: 'analyser', libelle: 'Analyser' },
  { cle: 'verifier', libelle: 'Vérifier' },
  { cle: 'valider', libelle: 'Valider' },
  { cle: 'publier', libelle: 'Publier' },
];

export default function EtapesImport({ etapeCourante }) {
  const index = ETAPES.findIndex((etape) => etape.cle === etapeCourante);

  return (
    <ol
      className="mb-6 flex flex-col gap-1 border-b border-ink-100 pb-4 sm:flex-row sm:items-center sm:gap-0 sm:pb-0"
      aria-label="Étapes de l’import"
    >
      {ETAPES.map((etape, rang) => {
        const franchie = rang < index;
        const courante = rang === index;

        return (
          <li
            key={etape.cle}
            aria-current={courante ? 'step' : undefined}
            className="flex flex-1 items-center gap-2 sm:flex-col sm:items-stretch sm:gap-0"
          >
            <div className="flex items-center gap-2 sm:justify-center sm:py-2.5">
              <span
                className={clsx(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                  franchie && 'bg-emerald-600 text-white dark:bg-emerald-500',
                  courante && 'bg-brand-600 text-white',
                  !franchie && !courante && 'bg-ink-100 text-ink-500'
                )}
              >
                {franchie ? <Check className="h-3.5 w-3.5" aria-hidden /> : rang + 1}
              </span>
              <span
                className={clsx(
                  'text-sm',
                  courante ? 'font-semibold text-ink-900' : 'text-ink-500'
                )}
              >
                {etape.libelle}
                {franchie ? <span className="sr-only"> — étape franchie</span> : null}
              </span>
            </div>
            <span
              aria-hidden
              className={clsx(
                'hidden h-0.5 w-full sm:block',
                franchie ? 'bg-emerald-500' : courante ? 'bg-brand-500' : 'bg-ink-100'
              )}
            />
          </li>
        );
      })}
    </ol>
  );
}
