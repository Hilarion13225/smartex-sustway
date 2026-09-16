import { useEffect, useRef, useState } from 'react';

const DUREE = 1100;

/**
 * Repère chiffré qui monte de zéro à sa valeur quand la section entre dans le
 * viewport. La valeur finale est écrite dans le DOM dès le premier rendu si le
 * visiteur a demandé moins d'animations ou si l'observateur n'existe pas :
 * un compteur ne doit jamais rester bloqué sur zéro.
 */
export default function CompteurAnime({ valeur, className }) {
  const reference = useRef(null);
  const [affiche, setAffiche] = useState(0);

  useEffect(() => {
    const element = reference.current;
    const mouvementReduit =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!element || mouvementReduit || typeof IntersectionObserver === 'undefined') {
      setAffiche(valeur);
      return undefined;
    }

    let image;
    const observateur = new IntersectionObserver(
      (entrees) => {
        if (!entrees.some((entree) => entree.isIntersecting)) return;
        observateur.disconnect();

        const debut = performance.now();
        const avance = (instant) => {
          const part = Math.min(1, (instant - debut) / DUREE);
          // Sortie en douceur : la fin du décompte ralentit au lieu de s'arrêter net.
          setAffiche(Math.round(valeur * (1 - (1 - part) ** 3)));
          if (part < 1) image = requestAnimationFrame(avance);
        };
        image = requestAnimationFrame(avance);
      },
      { threshold: 0.4 }
    );

    observateur.observe(element);
    return () => {
      observateur.disconnect();
      if (image) cancelAnimationFrame(image);
    };
  }, [valeur]);

  return (
    <b ref={reference} className={className}>
      {affiche}
    </b>
  );
}
