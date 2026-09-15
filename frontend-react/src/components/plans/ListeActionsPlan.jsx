import { Vide } from '../ui';
import CarteActionPlan from './CarteActionPlan';

/**
 * Les actions d'un plan, dans l'ordre porté par le serveur.
 *
 * Le tri n'est pas refait ici : `ordre` est décidé à la création côté API, et
 * le rejouer côté client ferait diverger l'affichage de la source.
 */
export default function ListeActionsPlan({
  actions,
  axes,
  estAdministrateur,
  utilisateurId,
  planGele,
  onChangerStatut,
  onModifier,
  onReaffecter,
  onModifierAxes,
}) {
  if (!actions || actions.length === 0) {
    return (
      <Vide message="Aucune action dans ce plan. Ajoutez-en une pour pouvoir l’activer." />
    );
  }

  return (
    <ul className="space-y-3">
      {actions.map((action) => (
        <CarteActionPlan
          key={action.id}
          action={action}
          axes={axes}
          estAdministrateur={estAdministrateur}
          // Un collaborateur n'agit que sur ses propres actions : l'API le
          // refuse autrement (403), et proposer le contrôle serait promettre
          // ce qui sera refusé.
          peutAgir={estAdministrateur || action.responsableId === utilisateurId}
          planGele={planGele}
          onChangerStatut={onChangerStatut}
          onModifier={onModifier}
          onReaffecter={onReaffecter}
          onModifierAxes={onModifierAxes}
        />
      ))}
    </ul>
  );
}
