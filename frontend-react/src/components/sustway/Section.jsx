import clsx from 'clsx';
import { useApparition } from './useApparition';

/*
 * Enveloppe commune des sections de la vitrine.
 *
 * Elle porte trois choses que chaque section aurait sinon redéfinies pour son
 * compte : le fond, la largeur de lecture, et l'apparition au défilement.
 * Sur la version précédente du site, ces valeurs divergeaient d'une page à
 * l'autre — un même titre n'était pas à la même hauteur selon la page.
 *
 * Le padding horizontal ne descend jamais sous 20 px : c'est la gouttière qui
 * empêche le texte de toucher le bord sur un écran de 360 px.
 */
const FONDS = {
  blanc: 'bg-surface',
  mist: 'bg-ink-50',
  sable: 'bg-sable',
  forest: 'bg-forest text-white',
};

/*
 * `pleineHauteur` : la section occupe une fenetre entiere, son contenu centre.
 *
 * Les 88 px retires sont le `scroll-padding-top: 5.5rem` pose sur `html` dans
 * `index.css` — la reserve qui empeche la barre fixe de recouvrir une cible
 * d'ancre ou un element qui recoit le focus (WCAG 2.2, Focus Not Obscured).
 * C'est donc lui, et non la hauteur de barre de 72 px, qui decide ou une
 * ancre depose le haut de la section ; la hauteur doit se caler dessus.
 *
 * `scroll-mt-0` en consequence : la marge d'ancre de la section s'ajouterait
 * a ce padding de racine. Avec les 96 px par defaut, une ancre deposait la
 * section a 184 px du haut et sa fin passait 96 px sous la fenetre — mesure
 * au navigateur avant correction.
 *
 * `min-height` et non `height` : sur une fenetre trop basse pour le contenu,
 * le calcul donne moins que lui et reste sans effet — la section reprend sa
 * hauteur naturelle au lieu d'ecraser ce qu'elle contient.
 *
 * A partir de 1024 px seulement : en dessous, les colonnes s'empilent et
 * aucune de ces sections ne tient dans la hauteur d'un telephone.
 *
 * Meme motif que `SectionConfiance`, qui s'etire deja sur la fenetre moins la
 * hauteur du pied.
 */
export function Section({ id, fond = 'blanc', pleineHauteur = false, className, contenuClassName, children }) {
  return (
    <section
      id={id}
      className={clsx(
        pleineHauteur
          ? 'scroll-mt-0 lg:flex lg:min-h-[calc(100svh-88px)] lg:flex-col lg:justify-center'
          : 'scroll-mt-24',
        FONDS[fond],
        className
      )}
    >
      <div className={clsx('mx-auto w-full max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28', contenuClassName)}>
        {children}
      </div>
    </section>
  );
}

/*
 * En-tête de section : sur-titre, titre, sous-titre.
 *
 * `max-w-3xl` sur le sous-titre : au-delà d'environ 75 caractères par ligne,
 * l'œil perd le début de la ligne suivante. La largeur du bloc de titre est
 * donc plus étroite que celle de la section qui le contient.
 */
/*
 * `titreClassName` sert aux sections qui doivent tenir dans une hauteur
 * donnée : elle permet d'y réduire le corps du titre sans toucher à celui des
 * autres pages, qui partagent ce composant.
 */
export function TitreSection({
  surTitre,
  titre,
  sousTitre,
  centre = false,
  sombre = false,
  className,
  titreClassName,
}) {
  return (
    <div className={clsx(centre && 'mx-auto text-center', 'max-w-3xl', className)}>
      {surTitre ? (
        <p
          className={clsx(
            'mb-4 text-[13px] font-semibold uppercase tracking-[0.14em]',
            sombre ? 'text-growth' : 'text-brand-600'
          )}
        >
          {surTitre}
        </p>
      ) : null}
      <h2
        className={clsx(
          'text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] sm:text-[40px]',
          sombre ? 'text-white' : 'text-forest',
          titreClassName
        )}
      >
        {titre}
      </h2>
      {sousTitre ? (
        <p className={clsx('mt-5 text-[17px] leading-relaxed sm:text-lg', sombre ? 'text-white/75' : 'text-ink-600')}>
          {sousTitre}
        </p>
      ) : null}
    </div>
  );
}

/*
 * Bloc qui apparaît en montant légèrement quand il entre dans la fenêtre.
 *
 * Le décalage se fait en `translate-y-4` (16 px) et non davantage : au-delà,
 * le mouvement se remarque plus que le contenu qu'il amène. `delai` permet de
 * décaler les éléments d'une grille les uns après les autres — appliqué en
 * style en ligne plutôt qu'en classe, le nombre de valeurs possibles étant
 * ouvert et Tailwind ne générant que celles qu'il lit dans le source.
 */
export function Apparition({ delai = 0, className, children }) {
  const { reference, visible } = useApparition();
  return (
    <div
      ref={reference}
      style={visible && delai ? { transitionDelay: `${delai}ms` } : undefined}
      className={clsx(
        // `min-w-0` : ce bloc est le plus souvent l'enfant direct d'une grille,
        // où la largeur minimale vaut `auto` par défaut. Une colonne refusait
        // alors de descendre sous la largeur intrinsèque de son contenu — et
        // sur téléphone, les cartes de fonctionnalités poussaient la page à
        // 408 px de large, mesuré au navigateur à 390 px de fenêtre.
        'min-w-0 transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100',
        className
      )}
    >
      {children}
    </div>
  );
}
