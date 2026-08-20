import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

/**
 * Révélation à l'entrée dans le viewport (IntersectionObserver, sans
 * dépendance d'animation externe). `delai` décale l'apparition pour créer
 * un effet de cascade sur une liste de cartes.
 */
export default function Revele({ children, delai = 0, className, as: Balise = 'div' }) {
  const reference = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = reference.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }

    const observateur = new IntersectionObserver(
      (entrees) => {
        entrees.forEach((entree) => {
          if (entree.isIntersecting) {
            setVisible(true);
            observateur.unobserve(entree.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );

    observateur.observe(element);
    return () => observateur.disconnect();
  }, []);

  return (
    <Balise
      ref={reference}
      className={clsx('revele', visible && 'revele-actif', className)}
      style={{ transitionDelay: `${delai}ms` }}
    >
      {children}
    </Balise>
  );
}
