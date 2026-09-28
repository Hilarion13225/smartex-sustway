import { useRef } from 'react';
import { X } from 'lucide-react';
import Modale from './Modale';

/**
 * Lecteur vidéo en surimpression. Monté uniquement à l'ouverture : la vidéo
 * n'est donc téléchargée qu'au moment où l'on demande à la lire, et elle
 * s'arrête d'elle-même à la fermeture puisque l'élément est démonté.
 *
 * Tout ce qui fait une surimpression — portail, Échap, clic sur le fond, focus
 * retenu puis rendu au déclencheur, défilement bloqué — vient de `Modale`. Ce
 * composant avait mis ces règles au point et les gardait pour lui ; elles sont
 * désormais partagées avec la confirmation de suppression.
 */
export default function ModaleVideo({ source, titre = 'Vidéo de présentation', surFermeture }) {
  const boutonFermer = useRef(null);

  return (
    <Modale titre={titre} surFermeture={surFermeture} className="relative w-full max-w-5xl">
      <button
        ref={boutonFermer}
        type="button"
        onClick={surFermeture}
        className="absolute -top-12 right-0 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
      >
        <X className="h-5 w-5" aria-hidden />
        <span className="sr-only">Fermer la vidéo</span>
      </button>

      <video src={source} controls autoPlay playsInline className="w-full rounded-2xl bg-black shadow-soft">
        <track kind="captions" />
      </video>
    </Modale>
  );
}
