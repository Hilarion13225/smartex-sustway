import { Link } from 'react-router-dom';
import { AlarmClock, Target } from 'lucide-react';
import { Badge, Barre, Card } from '../ui';
import { formaterDate } from '../../lib/export';
import { LIBELLE_STATUT_PLAN, TON_STATUT_PLAN } from '../../lib/plansAction';

/**
 * Un plan d'amélioration dans la liste transverse.
 *
 * La progression et le retard viennent du serveur (`progression`,
 * `enRetard`) : les recalculer ici créerait une seconde source de vérité qui
 * divergerait au premier écart d'arrondi ou de fuseau.
 */
export default function CartePlan({ plan, auditNom, entrepriseId, axes }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/app/${entrepriseId}/audits/${plan.auditId}/plans/${plan.id}`}
            className="text-sm font-medium text-ink-900 hover:text-brand-700"
          >
            {plan.titre}
          </Link>
          {auditNom ? (
            <p className="mt-0.5 truncate text-xs text-ink-500">{auditNom}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge ton={TON_STATUT_PLAN[plan.statut] ?? 'neutre'}>
            {LIBELLE_STATUT_PLAN[plan.statut] ?? plan.statut}
          </Badge>
          {plan.enRetard ? (
            <Badge ton="rouge" icone={AlarmClock}>
              En retard
            </Badge>
          ) : null}
        </div>
      </div>

      {plan.description ? (
        <p className="mt-2 line-clamp-2 text-sm text-ink-600">{plan.description}</p>
      ) : null}

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-ink-500">
          <span>Avancement</span>
          <span className="font-medium text-ink-700">{plan.progression} %</span>
        </div>
        <div className="mt-1">
          <Barre valeur={plan.progression} ton={plan.enRetard ? 'ambre' : 'brand'} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
        <span>
          {plan.actions?.length ?? 0} action{(plan.actions?.length ?? 0) > 1 ? 's' : ''}
        </span>
        {plan.dateEcheance ? (
          <span className={plan.enRetard ? 'font-medium text-rose-600' : undefined}>
            Échéance : {formaterDate(plan.dateEcheance)}
          </span>
        ) : null}
      </div>

      {/* Synthèse dédouble : un axe traité par trois actions du même plan
          n'apparaît qu'une fois ici. Le rattachement réel reste porté par
          l'action, où il est affiché nommément. */}
      {axes?.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-ink-400" aria-hidden />
          {axes.slice(0, 3).map((axe) => (
            <span
              key={axe.id}
              className="truncate rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600"
              title={axe.libelle}
            >
              {axe.libelle}
            </span>
          ))}
          {axes.length > 3 ? (
            <span className="text-xs text-ink-500">+{axes.length - 3}</span>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
