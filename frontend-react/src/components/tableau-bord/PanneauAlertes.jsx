import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * Points appelant une intervention, classés par urgence décroissante.
 *
 * Les fonds restent très pâles et le rouge est réservé au plus critique :
 * trois encarts rouges côte à côte ne hiérarchiseraient plus rien.
 */
export default function PanneauAlertes({ alertes }) {
  const tons = {
    critique: 'border-brand-100 bg-brand-50/70 dark:border-brand-500/20 dark:bg-brand-500/10',
    attention: 'border-amber-100 bg-amber-50/70 dark:border-amber-500/20 dark:bg-amber-500/10',
    information: 'border-ink-100 bg-ink-50 dark:bg-ink-100/50',
  };
  const tonsIcone = {
    critique: 'text-brand-600 dark:text-brand-400',
    attention: 'text-amber-600 dark:text-amber-400',
    information: 'text-ink-500',
  };

  return (
    <div className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-ink-900">Alertes prioritaires</h2>
      <p className="mt-0.5 text-xs text-ink-500">Points nécessitant une attention immédiate.</p>

      {alertes.length === 0 ? (
        <p className="mt-5 rounded-xl bg-emerald-50 px-3.5 py-3 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          Aucun point bloquant sur vos missions.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {alertes.map((alerte) => {
            const contenu = (
              <>
                <div className="flex items-start gap-2.5">
                  <alerte.icone
                    className={`mt-0.5 h-4 w-4 shrink-0 ${tonsIcone[alerte.ton]}`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900">{alerte.titre}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-600">{alerte.detail}</p>
                  </div>
                  {alerte.lien ? (
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden />
                  ) : null}
                </div>
              </>
            );

            return (
              <li key={alerte.titre}>
                {alerte.lien ? (
                  <Link
                    to={alerte.lien}
                    className={`block rounded-xl border p-3.5 transition-colors hover:border-ink-300 ${tons[alerte.ton]}`}
                  >
                    {contenu}
                  </Link>
                ) : (
                  <div className={`rounded-xl border p-3.5 ${tons[alerte.ton]}`}>{contenu}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
