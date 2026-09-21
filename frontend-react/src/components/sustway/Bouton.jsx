import { Link } from 'react-router-dom';
import clsx from 'clsx';

/*
 * Les trois niveaux d'action de la charte SMARTEX SustWay.
 *
 * Un seul composant plutôt que trois classes CSS : c'est ce qui garantit que
 * l'anneau de focus, la hauteur et la transition sont identiques partout. La
 * hauteur est posée en `min-h` plutôt qu'en `h` — un intitulé qui passe à la
 * ligne sur téléphone doit pouvoir grandir au lieu d'être rogné.
 *
 * L'anneau de focus est décalé du bouton (`ring-offset-2`) : posé dessus, il
 * se confondrait avec le fond vert du bouton principal et deviendrait
 * invisible au clavier.
 */
const NIVEAUX = {
  principal:
    'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 disabled:bg-ink-300 disabled:shadow-none',
  secondaire:
    'border border-brand-600 bg-transparent text-brand-700 hover:bg-brand-50 active:bg-brand-100 disabled:border-ink-200 disabled:text-ink-400',
  // Variantes posées sur le vert profond (CTA final, pied de page), où le
  // vert de marque n'aurait plus aucun contraste.
  'principal-sombre':
    'bg-white text-brand-800 shadow-sm hover:bg-brand-50 active:bg-brand-100',
  'secondaire-sombre':
    'border border-white/40 bg-transparent text-white hover:border-white hover:bg-white/10 active:bg-white/20',
  tertiaire:
    'gap-1.5 px-0 text-brand-700 hover:text-brand-800 hover:gap-2.5 active:text-brand-900 disabled:text-ink-400',
};

const TAILLES = {
  md: 'min-h-11 px-5 text-[15px]',
  lg: 'min-h-12 px-6 text-base',
};

/*
 * Deux formes, et non un rayon unique. `arrondi` est celui de la charte, 10 px.
 * `pilule` reprend celui de la page d'entrée, où les trois actions du héros
 * sont entièrement arrondies : les deux pages ouvrent le site l'une après
 * l'autre, leurs boutons ne peuvent pas avoir deux dessins.
 */
const FORMES = {
  arrondi: 'rounded-[10px]',
  pilule: 'rounded-full',
};

export default function Bouton({
  niveau = 'principal',
  taille = 'md',
  forme = 'arrondi',
  vers,
  href,
  className,
  children,
  ...reste
}) {
  const tertiaire = niveau === 'tertiaire';
  const classes = clsx(
    'inline-flex items-center justify-center gap-2 font-semibold tracking-tight',
    FORMES[forme],
    // 150 ms : assez pour que le survol se sente, trop court pour qu'on
    // l'attende. La charte demande des transitions « rapides et élégantes ».
    'transition-all duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
    'disabled:cursor-not-allowed',
    tertiaire ? 'min-h-0 text-[15px]' : TAILLES[taille],
    NIVEAUX[niveau],
    className
  );

  if (vers) {
    return (
      <Link to={vers} className={classes} {...reste}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={classes} {...reste}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={classes} {...reste}>
      {children}
    </button>
  );
}
