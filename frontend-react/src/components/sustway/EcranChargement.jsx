import { useEffect, useRef, useState } from 'react';
import Logo from '../Logo';

/*
 * Écran de chargement de la page d'entrée.
 *
 * Un voile plein écran couleur Forest, le logotype en haut à gauche, une barre
 * de progression fine qui traverse la page, son pourcentage qui la suit, et la
 * signature de la charte au centre. Quand la page est prête, le voile se
 * retire vers le haut et découvre le héros.
 *
 * La progression n'est pas décorative : elle monte régulièrement jusqu'à 90 %
 * puis attend le chargement réel de la page — `document.readyState` et
 * l'événement `load` — avant de finir sa course. Un compteur qui atteindrait
 * 100 % avant que la page ne soit prête mentirait, et un compteur purement
 * factice ferait attendre pour rien quand tout est déjà là.
 *
 * Il ne paraît qu'une fois par session : revenir à l'accueil depuis une autre
 * page ne recharge rien, et rejouer l'attente à chaque retour ferait de
 * l'animation une taxe plutôt qu'une entrée en matière. Le marqueur est posé
 * à la fin de l'animation et non à son début — voir `terminer`.
 *
 * `sessionStorage` est toujours lu et écrit dans un `try` : il lève en
 * navigation privée sur certains navigateurs, et l'écran ne doit jamais
 * empêcher la page de s'afficher.
 *
 * Deux sécurités, parce qu'un voile bloquant est la pire chose à laisser sur
 * une page : un délai maximal au terme duquel il se retire quoi qu'il arrive,
 * et le retrait complet du composant du DOM une fois l'animation finie.
 *
 * `prefers-reduced-motion` supprime l'attente : le voile disparaît
 * immédiatement, sans course ni glissement. Quelqu'un qui a demandé moins de
 * mouvement n'a pas à regarder une barre traverser son écran.
 */

/** Durée maximale du voile, sécurité comprise. Au-delà, il se retire. */
const DELAI_MAXIMAL = 9000;

/**
 * Temps que met la barre à finir sa course une fois la page prête.
 *
 * La page est presque toujours prête avant que la barre n'arrive au bout :
 * sans cette attente, le voile passait en deux secondes et l'animation se
 * voyait à peine. Elle est ce qui fixe la durée réelle du voile.
 */
const DUREE_COURSE = 2600;

/** Temps pendant lequel 100 % reste lisible avant que le voile ne parte. */
const PALIER_FINAL = 650;

/** Durée du glissement vers le haut. Doit suivre la classe `duration-[1100ms]`. */
const DUREE_SORTIE = 1100;

export default function EcranChargement() {
  /*
   * `null` tant qu'on ne sait pas s'il faut afficher le voile : le premier
   * rendu ne doit pas le montrer avant d'avoir lu la session, sans quoi il
   * apparaîtrait puis disparaîtrait aussitôt à chaque retour à l'accueil.
   */
  const [actif, definirActif] = useState(null);
  const [progression, definirProgression] = useState(0);
  const [sortant, definirSortant] = useState(false);
  const minuteries = useRef([]);

  useEffect(() => {
    const dejaVu = (() => {
      try {
        return sessionStorage.getItem('sustway-chargement-vu') === '1';
      } catch {
        return false;
      }
    })();

    const mouvementReduit =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (dejaVu || mouvementReduit) {
      definirActif(false);
      return undefined;
    }

    definirActif(true);
    return undefined;
  }, []);

  useEffect(() => {
    if (actif !== true) return undefined;

    const ajouter = (id) => {
      minuteries.current.push(id);
      return id;
    };

    /*
     * La montée jusqu'à 90 %. Le pas décroît à mesure qu'on approche : une
     * progression linéaire donne l'impression d'un compteur, une progression
     * qui ralentit donne celle d'un travail en cours.
     *
     * Le diviseur est calé sur DUREE_COURSE : à 110 ms par pas, la barre doit
     * approcher 85 % au moment où la course se termine. Trop lent, elle sautait
     * de 55 à 100 % — mesuré au navigateur — et le saut se voyait.
     */
    const battement = setInterval(() => {
      definirProgression((p) => (p >= 90 ? p : p + Math.max(0.6, (90 - p) / 14)));
    }, 110);
    minuteries.current.push(battement);

    const terminer = () => {
      clearInterval(battement);
      definirProgression(100);
      /*
       * La session est marquee ici, et non a l'ouverture.
       *
       * En developpement, `StrictMode` monte chaque composant deux fois :
       * ecrit au montage, le marqueur faisait croire au second passage que
       * le voile avait deja ete vu, et il ne s'affichait jamais. Mesure au
       * navigateur : session marquee a « 1 », aucun voile dans le document.
       *
       * Le placer ici le rend aussi plus juste : « vu » veut dire que
       * l'animation est allee a son terme, pas qu'elle a commence.
       */
      try {
        sessionStorage.setItem('sustway-chargement-vu', '1');
      } catch {
        // Sans session, le voile reparaitra au prochain chargement : sans
        // gravite, et preferable a ne rien afficher du tout.
      }
      // Le voile ne part pas à l'instant où le compteur atteint 100 : on laisse
      // voir le nombre atteint, sinon la course paraît coupée.
      ajouter(setTimeout(() => definirSortant(true), PALIER_FINAL));
      ajouter(setTimeout(() => definirActif(false), PALIER_FINAL + DUREE_SORTIE));
    };

    /*
     * La page est presque toujours prête avant la fin de la course : on laisse
     * la barre aller au bout plutôt que de couper l'animation à l'instant où
     * le navigateur a fini. Quand elle ne l'est pas, `load` ne fait qu'avancer
     * la fin, jamais la retarder au-delà du délai maximal.
     */
    ajouter(setTimeout(terminer, DUREE_COURSE));
    if (document.readyState !== 'complete') {
      window.addEventListener('load', () => ajouter(setTimeout(terminer, 400)), { once: true });
    }

    // Sécurité : quoi qu'il arrive, le voile se retire.
    ajouter(setTimeout(terminer, DELAI_MAXIMAL));

    return () => {
      window.removeEventListener('load', terminer);
      clearInterval(battement);
      minuteries.current.forEach((id) => {
        clearTimeout(id);
        clearInterval(id);
      });
      minuteries.current = [];
    };
  }, [actif]);

  if (actif !== true) return null;

  const pourcent = Math.min(100, Math.round(progression));

  return (
    /*
     * `aria-hidden` et `inert` : le voile n'est pas un contenu à lire mais une
     * attente. Un lecteur d'écran doit trouver le héros, pas un compteur ; et
     * la tabulation ne doit pas se perdre derrière le voile.
     *
     * `z-[60]` passe au-dessus de la barre de navigation, qui est en `z-50`.
     */
    <div
      aria-hidden
      inert=""
      className={`fixed inset-0 z-[60] flex flex-col bg-forest transition-[opacity,transform] duration-[1100ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${
        sortant ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      }`}
    >
      {/* Le logotype, en haut à gauche comme sur la barre de navigation : le
          visiteur retrouve la marque au même endroit une fois le voile parti. */}
      <div className="px-5 pt-6 text-[26px] sm:px-8 sm:pt-8 sm:text-[30px]">
        <Logo taille="heritee" variante="clair" />
      </div>

      {/*
       * La barre et son pourcentage.
       *
       * Le nombre est posé à l'extrémité de la barre et se déplace avec elle,
       * plutôt que fixé dans un coin : c'est ce qui fait lire la barre comme
       * une course et non comme une décoration. `translate-x-[-100%]` le ramène
       * à gauche de ce point, pour qu'il ne sorte pas de l'écran à 100 %.
       */}
      <div className="mt-10 px-5 sm:mt-14 sm:px-8">
        <div className="relative h-[2px] w-full bg-white/12">
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-growth transition-[width] duration-300 ease-out"
            style={{ width: `${pourcent}%` }}
          />
          <span
            className="absolute top-2 -translate-x-full pr-1 text-[12px] font-semibold tabular-nums tracking-wide text-white/80 transition-[left] duration-300 ease-out"
            style={{ left: `${pourcent}%` }}
          >
            {pourcent}%
          </span>
        </div>
      </div>

      {/*
       * La signature de la charte, au centre.
       *
       * C'est le texte du pied de page, pas une phrase écrite pour l'occasion :
       * l'écran d'attente n'est pas un endroit où introduire un discours que le
       * site ne tient nulle part ailleurs.
       *
       * Elle s'efface à mesure que la barre avance — à 70 % elle a disparu, et
       * le regard est rendu à la barre qui finit sa course.
       */}
      <div className="flex flex-1 items-center justify-center px-5">
        <p
          className="text-center text-[13px] font-bold uppercase leading-relaxed tracking-[0.2em] text-growth transition-opacity duration-500 sm:text-[15px]"
          style={{ opacity: pourcent < 12 ? pourcent / 12 : Math.max(0, 1 - (pourcent - 12) / 58) }}
        >
          Structurer <span className="text-growth/40">•</span> Piloter{' '}
          <span className="text-growth/40">•</span> Optimiser <span className="text-growth/40">•</span> Mesurer
        </p>
      </div>
    </div>
  );
}
