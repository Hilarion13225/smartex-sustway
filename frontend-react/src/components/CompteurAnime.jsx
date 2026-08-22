import { useEffect, useRef, useState } from 'react';

const REDUIT = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Compteur qui s'incrémente jusqu'à `valeur` lorsque l'élément devient
 * visible. Respecte prefers-reduced-motion : la valeur finale est affichée
 * immédiatement.
 */
export default function CompteurAnime({ valeur, duree = 1400, suffixe = '', className }) {
  const reference = useRef(null);
  const [affiche, setAffiche] = useState(0);

  useEffect(() => {
    const element = reference.current;
    const cible = Number(valeur) || 0;

    if (REDUIT() || !element || typeof IntersectionObserver === 'undefined') {
      setAffiche(cible);
      return undefined;
    }

    let image = 0;
    const observateur = new IntersectionObserver(
      (entrees) => {
        if (!entrees.some((entree) => entree.isIntersecting)) return;
        observateur.disconnect();

        const debut = performance.now();
        const avancer = (maintenant) => {
          const progression = Math.min(1, (maintenant - debut) / duree);
          const adouci = 1 - (1 - progression) ** 3;
          setAffiche(Math.round(cible * adouci));
          if (progression < 1) image = requestAnimationFrame(avancer);
        };
        image = requestAnimationFrame(avancer);
      },
      { threshold: 0 }
    );

    observateur.observe(element);
    return () => {
      observateur.disconnect();
      if (image) cancelAnimationFrame(image);
    };
  }, [valeur, duree]);

  return (
    <span ref={reference} className={className}>
      {affiche}
      {suffixe}
    </span>
  );
}
