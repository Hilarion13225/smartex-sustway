import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { REFERENCES_METHODOLOGIQUES } from '../../config/smartex';

/**
 * Les standards sur lesquels la méthodologie s'appuie, en bandeau défilant fixé
 * au bas de la fenêtre.
 *
 * Il était posé dans le flux, juste sous le héros ; il est devenu une barre
 * fixe à votre demande — la contrepartie en bas de ce que la barre de
 * navigation fait en haut. Il reste donc visible pendant toute la lecture,
 * alors que dans le flux il disparaissait au premier défilement.
 *
 * Ce que cela coûte, et qu'il faut savoir : la barre occupe en permanence une
 * cinquantaine de pixels de hauteur d'écran, ce qui pèse sur un portable posé
 * à l'horizontale, et un mouvement continu demeure dans le champ de vision du
 * lecteur. Le bouton de pause est donc ici moins un confort qu'une nécessité.
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
  const cadre = useRef(null);

  // Une barre fixe recouvre le bas de la page — ici la fin du pied de page, qui
  // ne fait pas partie de ce composant. On rend donc au document la hauteur
  // qu'on lui prend, plutôt que de laisser une bande de contenu inatteignable.
  // La mesure est reprise au redimensionnement : sur écran étroit, les noms se
  // réorganisent et le bandeau change de hauteur.
  //
  // Le retrait se pose sur le conteneur du pied de page, et non sur `body` ni
  // sur `#root`. Les deux ont été essayés et mesurés : `body` porte le
  // défilement, et le `padding-bottom` d'un conteneur défilant n'est pas honoré
  // en fin de course ; `#root` fait la hauteur de la fenêtre et laisse son
  // enfant déborder, si bien que son retrait tombe au-dessus du contenu réel.
  // Le parent du pied de page, lui, s'étend sur toute la hauteur du document :
  // c'est le seul endroit où le retrait pousse quelque chose.
  useEffect(() => {
    const element = cadre.current;
    if (!element) return undefined;

    const pied = document.querySelector('footer');
    const porteur = pied?.parentElement || document.getElementById('root')?.firstElementChild || document.body;
    const avant = porteur.style.paddingBottom;
    const ajuster = () => {
      porteur.style.paddingBottom = `${element.offsetHeight}px`;
    };
    ajuster();

    const observateur = typeof ResizeObserver === 'function' ? new ResizeObserver(ajuster) : null;
    if (observateur) observateur.observe(element);
    else window.addEventListener('resize', ajuster);

    return () => {
      porteur.style.paddingBottom = avant;
      if (observateur) observateur.disconnect();
      else window.removeEventListener('resize', ajuster);
    };
  }, []);

  return (
    <div
      ref={cadre}
      className="bandeau-arret fixed inset-x-0 bottom-0 z-30 flex items-center overflow-hidden bg-vert-profond py-3.5"
    >
      <div className="bandeau-defile flex min-w-max" data-pause={enPause ? 'true' : 'false'}>
        <Suite />
        <Suite copie />
      </div>

      {/* Posé sur le bandeau plutôt qu'à côté : la commande doit être là où le
          mouvement se produit, et le dégradé la détache sans masquer un nom. */}
      <div className="absolute inset-y-0 right-0 flex items-center bg-gradient-to-l from-vert-profond via-vert-profond to-transparent pl-10 pr-3">
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
