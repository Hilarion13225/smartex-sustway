import { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { REFERENCES_METHODOLOGIQUES } from '../../config/smartex';

/**
 * Les standards sur lesquels la méthodologie s'appuie, en bandeau défilant.
 *
 * La page est longue et entièrement textuelle, et les référentiels n'y
 * apparaissaient qu'en bas, dans une grille que l'on atteint après quatre
 * sections. Les nommer d'emblée dit sur quoi la démarche repose avant même
 * qu'on l'explique.
 *
 * Les noms viennent de `REFERENCES_METHODOLOGIQUES` : rien n'est écrit ici, et
 * ajouter un standard à la configuration l'ajoute au bandeau.
 *
 * Le défilement est un mouvement continu, donc il s'arrête de trois façons :
 * au survol, au focus clavier, et par le bouton. La liste est écrite deux
 * fois pour que la boucle soit invisible ; la copie est masquée aux
 * technologies d'assistance, qui ne lisent donc chaque nom qu'une fois.
 */
const NOMS = REFERENCES_METHODOLOGIQUES.map((reference) => reference.nom);

function Suite({ copie = false }) {
  return (
    <ul className="flex shrink-0 items-center" aria-hidden={copie || undefined}>
      {NOMS.map((nom) => (
        <li key={nom} className="flex items-center whitespace-nowrap">
          <span className="px-7 text-[15px] font-semibold tracking-wide text-white sm:px-9">{nom}</span>
          <span className="h-1.5 w-1.5 rotate-45 bg-white/45" aria-hidden />
        </li>
      ))}
    </ul>
  );
}

export default function BandeauReferentiels() {
  const [enPause, definirEnPause] = useState(false);

  return (
    <div className="bandeau-arret relative flex items-center overflow-hidden bg-brand-700 py-3.5">
      <div className="bandeau-defile flex min-w-max" data-pause={enPause ? 'true' : 'false'}>
        <Suite />
        <Suite copie />
      </div>

      {/* Posé sur le bandeau plutôt qu'à côté : la commande doit être là où le
          mouvement se produit, et le dégradé la détache sans masquer un nom. */}
      <div className="absolute inset-y-0 right-0 flex items-center bg-gradient-to-l from-brand-700 via-brand-700 to-transparent pl-10 pr-3">
        <button
          type="button"
          onClick={() => definirEnPause((avant) => !avant)}
          aria-pressed={enPause}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/35 text-white transition-colors hover:bg-white/15"
        >
          {enPause ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
          <span className="sr-only">
            {enPause ? 'Reprendre le défilement des référentiels' : 'Arrêter le défilement des référentiels'}
          </span>
        </button>
      </div>
    </div>
  );
}
