import { useEffect, useRef, useState } from 'react';

/*
 * Apparition d'un bloc quand il entre dans la fenêtre.
 *
 * Un observateur par bloc plutôt qu'un écouteur de défilement global : le
 * navigateur fait le calcul hors du fil principal, et rien ne s'exécute tant
 * que le bloc reste hors champ. L'observation est coupée dès la première
 * apparition — une section déjà vue n'a plus rien à signaler, et la garder
 * observée ferait clignoter le contenu à chaque aller-retour de défilement.
 *
 * `prefers-reduced-motion` est traité à la source et non par une classe
 * `motion-safe:` : le bloc est alors déclaré visible immédiatement, sans même
 * créer l'observateur. Un visiteur qui a désactivé les animations ne doit pas
 * dépendre d'un observateur pour voir le contenu — si le script échoue, il
 * verrait une page vide.
 */
export function useApparition({ seuil = 0.15, marge = '0px 0px -10% 0px' } = {}) {
  const reference = useRef(null);
  const [visible, definirVisible] = useState(false);

  useEffect(() => {
    const element = reference.current;
    if (!element) return undefined;

    const sansAnimation =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Même garde-fou côté capacités : sans IntersectionObserver, le contenu
    // s'affiche plutôt que de rester invisible pour toujours.
    if (sansAnimation || typeof IntersectionObserver === 'undefined') {
      definirVisible(true);
      return undefined;
    }

    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (!entree.isIntersecting) return;
        definirVisible(true);
        observateur.disconnect();
      },
      { threshold: seuil, rootMargin: marge }
    );
    observateur.observe(element);
    return () => observateur.disconnect();
  }, [seuil, marge]);

  return { reference, visible };
}

/*
 * Compteur qui monte jusqu'à sa valeur une fois le bloc visible.
 *
 * L'interpolation suit une courbe « ease-out » : le chiffre défile vite puis
 * ralentit en approchant de sa valeur, ce qui laisse le temps de la lire. Le
 * dernier pas pose la valeur exacte plutôt que le résultat de l'interpolation,
 * qui arriverait à 71,98 au lieu de 72.
 */
export function useCompteur(valeur, { actif, duree = 1400 } = {}) {
  const [affiche, definirAffiche] = useState(0);

  useEffect(() => {
    if (!actif) return undefined;

    const sansAnimation =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (sansAnimation) {
      definirAffiche(valeur);
      return undefined;
    }

    let image = null;
    const debut = performance.now();
    const avancer = (maintenant) => {
      const progression = Math.min((maintenant - debut) / duree, 1);
      const adouci = 1 - (1 - progression) ** 3;
      definirAffiche(progression === 1 ? valeur : Math.round(valeur * adouci));
      if (progression < 1) image = requestAnimationFrame(avancer);
    };
    image = requestAnimationFrame(avancer);
    return () => {
      if (image !== null) cancelAnimationFrame(image);
    };
  }, [valeur, actif, duree]);

  return affiche;
}
