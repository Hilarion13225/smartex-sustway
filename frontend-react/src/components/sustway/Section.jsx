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

export function Section({ id, fond = 'blanc', className, contenuClassName, children }) {
  return (
    <section id={id} className={clsx('scroll-mt-24', FONDS[fond], className)}>
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
export function TitreSection({ surTitre, titre, sousTitre, centre = false, sombre = false, className }) {
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
          sombre ? 'text-white' : 'text-forest'
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
