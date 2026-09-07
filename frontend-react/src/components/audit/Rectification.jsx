import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import clsx from 'clsx';
import { NIVEAUX_MATURITE } from './niveauxMaturite';

/** Intitulé d'un niveau de maturité, ou son rang si le niveau est hors échelle. */
function libelle(niveau) {
  return NIVEAUX_MATURITE.find((n) => n.niveau === niveau)?.titre ?? `Niveau ${niveau}`;
}

/**
 * Écart entre le niveau déclaré par l'entreprise et celui retenu par l'IA
 * après examen des preuves.
 *
 * L'agent reçoit la déclaration mais a pour consigne de ne pas la tenir pour
 * acquise : une affirmation favorable sans document à l'appui ne doit pas
 * relever mécaniquement la conformité. La rectification avait donc déjà lieu
 * — elle n'était simplement pas montrée, et le superviseur ne pouvait pas
 * voir sur quels critères l'entreprise s'était surestimée.
 */
export default function Rectification({ niveauDeclare, niveauRetenu, compact = false }) {
  if (niveauDeclare == null || niveauRetenu == null) return null;

  const ecart = niveauRetenu - niveauDeclare;
  const sens =
    ecart > 0
      ? { Icone: ArrowUp, ton: 'text-emerald-700 dark:text-emerald-300', fond: 'bg-emerald-50 dark:bg-emerald-500/10', mot: 'relevé' }
      : ecart < 0
        ? { Icone: ArrowDown, ton: 'text-brand-700 dark:text-brand-300', fond: 'bg-brand-50 dark:bg-brand-500/10', mot: 'abaissé' }
        : { Icone: ArrowRight, ton: 'text-ink-600', fond: 'bg-ink-50', mot: 'confirmé' };

  return (
    <div className={clsx('rounded-xl', sens.fond, compact ? 'p-3' : 'p-4')}>
      <p className={clsx('flex items-center gap-2 text-sm font-medium', sens.ton)}>
        <sens.Icone className="h-4 w-4 shrink-0" aria-hidden />
        Niveau {sens.mot} par l’IA
        {ecart !== 0 ? (
          <span className="tabular-nums">({ecart > 0 ? `+${ecart}` : ecart})</span>
        ) : null}
      </p>

      <div className="mt-2.5 flex items-center gap-3 text-sm">
        <span className="min-w-0">
          <span className="block text-xs text-ink-500">Déclaré</span>
          <span className="block truncate font-medium text-ink-800">
            {niveauDeclare} — {libelle(niveauDeclare)}
          </span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
        <span className="min-w-0">
          <span className="block text-xs text-ink-500">Retenu après preuves</span>
          <span className="block truncate font-semibold text-ink-900">
            {niveauRetenu} — {libelle(niveauRetenu)}
          </span>
        </span>
      </div>
    </div>
  );
}
