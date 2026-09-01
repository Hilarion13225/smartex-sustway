import { Leaf } from 'lucide-react';
import clsx from 'clsx';

const TAILLES = {
  sm: 'text-2xl',
  md: 'text-3xl',
  lg: 'text-3xl sm:text-5xl lg:text-6xl',
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
      <span className={clair ? 'text-white' : 'text-ink-900'}>Smartex</span>
      <span className={clsx('relative ml-[0.1em] mr-[0.55em]', clair ? 'text-brand-300' : 'text-brand-600')}>
        Sustway
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
