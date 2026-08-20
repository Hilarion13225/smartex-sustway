import clsx from 'clsx';

/**
 * Loader personnalisé (CDC §9 : "loader personnalisé pendant les
 * traitements longs" — exigence explicite, pas un simple spinner générique).
 *
 * Signature visuelle reprise du logo Smartex Sustway : une orbite
 * incomplète (façon comète) tourne autour d'une pousse qui respire
 * doucement au centre — la donnée qui circule autour d'une croissance
 * durable, plutôt qu'un cercle générique qui tourne sur lui-même.
 *
 * `taille="sm"` remplace le spinner Lucide générique utilisé jusqu'ici
 * dans les boutons en cours de traitement ; `taille="lg"` est le loader de
 * page/section (voir `Loader` dans ui.jsx, qui l'enveloppe avec un message).
 *
 * Respecte prefers-reduced-motion (motion-safe: — aucune animation forcée).
 */
const TAILLES = {
  sm: { boite: 'h-4 w-4', trait: 4.5 },
  md: { boite: 'h-8 w-8', trait: 3.5 },
  lg: { boite: 'h-14 w-14', trait: 2.5 },
};

export default function SustwayLoader({ taille = 'md', className }) {
  const t = TAILLES[taille] ?? TAILLES.md;

  return (
    <svg
      viewBox="0 0 48 48"
      className={clsx(t.boite, className)}
      role="status"
      aria-label="Chargement en cours"
    >
      {/* Orbite — anneau incomplet façon comète, motif repris du logo */}
      <circle
        cx="24"
        cy="24"
        r="19"
        fill="none"
        stroke="currentColor"
        strokeWidth={t.trait}
        strokeLinecap="round"
        strokeDasharray="78 41"
        className="text-brand-500 motion-safe:animate-spin motion-reduce:opacity-50"
        style={{ transformOrigin: '24px 24px' }}
      />
      {/* Pousse au centre — respiration douce, indépendante de l'orbite */}
      <path
        d="M24 16.5c3.6 0 6.4 2.9 6.4 6.6 0 3.9-2.9 6.8-6.4 8.9-3.5-2.1-6.4-5-6.4-8.9 0-3.7 2.8-6.6 6.4-6.6Z"
        fill="currentColor"
        className="text-brand-700 motion-safe:animate-pulse"
      />
    </svg>
  );
}
