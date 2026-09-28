import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import Modale from './Modale';

/**
 * Confirmation d'une action qu'on ne peut pas défaire.
 *
 * Elle remplace `window.confirm`, qui posait trois problèmes sur une
 * suppression : la boîte du navigateur ignore la charte et ne se met pas en
 * forme — impossible de distinguer le nom du fichier du reste de la phrase ;
 * elle gèle le fil d'exécution de la page ; et son bouton de confirmation ne
 * dit jamais ce qu'il fait, c'est « OK » quelle que soit l'action.
 *
 * Ici le bouton porte le geste — « Supprimer la preuve » — et il est le seul
 * en rouge. Le geste d'annulation garde le focus à l'ouverture : sur une action
 * irréversible, une validation par mégarde ne doit pas être à une touche
 * d'écart.
 *
 * Le clic sur le fond ne referme pas : une boîte qui attend une décision ne
 * disparaît pas parce qu'on a cliqué à côté. Échap reste possible, c'est le
 * geste d'annulation, et il est sans conséquence.
 *
 * `surConfirmer` peut rendre une promesse : la boîte reste ouverte et son
 * bouton devient inerte tant qu'elle n'a pas rendu, pour qu'un double clic
 * n'envoie pas deux suppressions.
 */
export default function ModaleConfirmation({
  titre,
  message,
  detail,
  libelleConfirmer = 'Confirmer',
  libelleAnnuler = 'Annuler',
  surConfirmer,
  surAnnuler,
}) {
  const [enCours, definirEnCours] = useState(false);

  async function confirmer() {
    if (enCours) return;
    definirEnCours(true);
    try {
      await surConfirmer();
    } finally {
      definirEnCours(false);
    }
  }

  return (
    <Modale titre={titre} surFermeture={surAnnuler} taille="sm" fermetureAuFond={false}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
            <TriangleAlert className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink-900">{titre}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">{message}</p>
            {detail ? <p className="mt-2 text-xs leading-relaxed text-ink-500">{detail}</p> : null}
          </div>
        </div>

        {/* L'annulation d'abord dans l'ordre de tabulation, et elle porte le
            focus : sur une action qu'on ne defait pas, le geste sans
            consequence doit etre le plus facile a atteindre. */}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={surAnnuler}
            disabled={enCours}
            className="inline-flex items-center justify-center rounded-xl border border-ink-200 bg-surface px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-50 dark:hover:text-brand-400"
          >
            {libelleAnnuler}
          </button>
          <button
            type="button"
            onClick={confirmer}
            disabled={enCours}
            className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
          >
            {enCours ? 'Suppression…' : libelleConfirmer}
          </button>
        </div>
      </div>
    </Modale>
  );
}
