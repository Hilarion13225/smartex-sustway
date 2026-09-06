const RAYON = 52;
const CIRCONFERENCE = 2 * Math.PI * RAYON;

/**
 * Jauge circulaire de progression, tracée en SVG plutôt qu'en image : l'arc est
 * piloté par `stroke-dashoffset`, si bien qu'un changement de `valeur` anime la
 * jauge sans recalcul de géométrie.
 */
export default function JaugeCirculaire({ valeur, libelle, enCours = false }) {
  const borne = Math.max(0, Math.min(100, valeur ?? 0));
  const decalage = CIRCONFERENCE * (1 - borne / 100);

  return (
    <div className="relative mx-auto h-36 w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={RAYON}
          fill="none"
          strokeWidth="10"
          className="stroke-ink-100"
        />
        <circle
          cx="60"
          cy="60"
          r={RAYON}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCONFERENCE}
          strokeDashoffset={decalage}
          className="stroke-brand-600 transition-[stroke-dashoffset] duration-700 ease-out dark:stroke-brand-500"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {enCours ? (
          <span className="text-sm font-medium text-ink-400">Analyse…</span>
        ) : (
          <>
            <span className="text-3xl font-bold tabular-nums text-ink-900">{borne}%</span>
            {libelle ? <span className="mt-0.5 text-sm text-ink-500">{libelle}</span> : null}
          </>
        )}
      </div>
    </div>
  );
}
