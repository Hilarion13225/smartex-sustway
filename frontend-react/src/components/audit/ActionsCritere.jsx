import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react';

/**
 * Pied de la carte de critère. « Enregistrer et continuer » est le seul bouton
 * plein : c'est l'action attendue, les deux autres restent secondaires.
 */
export default function ActionsCritere({ surPrecedent, surBrouillon, surContinuer, brouillonEnregistre, premier }) {
  return (
    <div className="flex flex-col gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={surPrecedent}
        disabled={premier}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink-200 bg-surface px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink-200 disabled:hover:text-ink-700 dark:hover:text-brand-400"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Critère précédent
      </button>

      <button
        type="button"
        onClick={surBrouillon}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink-200 bg-surface px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700 dark:hover:text-brand-400"
      >
        {brouillonEnregistre ? (
          <>
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            Brouillon enregistré
          </>
        ) : (
          <>
            <Save className="h-4 w-4" aria-hidden />
            Enregistrer le brouillon
          </>
        )}
      </button>

      <button
        type="button"
        onClick={surContinuer}
        className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition duration-300 hover:bg-brand-700"
      >
        Enregistrer et continuer
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
      </button>
    </div>
  );
}
