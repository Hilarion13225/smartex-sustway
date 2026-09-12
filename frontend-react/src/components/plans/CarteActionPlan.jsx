import { useState } from 'react';
import { AlarmClock, Target, UserRound } from 'lucide-react';
import { Badge } from '../ui';
import SustwayLoader from '../SustwayLoader';
import { formaterDate } from '../../lib/export';
import {
  LIBELLE_STATUT_ACTION,
  STATUTS_ACTION,
  STATUTS_EXECUTANT,
  TON_PRIORITE,
  TON_STATUT_ACTION,
} from '../../lib/plansAction';

/**
 * Une action d'un plan d'amélioration.
 *
 * Les axes traités sont affichés ici, et non au niveau du plan : c'est
 * l'action qui les vise réellement en base (`action_axe`). Le plan n'en
 * présente qu'une synthèse.
 *
 * Ce qui est proposé dépend de qui regarde. L'administration de la mission
 * dispose de tous les statuts ; l'exécutant s'arrête à « Terminée », parce
 * que l'API lui refuse « Validée » — constater qu'un travail est fait ne
 * revient pas à celui qui l'a fait.
 */
export default function CarteActionPlan({
  action,
  axes,
  estAdministrateur,
  peutAgir,
  planGele,
  onChangerStatut,
  onModifier,
  onReaffecter,
  onModifierAxes,
}) {
  const [enCours, setEnCours] = useState(false);

  const statutsProposes = estAdministrateur ? STATUTS_ACTION : STATUTS_EXECUTANT;
  const definitive = action.statut === 'VALIDEE';
  const modifiable = peutAgir && !planGele && !definitive;

  async function changer(statut) {
    setEnCours(true);
    try {
      await onChangerStatut(action, statut);
    } finally {
      setEnCours(false);
    }
  }

  const axesDeLAction = (axes ?? []).filter((a) => (action.axeIds ?? []).includes(a.id));

  return (
    <li className="rounded-xl border border-ink-100 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-900">{action.titre}</p>
          {action.description ? (
            <p className="mt-1 text-sm text-ink-600">{action.description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge ton={TON_STATUT_ACTION[action.statut] ?? 'neutre'}>
            {LIBELLE_STATUT_ACTION[action.statut] ?? action.statut}
          </Badge>
          <Badge ton={TON_PRIORITE[action.priorite] ?? 'neutre'}>{action.priorite}</Badge>
          {action.enRetard ? (
            <Badge ton="rouge" icone={AlarmClock}>
              En retard
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
        <span className="inline-flex items-center gap-1">
          <UserRound className="h-3.5 w-3.5" aria-hidden />
          {action.responsableNom ?? 'Non affectée'}
        </span>
        {action.dateEcheance ? (
          <span className={action.enRetard ? 'font-medium text-rose-600' : undefined}>
            Échéance : {formaterDate(action.dateEcheance)}
          </span>
        ) : null}
      </div>

      {axesDeLAction.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-start gap-1.5">
          <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden />
          {axesDeLAction.map((axe) => (
            <span
              key={axe.id}
              className="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600"
              title={axe.critereCode ? `Critère ${axe.critereCode}` : undefined}
            >
              {axe.libelle}
            </span>
          ))}
        </div>
      ) : null}

      {modifiable ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`statut-${action.id}`}>
            Statut de l’action {action.titre}
          </label>
          <select
            id={`statut-${action.id}`}
            className="input w-auto py-1 text-xs"
            value={action.statut}
            disabled={enCours}
            onChange={(e) => changer(e.target.value)}
          >
            {statutsProposes.map((s) => (
              <option key={s} value={s}>
                {LIBELLE_STATUT_ACTION[s]}
              </option>
            ))}
          </select>
          {enCours ? <SustwayLoader taille="sm" /> : null}

          {estAdministrateur ? (
            <>
              <button type="button" className="btn-ghost text-xs" onClick={() => onModifier(action)}>
                Modifier
              </button>
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => onReaffecter(action)}
              >
                Réaffecter
              </button>
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => onModifierAxes(action)}
              >
                Axes traités
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {definitive ? (
        <p className="mt-2 text-xs italic text-ink-500">
          Action validée : elle ne peut plus être reprise.
        </p>
      ) : null}
    </li>
  );
}
