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
      <span className={clsx('relative ml-[-0.12em] mr-[0.62em]', clair ? 'text-brand-300' : 'text-brand-600')}>
        SustWay
        {/*
         * Emblème : une trajectoire montante refermée par un point.
         *
         * La feuille qui occupait cette place disait « environnement » et rien
         * d'autre ; ce que le produit mesure, c'est une progression. Le signe
         * reprend donc le langage graphique de la plateforme — la courbe que
         * l'on retrouve dans chaque tableau de bord — plutôt qu'un symbole
         * végétal qui rangerait l'outil du côté du discours militant.
         *
         * Dimensionné en `em` : le signe suit la taille du logotype, du
         * logotype de 11 px du rail de navigation au titre de 60 px.
         */}
        <svg
          viewBox="0 0 24 24"
          className="absolute -right-[0.72em] -top-[0.2em] h-[0.6em] w-[0.6em]"
          fill="none"
          aria-hidden
        >
          <path
            d="M2 19 C 7 19, 9 11, 14 8 S 20 5, 22 4"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          {/* Monochrome, en `currentColor` : le logotype est posé aussi bien
              dans la vitrine que dans l'espace connecté, dont les palettes
              diffèrent. Une seconde teinte devrait exister dans les deux. */}
          <circle cx="21" cy="4" r="3" fill="currentColor" />
        </svg>
      </span>
    </span>
  );
}
