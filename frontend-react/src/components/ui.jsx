import clsx from 'clsx';
import { Info, Loader2 } from 'lucide-react';
export function Card({
  children,
  className
}) {
  return <section className={clsx('card', className)}>{children}</section>;
}
export function CardHeader({
  titre,
  icone: Icone,
  action,
  sousTitre
}) {
  return <header className="card-header">
      <div>
        <h2 className="card-title">
          {Icone ? <Icone className="h-4 w-4 text-brand-600" aria-hidden /> : null}
          {titre}
        </h2>
        {sousTitre ? <p className="mt-1 text-xs text-ink-500">{sousTitre}</p> : null}
      </div>
      {action}
    </header>;
}
export function PageTitre({
  titre,
  description,
  icone: Icone,
  actions
}) {
  return <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-brand-50 p-2.5 text-brand-600">
          <Icone className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-ink-900">{titre}</h1>
          {description ? <p className="mt-1 max-w-3xl text-sm text-ink-500">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>;
}
const TONS = {
  neutre: 'bg-ink-100 text-ink-700',
  vert: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  bleu: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  ambre: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  rouge: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  violet: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200'
};
export function Badge({
  children,
  ton = 'neutre',
  icone: Icone
}) {
  return <span className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', TONS[ton])}>
      {Icone ? <Icone className="h-3.5 w-3.5" aria-hidden /> : null}
      {children}
    </span>;
}
export function StatCard({
  libelle,
  valeur,
  detail,
  icone: Icone,
  ton = 'neutre'
}) {
  return <div className="card flex items-center gap-4 p-5">
      <span className={clsx('rounded-xl p-3', TONS[ton])}>
        <Icone className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{libelle}</p>
        <p className="mt-0.5 text-2xl font-semibold text-ink-900">{valeur}</p>
        {detail ? <p className="mt-0.5 truncate text-xs text-ink-500">{detail}</p> : null}
      </div>
    </div>;
}
export function Barre({
  valeur,
  ton = 'brand'
}) {
  const couleur = ton === 'rouge' ? 'bg-rose-500' : ton === 'ambre' ? 'bg-amber-500' : 'bg-brand-500';
  return <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
      <div className={clsx('h-full rounded-full transition-all', couleur)} style={{
      width: `${Math.min(100, Math.max(0, valeur))}%`
    }} />
    </div>;
}
export function Vide({
  message
}) {
  return <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <Info className="h-6 w-6 text-ink-300" aria-hidden />
      <p className="text-sm text-ink-500">{message}</p>
    </div>;
}

/** Loader personnalisé affiché pendant les traitements longs (section 9). */
export function Loader({
  message
}) {
  return <div className="flex items-center justify-center gap-3 px-6 py-12">
      <Loader2 className="h-5 w-5 animate-spin text-brand-600" aria-hidden />
      <p className="text-sm text-ink-600">{message}</p>
    </div>;
}
export function Alerte({
  children,
  ton = 'bleu'
}) {
  return <div className={clsx('flex items-start gap-2 rounded-lg px-4 py-3 text-sm', TONS[ton])}>
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>{children}</p>
    </div>;
}
export function Tableau({
  entetes,
  children
}) {
  return <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-ink-100">
        <thead className="bg-ink-50">
          <tr>
            {entetes.map(entete => <th key={entete} className="th" scope="col">
                {entete}
              </th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100 bg-white">{children}</tbody>
      </table>
    </div>;
}
