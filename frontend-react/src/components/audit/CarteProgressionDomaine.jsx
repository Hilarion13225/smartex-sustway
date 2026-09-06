import { ArrowRight } from 'lucide-react';

/**
 * Avancement de l'évaluation sur le domaine du critère affiché. Les compteurs
 * viennent des critères réellement portés par la mission, pas d'une valeur
 * figée : la barre suit donc chaque enregistrement.
 */
export default function CarteProgressionDomaine({ domaine, completes, total, surVoirDetail }) {
  const pourcentage = total > 0 ? Math.round((completes / total) * 100) : 0;

  return (
    <section className="rounded-2xl border border-ink-100 bg-surface p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-ink-900">Progression dans le domaine</h3>
      <p className="mt-1 text-sm text-ink-500">{domaine}</p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-600">
          {completes} / {total} critères évalués
        </p>
        <span className="text-sm font-semibold tabular-nums text-ink-900">{pourcentage}%</span>
      </div>

      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-ink-100"
        role="progressbar"
        aria-valuenow={completes}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Progression du domaine ${domaine}`}
      >
        <div
          className="h-full rounded-full bg-brand-600 transition-[width] duration-500"
          style={{ width: `${pourcentage}%` }}
        />
      </div>

      {surVoirDetail ? (
        <button
          type="button"
          onClick={surVoirDetail}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-ink-200 bg-surface px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100"
        >
          Prochain critère à évaluer
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </section>
  );
}
