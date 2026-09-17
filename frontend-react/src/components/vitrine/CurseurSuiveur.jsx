import { useEffect, useRef } from 'react';

/**
 * Un anneau qui suit la souris sur toute la vitrine.
 *
 * Il rattrape le curseur avec un léger retard, ce qui donne au déplacement une
 * inertie, et s'élargit au-dessus de ce qui réagit au clic — liens, boutons,
 * onglets, champs. Le pointeur du système reste visible dessous : l'anneau
 * l'accompagne, il ne le remplace pas. Masquer le vrai curseur pour le
 * redessiner en HTML, c'est parier que le dessin suivra toujours la main ; au
 * premier ralentissement, le visiteur ne sait plus où il pointe.
 *
 * `mix-blend-mode: difference` lui évite d'avoir une couleur : il inverse ce
 * qu'il recouvre, et reste donc visible sur le héros sombre comme sur les
 * plages papier, sans qu'on ait à le prévenir de la page où il se trouve.
 *
 * Il ne s'affiche que là où il a un sens, et jamais au prix du confort :
 * — rien sans souris (`pointer: fine`), donc rien sur un écran tactile ;
 * — rien sous « réduire les animations » ;
 * — aucun rendu React pendant le mouvement : la position est écrite
 *   directement dans le style, dans une boucle d'animation, ce qui évite de
 *   reconstruire l'arbre à chaque pixel parcouru ;
 * — `pointer-events: none`, pour qu'il n'intercepte jamais un clic.
 */
const INTERACTIFS = 'a, button, [role="tab"], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';

export default function CurseurSuiveur() {
  const anneau = useRef(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)');
    const calme = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || calme.matches) return undefined;

    const noeud = anneau.current;
    if (!noeud) return undefined;

    let viseX = window.innerWidth / 2;
    let viseY = window.innerHeight / 2;
    let x = viseX;
    let y = viseY;
    let image = 0;
    let visible = false;

    const surMouvement = (evenement) => {
      viseX = evenement.clientX;
      viseY = evenement.clientY;
      if (!visible) {
        visible = true;
        x = viseX;
        y = viseY;
        noeud.style.opacity = '1';
      }
      // L'élargissement se décide ici plutôt qu'au survol de chaque élément :
      // un seul écouteur suffit, quel que soit ce que la page contient.
      const sousLeCurseur = document.elementFromPoint(viseX, viseY);
      const actif = sousLeCurseur ? sousLeCurseur.closest(INTERACTIFS) : null;
      noeud.dataset.actif = actif ? 'true' : 'false';
    };

    const surSortie = () => {
      visible = false;
      noeud.style.opacity = '0';
    };

    const boucle = () => {
      // Rattrapage progressif : l'anneau parcourt un cinquième de l'écart
      // restant à chaque image, ce qui produit le retard sans minuteur.
      x += (viseX - x) * 0.2;
      y += (viseY - y) * 0.2;
      noeud.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      image = requestAnimationFrame(boucle);
    };

    window.addEventListener('mousemove', surMouvement, { passive: true });
    document.addEventListener('mouseleave', surSortie);
    image = requestAnimationFrame(boucle);

    return () => {
      window.removeEventListener('mousemove', surMouvement);
      document.removeEventListener('mouseleave', surSortie);
      cancelAnimationFrame(image);
    };
  }, []);

  return (
    <div
      ref={anneau}
      data-actif="false"
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[60] hidden h-8 w-8 rounded-full border-2 border-white opacity-0 mix-blend-difference transition-[width,height,border-width,opacity] duration-200 will-change-transform data-[actif=true]:h-14 data-[actif=true]:w-14 data-[actif=true]:border motion-safe:[@media(pointer:fine)]:block"
    />
  );
}
