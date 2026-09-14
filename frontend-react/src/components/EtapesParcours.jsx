import { useRef } from 'react';
import { Check } from 'lucide-react';
import clsx from 'clsx';

/**
 * Indicateur d'étapes d'un parcours linéaire (inscription).
 *
 * Adapté du composant « Wizard Steps » de 21st.dev, dont il reprend la
 * logique d'accessibilité plutôt que l'apparence :
 * - l'étape courante est annoncée aux lecteurs d'écran à chaque changement
 *   (« Étape 3 sur 5 : Vérification ») et marquée `aria-current="step"` ;
 * - les étapes où l'on peut revenir sont des boutons, parcourus aux flèches
 *   avec un seul arrêt de tabulation (tabindex mobile), les autres restent du
 *   texte ;
 * - un rail relie les étapes et se remplit à mesure qu'on avance.
 *
 * Écarts assumés avec l'original : pas de bibliothèque d'animation (le rail
 * se remplit par une transition CSS, coupée sous « réduire les animations »),
 * et pas de retour libre sur toute étape passée. Dans une inscription, revenir
 * à « Compte » après la création du compte en créerait un second : c'est la
 * page qui dit, par `estNavigable`, où un retour a un sens.
 */
export default function EtapesParcours({ etapes, indexCourant, estNavigable = () => false, surRetour, className = '' }) {
  const liste = useRef(null);
  const total = etapes.length;
  const [, libelleCourant] = etapes[indexCourant] ?? [];
  const position = `Étape ${indexCourant + 1} sur ${total} : ${libelleCourant}`;

  const navigables = etapes.map((_, index) => index < indexCourant && estNavigable(index));

  function auClavier(evenement, index) {
    const cibles = navigables.flatMap((ok, i) => (ok ? [i] : []));
    const rang = cibles.indexOf(index);
    let suivant = null;
    if (evenement.key === 'ArrowRight' || evenement.key === 'ArrowDown') suivant = cibles[rang + 1];
    else if (evenement.key === 'ArrowLeft' || evenement.key === 'ArrowUp') suivant = cibles[rang - 1];
    else if (evenement.key === 'Home') suivant = cibles[0];
    else if (evenement.key === 'End') suivant = cibles[cibles.length - 1];
    else return;
    evenement.preventDefault();
    if (suivant === undefined || suivant === null) return;
    liste.current?.querySelector(`[data-etape="${suivant}"]`)?.focus();
  }

  // Un seul bouton reçoit la tabulation : le plus proche de l'étape courante.
  const premierArret = navigables.lastIndexOf(true);

  return (
    <div className={className}>
      <p aria-live="polite" className="sr-only">
        {position}
      </p>
      <p aria-hidden className="mb-3 text-sm text-ink-500">
        <span className="tabular-nums">
          Étape {indexCourant + 1} sur {total}
        </span>
        <span className="mx-2">·</span>
        <span className="font-semibold text-ink-900">{libelleCourant}</span>
      </p>

      <ol ref={liste} aria-label="Étapes de l’inscription" className="flex items-center gap-1.5">
        {etapes.map(([cle, libelle], index) => {
          const passee = index < indexCourant;
          const courante = index === indexCourant;
          const intitule = `Étape ${index + 1} sur ${total} : ${libelle}${passee ? ' (terminée)' : ''}`;

          const pastille = (
            <span
              aria-hidden
              className={clsx(
                'grid h-8 w-8 place-items-center rounded-[8px] border text-sm font-semibold tabular-nums transition-colors duration-200 motion-reduce:transition-none',
                passee && 'border-ink-900 bg-ink-900 text-ink-50',
                courante && 'border-ink-900 bg-surface text-ink-900 ring-2 ring-ink-900/15',
                !passee && !courante && 'border-ink-200 bg-surface text-ink-500'
              )}
            >
              {passee ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
            </span>
          );

          return (
            <li key={cle} className="flex flex-1 items-center gap-1.5 last:flex-none" aria-current={courante ? 'step' : undefined}>
              {navigables[index] ? (
                <button
                  type="button"
                  data-etape={index}
                  tabIndex={index === premierArret ? 0 : -1}
                  aria-label={`${intitule}, revenir à cette étape`}
                  onKeyDown={(evenement) => auClavier(evenement, index)}
                  onClick={() => surRetour?.(cle)}
                  className="rounded-[8px]"
                >
                  {pastille}
                </button>
              ) : (
                <span>
                  <span className="sr-only">{intitule}</span>
                  {pastille}
                </span>
              )}

              {index < total - 1 ? (
                <span aria-hidden className="relative h-[3px] flex-1 overflow-hidden rounded-[2px] bg-ink-200">
                  <span
                    className={clsx(
                      'absolute inset-0 origin-left rounded-[2px] bg-ink-900 transition-transform duration-300 ease-out motion-reduce:transition-none',
                      passee ? 'scale-x-100' : 'scale-x-0'
                    )}
                  />
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
