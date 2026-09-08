import clsx from 'clsx';
import { Check, X } from 'lucide-react';

const REPONSES = [
  { code: 'OUI', libelle: 'Oui', icone: Check },
  { code: 'NON', libelle: 'Non', icone: X },
];

/**
 * Réponse à une question factuelle : l'échelle de maturité n'a pas de sens
 * pour un constat (« Utilisez-vous des produits chimiques interdits ? »),
 * qui appelle un oui ou un non.
 *
 * Aucune des deux réponses n'est présentée comme favorable : selon la
 * question, « oui » signale une exposition à traiter ou une pratique en
 * place, et le laisser deviner par la couleur induirait en erreur.
 */
export default function CarteReponseBinaire({ valeur, surSelection, lectureSeule = false }) {
  return (
    <div className="mt-6 grid max-w-md grid-cols-2 gap-3">
      {REPONSES.map(({ code, libelle, icone: Icone }) => {
        const selectionne = valeur === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => surSelection(code)}
            aria-pressed={selectionne}
            disabled={lectureSeule}
            className={clsx(
              'flex items-center justify-center gap-2.5 rounded-2xl border p-4 text-sm font-semibold transition duration-200',
              selectionne
                ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm dark:bg-brand-500/10 dark:text-brand-300'
                : 'border-ink-200 bg-surface text-ink-600',
              lectureSeule
                ? 'cursor-default'
                : !selectionne && 'hover:border-brand-300 hover:text-brand-700'
            )}
          >
            <span
              className={clsx(
                'flex h-7 w-7 items-center justify-center rounded-full',
                selectionne ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500'
              )}
            >
              <Icone className="h-4 w-4" aria-hidden />
            </span>
            {libelle}
          </button>
        );
      })}
    </div>
  );
}
