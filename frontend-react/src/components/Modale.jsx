import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Socle commun des surimpressions.
 *
 * Il portait ce que `ModaleVideo` avait mis au point et gardait pour elle
 * seule : montage par portail, fermeture à Échap et au clic sur le fond, focus
 * qui entre dans la boîte puis revient sur l'élément déclencheur, défilement de
 * la page bloqué pendant l'ouverture. Une seconde modale écrite à côté aurait
 * refait tout cela, moins bien ou autrement.
 *
 * Le portail n'est pas un détail : appelée depuis l'en-tête, qui porte un
 * `backdrop-blur`, une surimpression héritait de lui son bloc conteneur — un
 * filtre d'arrière-plan en crée un pour ses descendants `fixed` — et se
 * retrouvait haute de 84 px au lieu de couvrir la fenêtre.
 *
 * Le focus est retenu dans la boîte tant qu'elle est ouverte : une tabulation
 * qui en sort laisse l'utilisateur naviguer dans une page qu'il ne voit plus.
 *
 * `taille` borne la largeur ; `surFond` permet d'empêcher la fermeture au clic
 * sur le fond, pour une boîte qui attend une décision plutôt qu'une lecture.
 */
const TAILLES = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export default function Modale({
  titre,
  surFermeture,
  taille = 'md',
  fermetureAuFond = true,
  className,
  children,
}) {
  const boite = useRef(null);

  useEffect(() => {
    const elementActif = document.activeElement;

    // Le premier élément focalisable de la boîte, ou la boîte elle-même.
    const focalisables = () =>
      [
        ...(boite.current?.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []),
      ].filter((e) => e.offsetParent !== null);

    const premiers = focalisables();
    (premiers[0] ?? boite.current)?.focus?.();

    const surTouche = (evenement) => {
      if (evenement.key === 'Escape') {
        surFermeture();
        return;
      }
      if (evenement.key !== 'Tab') return;
      // Piège à focus : la tabulation boucle dans la boîte.
      const liste = focalisables();
      if (liste.length === 0) return;
      const premier = liste[0];
      const dernier = liste[liste.length - 1];
      if (evenement.shiftKey && document.activeElement === premier) {
        evenement.preventDefault();
        dernier.focus();
      } else if (!evenement.shiftKey && document.activeElement === dernier) {
        evenement.preventDefault();
        premier.focus();
      }
    };
    document.addEventListener('keydown', surTouche);

    const debordementInitial = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', surTouche);
      document.body.style.overflow = debordementInitial;
      elementActif?.focus?.();
    };
  }, [surFermeture]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0f16]/80 p-4 backdrop-blur-sm motion-safe:animate-apparition-douce"
      onClick={fermetureAuFond ? surFermeture : undefined}
    >
      <div
        ref={boite}
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        tabIndex={-1}
        // Le clic dans la boîte ne doit pas la refermer.
        onClick={(evenement) => evenement.stopPropagation()}
        className={className ?? `w-full ${TAILLES[taille]} rounded-2xl bg-surface shadow-soft outline-none`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
