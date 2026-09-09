/*
 * Éléments de langage visuel partagés par les pages de la vitrine.
 *
 * Regroupés ici parce qu'ils apparaissent sur plusieurs pages : les dupliquer
 * ferait diverger l'étiquette rouge ou la palette des pastilles d'une page à
 * l'autre au premier ajustement.
 */

/*
 * Pastilles d'icônes. Couleurs Tailwind fixes plutôt que la palette `ink` : un
 * fond pastel clair resterait quasiment blanc en thème sombre, d'où la variante
 * `dark:` sur chaque ton (même motif que les badges de ui.jsx).
 */
export const PASTELS = {
  rouge: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  bleu: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
  vert: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  orange: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
};

/** Soulignement tracé à main levée, repris de la maquette. */
export function TraitManuscrit({ className }) {
  return (
    <svg viewBox="0 0 120 10" className={className} aria-hidden>
      <path d="M3 7C24 2 80 1 117 5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Intitulé de section : petites capitales rouges encadrées de filets. */
export function Etiquette({ children, filetDroit = false }) {
  return (
    <p className="sur-titre text-brand-600 dark:text-brand-400">
      <span className="filet" aria-hidden />
      {children}
      {filetDroit ? <span className="filet" aria-hidden /> : null}
    </p>
  );
}
