import { ArrowRight, CheckCircle2, PlayCircle } from 'lucide-react';

/**
 * Où en est la collecte, et le geste pour la reprendre.
 *
 * La vue d'ensemble d'une mission ouvrait sur trois jauges — progression,
 * conformité, risque — puis proposait « Analyser la mission » et « Clôturer la
 * mission ». Les deux gestes de la fin, sur un écran qu'on ouvre quatre-vingt-
 * douze fois pendant tout le milieu. Mesuré sur une mission réelle : aucune
 * mention de reprise nulle part, et il fallait passer par l'onglet des
 * critères, qui rouvrait sur le premier de la liste.
 *
 * Ce bloc dit d'abord où l'on en est, puis mène là où le travail s'arrête.
 *
 * Il distingue deux comptes que la page confondait. « Renseignés » sont les
 * critères auxquels l'organisation a répondu ; « évalués » ceux que l'analyse
 * IA a notés. La jauge affichait les seconds sous le libellé « critères
 * évalués » pendant que le bloc d'analyse annonçait les premiers : l'écran
 * montrait 1 et 4 pour la même mission, sans que rien n'explique l'écart.
 */
export default function ReprendreMission({
  total,
  renseignes,
  evalues,
  /** Code du prochain critère sans réponse, s'il en reste un. */
  prochainCode,
  surReprendre,
  peutSaisir,
}) {
  const restants = Math.max(0, total - renseignes);
  const part = total > 0 ? Math.round((renseignes / total) * 100) : 0;
  const termine = restants === 0;

  return (
    <section className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink-900">
            {termine ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
            ) : (
              <PlayCircle className="h-5 w-5 text-brand-600 dark:text-brand-400" aria-hidden />
            )}
            {termine ? 'Collecte terminée' : 'Où vous en êtes'}
          </h2>
          <p className="mt-1.5 text-sm text-ink-600">
            {termine ? (
              <>
                Les {total} critères ont reçu une réponse. L’analyse peut être lancée.
              </>
            ) : (
              <>
                <span className="font-medium text-ink-900">
                  {renseignes} critère{renseignes > 1 ? 's' : ''} renseigné{renseignes > 1 ? 's' : ''}
                </span>{' '}
                sur {total} — il en reste {restants}.
                {/* Le compte des évaluations n'apparaît que s'il diffère : sinon
                    il répète la même information sous un autre nom. */}
                {evalues !== renseignes ? (
                  <>
                    {' '}
                    <span className="text-ink-500">
                      ({evalues} analysé{evalues > 1 ? 's' : ''} par l’IA)
                    </span>
                  </>
                ) : null}
              </>
            )}
          </p>
        </div>

        {peutSaisir && !termine ? (
          <button
            type="button"
            onClick={surReprendre}
            className="group inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {renseignes === 0 ? 'Commencer l’évaluation' : 'Reprendre l’évaluation'}
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5"
              aria-hidden
            />
          </button>
        ) : null}
      </div>

      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
          <div
            className="h-full rounded-full bg-brand-600 transition-[width] duration-500 ease-out dark:bg-brand-400"
            style={{ width: `${part}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
          <span className="tabular-nums">{part}&nbsp;% de la collecte</span>
          {prochainCode && !termine ? <span>Prochain critère sans réponse&nbsp;: {prochainCode}</span> : null}
        </div>
      </div>
    </section>
  );
}
