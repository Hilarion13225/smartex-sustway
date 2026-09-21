import { useId } from 'react';
import clsx from 'clsx';
import { useApparition, useCompteur } from './useApparition';

/*
 * Les graphiques de la vitrine sont du SVG écrit à la main, pas une
 * bibliothèque.
 *
 * Ce sont des aperçus produit : quelques points, aucune interaction, aucun
 * recalcul. Une bibliothèque de graphiques apporterait ici son moteur
 * d'échelles, ses infobulles et son redimensionnement pour rien, et pèserait
 * plus lourd que toute la page. Le SVG, lui, se met à l'échelle seul via
 * `viewBox` et s'anime avec les mêmes classes que le reste.
 *
 * Tous les identifiants de dégradé passent par `useId` : deux graphiques sur
 * la même page partageraient sinon un `id` en dur, et le second verrait son
 * remplissage écrasé par celui du premier.
 */

/* --- Courbe de trajectoire ------------------------------------------------
 * Un seul message : la performance progresse. Pas d'axe vertical chiffré — la
 * valeur exacte de chaque année n'est pas le sujet, la pente l'est.
 */
export function Courbe({ points, legendes, className, hauteur = 150 }) {
  const identifiant = useId();
  const { reference, visible } = useApparition();
  const largeur = 420;
  const marge = 8;
  const min = Math.min(...points);
  const max = Math.max(...points);
  // Étendue plancher à 1 : une série plate ferait une division par zéro.
  const etendue = Math.max(max - min, 1);

  const coordonnees = points.map((valeur, index) => {
    const x = marge + (index * (largeur - marge * 2)) / (points.length - 1);
    // 0,15 et 0,85 de la hauteur : la courbe ne touche jamais les bords, où
    // un trait de 2,5 px serait rogné par le `viewBox`.
    const y = hauteur * 0.85 - ((valeur - min) / etendue) * hauteur * 0.7;
    return [x, y];
  });

  /*
   * Courbe lissée en Bézier cubique plutôt qu'une polyligne : une trajectoire
   * de performance dessinée à angles vifs se lit comme une série de ruptures.
   * Les points de contrôle sont posés à mi-distance horizontale, ce qui garde
   * la courbe passant exactement par chaque valeur.
   */
  const trace = coordonnees.reduce((chemin, [x, y], index) => {
    if (index === 0) return `M ${x} ${y}`;
    const [xPrecedent, yPrecedent] = coordonnees[index - 1];
    const milieu = (xPrecedent + x) / 2;
    return `${chemin} C ${milieu} ${yPrecedent}, ${milieu} ${y}, ${x} ${y}`;
  }, '');
  const dernier = coordonnees[coordonnees.length - 1];
  const aire = `${trace} L ${dernier[0]} ${hauteur} L ${coordonnees[0][0]} ${hauteur} Z`;

  return (
    // `min-w-0` sur le conteneur comme sur le tracé : un `<svg>` sans attribut
    // `width` est un élément remplacé, dont la taille intrinsèque par défaut
    // est de 300 × 150 px. `w-full` fixe bien sa largeur rendue, mais sa
    // largeur *minimale* reste 300 px — de quoi empêcher toute la carte qui le
    // contient de se réduire sur un écran étroit.
    <div ref={reference} className={clsx('min-w-0', className)}>
      <svg
        viewBox={`0 0 ${largeur} ${hauteur}`}
        className="w-full min-w-0"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Trajectoire de performance de ${legendes[0]} à ${legendes[legendes.length - 1]}, en progression`}
      >
        <defs>
          <linearGradient id={`aire-${identifiant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--brand-600))" stopOpacity="0.16" />
            <stop offset="100%" stopColor="rgb(var(--brand-600))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Trois lignes de repère : assez pour donner une échelle, pas assez
            pour transformer l'aperçu en papier millimétré. */}
        {[0.2, 0.5, 0.8].map((fraction) => (
          <line
            key={fraction}
            x1="0"
            x2={largeur}
            y1={hauteur * fraction}
            y2={hauteur * fraction}
            stroke="rgb(var(--ink-200))"
            strokeWidth="1"
          />
        ))}
        <path
          d={aire}
          fill={`url(#aire-${identifiant})`}
          className={clsx('transition-opacity duration-1000', visible ? 'opacity-100' : 'opacity-0')}
        />
        <path
          d={trace}
          fill="none"
          stroke="rgb(var(--brand-600))"
          strokeWidth="2.5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          // La longueur exacte du tracé importe peu : il suffit qu'elle
          // dépasse celle du chemin pour que celui-ci parte entièrement masqué.
          style={{ strokeDasharray: 1000, '--longueur': 1000 }}
          className={visible ? 'animate-trace-courbe' : 'opacity-0'}
        />
        {coordonnees.map(([x, y], index) => (
          <circle
            key={legendes[index]}
            cx={x}
            cy={y}
            r="3.5"
            fill="rgb(var(--surface))"
            stroke="rgb(var(--brand-600))"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
            style={{ animationDelay: `${600 + index * 160}ms` }}
            className={visible ? 'animate-apparition-tick' : 'opacity-0'}
          />
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-[11px] font-medium text-ink-500">
        {legendes.map((legende) => (
          <span key={legende}>{legende}</span>
        ))}
      </div>
    </div>
  );
}

/* --- Barre horizontale ----------------------------------------------------
 * Employée pour les trois dimensions ESG. La valeur est répétée en clair à
 * droite : une barre seule ne se lit qu'à l'estime.
 */
export function BarreHorizontale({ libelle, valeur, sur = 100, delai = 0, compacte = false }) {
  const { reference, visible } = useApparition();
  return (
    <div ref={reference}>
      {/* `gap-3` : sans écart minimal, un libellé qui occupe toute la largeur
          vient coller sa valeur — « Environnement78 » au lieu de
          « Environnement  78 ». */}
      <div className={clsx('flex items-baseline justify-between gap-3', compacte ? 'mb-1' : 'mb-1.5')}>
        <span className={clsx('font-medium text-ink-700', compacte ? 'text-[11px]' : 'text-xs')}>{libelle}</span>
        <span className={clsx('font-semibold tabular-nums text-forest', compacte ? 'text-[11px]' : 'text-xs')}>
          {valeur}
        </span>
      </div>
      <div
        className={clsx('w-full overflow-hidden rounded-full bg-ink-100', compacte ? 'h-1.5' : 'h-2')}
        role="img"
        aria-label={`${libelle} : ${valeur} sur ${sur}`}
      >
        <div
          className="h-full rounded-full bg-brand-600 transition-[width] duration-1000 ease-out motion-reduce:transition-none"
          style={{ width: visible ? `${(valeur / sur) * 100}%` : '0%', transitionDelay: `${delai}ms` }}
        />
      </div>
    </div>
  );
}

/* --- Anneau de progression ------------------------------------------------
 * Le score global. L'anneau part à midi (rotation de -90°) : un score qui
 * commencerait à trois heures se lit mal.
 */
export function Anneau({ valeur, sur = 100, taille = 132, libelle }) {
  const { reference, visible } = useApparition();
  const affiche = useCompteur(valeur, { actif: visible });
  const rayon = taille / 2 - 9;
  const circonference = 2 * Math.PI * rayon;

  return (
    <div
      ref={reference}
      className="relative inline-flex items-center justify-center"
      style={{ width: taille, height: taille }}
    >
      <svg
        width={taille}
        height={taille}
        className="-rotate-90"
        role="img"
        aria-label={`${libelle} : ${valeur} sur ${sur}`}
      >
        <circle cx={taille / 2} cy={taille / 2} r={rayon} fill="none" stroke="rgb(var(--ink-100))" strokeWidth="9" />
        <circle
          cx={taille / 2}
          cy={taille / 2}
          r={rayon}
          fill="none"
          stroke="rgb(var(--brand-600))"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circonference}
          strokeDashoffset={visible ? circonference * (1 - valeur / sur) : circonference}
          className="transition-[stroke-dashoffset] duration-[1400ms] ease-out motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span aria-hidden className="text-[28px] font-semibold leading-none tabular-nums text-forest">
          {affiche}
        </span>
        <span aria-hidden className="mt-1 text-[11px] font-medium text-ink-500">
          sur {sur}
        </span>
      </div>
    </div>
  );
}

/* --- Indicateur chiffré ---------------------------------------------------
 * Le chiffre monte jusqu'à sa valeur une fois visible. Le libellé accessible
 * porte la valeur finale : un lecteur d'écran ne doit pas entendre le
 * décompte, d'où le `aria-hidden` sur les chiffres qui défilent.
 */
export function Indicateur({ libelle, valeur, unite = '', tendance, className }) {
  const { reference, visible } = useApparition();
  const affiche = useCompteur(valeur, { actif: visible });

  return (
    <div
      ref={reference}
      className={clsx('rounded-xl border border-ink-200 bg-surface p-3.5', className)}
      role="group"
      aria-label={`${libelle} : ${valeur}${unite}${tendance ? `, ${tendance}` : ''}`}
    >
      <p aria-hidden className="text-[11px] font-medium uppercase tracking-wide text-ink-500">
        {libelle}
      </p>
      <p aria-hidden className="mt-1.5 flex items-baseline gap-1">
        <span className="text-[26px] font-semibold leading-none tabular-nums text-forest">{affiche}</span>
        {unite ? <span className="text-sm font-medium text-ink-500">{unite}</span> : null}
      </p>
      {tendance ? (
        <p aria-hidden className="mt-1 text-[11px] font-semibold text-brand-600">
          {tendance}
        </p>
      ) : null}
    </div>
  );
}
