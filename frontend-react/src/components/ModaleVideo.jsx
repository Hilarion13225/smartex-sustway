import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Lecteur vidéo en surimpression. Monté uniquement à l'ouverture : la vidéo
 * n'est donc téléchargée qu'au moment où l'on demande à la lire, et elle
 * s'arrête d'elle-même à la fermeture puisque l'élément est démonté.
 *
 * Fermeture à la touche Échap et au clic sur le fond. Le focus entre dans la
 * boîte à l'ouverture et revient sur l'élément déclencheur à la fermeture,
 * pour ne pas perdre la navigation au clavier.
 */
export default function ModaleVideo({ source, titre = 'Vidéo de présentation', surFermeture }) {
  const boutonFermer = useRef(null);

  useEffect(() => {
    const elementActif = document.activeElement;
    boutonFermer.current?.focus();

    const surTouche = (evenement) => {
      if (evenement.key === 'Escape') surFermeture();
    };
    document.addEventListener('keydown', surTouche);

    // Empêche la page de défiler derrière la surimpression.
    const debordementInitial = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', surTouche);
      document.body.style.overflow = debordementInitial;
      elementActif?.focus?.();
    };
  }, [surFermeture]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titre}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0f16]/80 p-4 backdrop-blur-sm motion-safe:animate-apparition-douce"
      onClick={surFermeture}
    >
      {/* Le clic sur la vidéo ne doit pas refermer la boîte. */}
      <div className="relative w-full max-w-5xl" onClick={(evenement) => evenement.stopPropagation()}>
        <button
          ref={boutonFermer}
          type="button"
          onClick={surFermeture}
          className="absolute -top-12 right-0 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
        >
          <X className="h-5 w-5" aria-hidden />
          <span className="sr-only">Fermer la vidéo</span>
        </button>

        <video
          src={source}
          controls
          autoPlay
          playsInline
          className="w-full rounded-2xl bg-black shadow-soft"
        >
          <track kind="captions" />
        </video>
      </div>
    </div>
  );
}
