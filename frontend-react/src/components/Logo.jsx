import { Leaf } from 'lucide-react';
import clsx from 'clsx';

const TAILLES = {
  // Deux crans plus petit sur téléphone : à `text-2xl` le logotype occupe
  // 226 px, à `text-xl` 188 px, à `text-base` 151 px. Sur un écran de 360 px,
  // l'en-tête ne dispose que de 336 px utiles à partager entre le logo,
  // l'appel à l'action et le menu — au-delà de 151 px, l'intitulé « Créer un
  // compte » ne tient plus sur une seule ligne. Inchangé à partir de `sm`, le
  // rendu bureau ne bouge donc pas.
  sm: 'text-base min-[420px]:text-xl sm:text-2xl',
  md: 'text-3xl',
  lg: 'text-2xl sm:text-5xl lg:text-6xl',
  // Posé au fil d'une phrase, le logotype prend la taille de celle-ci : c'est
  // ce qui permet de l'employer dans un titre sans le figer à un corps qui ne
  // serait juste qu'à une largeur d'écran.
  heritee: 'text-[1em]',
};

/**
 * Logotype textuel de la marque — remplace l'ancien fichier PNG (fond blanc
 * opaque figé dans l'image, donc illisible une fois réduit dans la sidebar
 * ou posé sur un panneau sombre). Composé de vrai texte plutôt que d'une
 * image : nette à toute taille, sans poids réseau, et réagit nativement au
 * thème clair/sombre via les tokens `ink`/`brand` — sauf sur les panneaux
 * volontairement toujours sombres (voir `variante="clair"`), où le contraste
 * ne peut pas dépendre du thème actif.
 */
export default function Logo({ taille = 'md', variante = 'sombre', className }) {
  const clair = variante === 'clair';
  return (
    <span
      className={clsx(
        'inline-flex select-none items-center whitespace-nowrap font-display font-extrabold leading-none tracking-tight',
        TAILLES[taille],
        className
      )}
    >
      <span className={clair ? 'text-white' : 'text-ink-900'}>SMARTEX</span>{' '}
      {/*
       * Le bordeaux de la marque est écrit en clair, et non pris sur l'échelle
       * `brand`.
       *
       * Cette échelle vaut le bordeaux dans l'espace connecté mais le vert du
       * produit sous les enveloppes de la vitrine : le logotype aurait changé
       * de couleur d'une page à l'autre. Or c'est une marque — elle se
       * reconnaît à ce qu'elle ne bouge pas. #921F18 est la valeur qu'avait
       * `brand-600` à la racine, donc exactement la teinte déjà en place dans
       * l'application ; #E28D84 en est le cran clair, pour les panneaux
       * sombres où le bordeaux plein ne contrasterait plus (5,8:1 sur le vert
       * profond du pied de page, contre 1,6:1 pour le bordeaux plein).
       *
       * L'espace entre les deux mots est posé en marge et non par l'espace
       * typographique du JSX : le conteneur est en `inline-flex`, et la
       * disposition flexible supprime les blancs entre ses éléments — mesuré
       * au navigateur, les deux mots se touchaient encore à 0 px. La valeur
       * est en `em`, donc l'espace suit la taille du logotype, du logotype de
       * 11 px du rail de navigation au titre de 60 px.
       */}
      <span className={clsx('relative ml-[0.25em] mr-[0.55em]', clair ? 'text-[#E28D84]' : 'text-[#921F18]')}>
        SustWay
        <Leaf
          className={clsx(
            'absolute -right-[0.65em] -top-[0.15em] h-[0.55em] w-[0.55em] rotate-[18deg]',
            clair ? 'text-emerald-400' : 'text-emerald-500'
          )}
          strokeWidth={2.5}
          aria-hidden
        />
      </span>
    </span>
  );
}
