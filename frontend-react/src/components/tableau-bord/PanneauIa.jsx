import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

/**
 * Synthèse des analyses produites par le pipeline d'agents.
 *
 * Volontairement sobre — pas de dégradé ni de halo : la crédibilité d'une
 * analyse d'audit tient à sa lisibilité, pas à son habillage.
 */
export default function PanneauIa({ metriques, lien }) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-ink-900">Intelligence IA</h2>
          <p className="text-xs text-ink-500">
            Synthèse des analyses réalisées par l’intelligence artificielle.
          </p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {metriques.map((metrique) => (
          <div key={metrique.libelle} className="rounded-xl border border-ink-100 p-4">
            <dd className="text-2xl font-bold tabular-nums text-ink-900">{metrique.valeur}</dd>
            <dt className="mt-1 text-xs leading-snug text-ink-500">{metrique.libelle}</dt>
          </div>
        ))}
      </dl>

      {lien ? (
        <Link
          to={lien}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400"
        >
          Voir toutes les analyses IA
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : null}
    </section>
  );
}
