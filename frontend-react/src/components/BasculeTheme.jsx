import { Laptop, Moon, Sun } from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '../theme/ThemeContext';

const OPTIONS = [
  { valeur: 'clair', icone: Sun, libelle: 'Clair' },
  { valeur: 'sombre', icone: Moon, libelle: 'Sombre' },
  { valeur: 'systeme', icone: Laptop, libelle: 'Système' },
];

/**
 * Bascule à 3 positions (clair/sombre/système) — voir theme/ThemeContext.jsx.
 * `variante="clair"` : styles pour un panneau toujours sombre (ex. Landing),
 * indépendant du thème choisi — même logique que `Logo`.
 */
export default function BasculeTheme({ className, variante = 'defaut' }) {
  const { preference, definirPreference, sombreForce } = useTheme();
  const surPanneauSombre = variante === 'clair';

  // Une page qui impose le sombre (page d'entrée) ignorerait les clics : mieux
  // vaut retirer la bascule que d'afficher un réglage sans effet.
  if (sombreForce) return null;

  return (
    <div
      role="radiogroup"
      aria-label="Thème de l’interface"
      className={clsx(
        'inline-flex items-center gap-0.5 rounded-full border p-0.5',
        surPanneauSombre ? 'border-white/15 bg-white/5' : 'border-ink-200 bg-ink-50',
        className
      )}
    >
      {OPTIONS.map(({ valeur, icone: Icone, libelle }) => (
        <button
          key={valeur}
          type="button"
          role="radio"
          aria-checked={preference === valeur}
          title={libelle}
          onClick={() => definirPreference(valeur)}
          className={clsx(
            'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
            preference === valeur
              ? 'bg-brand-600 text-white shadow-glow'
              : surPanneauSombre
                ? 'text-white/60 hover:bg-white/10 hover:text-white'
                : 'text-ink-500 hover:bg-ink-100 hover:text-ink-700'
          )}
        >
          <Icone className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">{libelle}</span>
        </button>
      ))}
    </div>
  );
}
