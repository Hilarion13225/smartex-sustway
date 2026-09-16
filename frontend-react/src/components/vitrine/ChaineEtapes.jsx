import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Pause, Play } from 'lucide-react';
import clsx from 'clsx';

const INTERVALLE = 5000;

/**
 * Chaîne d'étapes qui met en avant un maillon après l'autre.
 *
 * Aucun texte n'est jamais masqué : les sept intitulés et leurs détails restent
 * lisibles en permanence, seul l'accent se déplace. Une étape « à venir » est
 * donc simplement moins appuyée, jamais absente — ce qui vaut pour un moteur de
 * recherche, une impression, et quiconque ne verra jamais l'animation.
 *
 * Le défilement automatique obéit aux règles qui l'encadrent : il s'arrête au
 * survol et au focus, il offre un bouton pause, et il ne démarre pas du tout
 * quand le visiteur a demandé moins d'animations.
 */
export default function ChaineEtapes({ etapes }) {
  const [actif, setActif] = useState(0);
  const [enPause, setEnPause] = useState(false);
  const [suspendu, setSuspendu] = useState(false);
  const [mouvementReduit, setMouvementReduit] = useState(false);
  const conteneur = useRef(null);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const lire = () => setMouvementReduit(mq.matches);
    lire();
    mq.addEventListener('change', lire);
    return () => mq.removeEventListener('change', lire);
  }, []);

  const tourne = !enPause && !suspendu && !mouvementReduit;

  useEffect(() => {
    if (!tourne) return undefined;
    const minuteur = setInterval(() => setActif((i) => (i + 1) % etapes.length), INTERVALLE);
    return () => clearInterval(minuteur);
  }, [tourne, etapes.length]);

  // Une etape choisie a la main reste affichee : reprendre aussitot donnerait
  // l'impression que le clic n'a pas ete pris en compte.
  const choisir = useCallback((index) => {
    setActif(index);
    setEnPause(true);
  }, []);

  const surFocus = () => setSuspendu(true);
  const surBlur = (evenement) => {
    if (!conteneur.current?.contains(evenement.relatedTarget)) setSuspendu(false);
  };

  return (
    <div
      ref={conteneur}
      className="mt-12"
      onMouseEnter={() => setSuspendu(true)}
      onMouseLeave={() => setSuspendu(false)}
      onFocus={surFocus}
      onBlur={surBlur}
    >
      <ol className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-7">
        {etapes.map((etape, index) => {
          const franchie = index < actif;
          const courante = index === actif;
          return (
            <li key={etape.libelle} className="relative min-w-0">
              {/* Le rail ne relie les maillons que la ou ils sont sur une meme
                  ligne ; sous `lg` la chaine se lit de haut en bas. */}
              {index < etapes.length - 1 ? (
                <span
                  aria-hidden
                  className={clsx(
                    'absolute left-[calc(50%+0.9rem)] right-[calc(-50%+0.9rem)] top-[0.7rem] hidden h-0.5 rounded-full transition-colors duration-500 lg:block',
                    franchie ? 'bg-feuille' : 'bg-ink-200'
                  )}
                />
              ) : null}

              <button
                type="button"
                onClick={() => choisir(index)}
                aria-current={courante ? 'step' : undefined}
                className="group relative flex w-full flex-col items-start text-left"
              >
                <span
                  className={clsx(
                    'relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold tabular-nums transition-all duration-500',
                    courante && 'scale-110 border-brand-600 bg-brand-600 text-white',
                    franchie && !courante && 'border-feuille bg-feuille text-white',
                    !courante && !franchie && 'border-ink-300 bg-surface text-ink-500'
                  )}
                >
                  {franchie && !courante ? <Check className="h-3.5 w-3.5" aria-hidden /> : index + 1}
                </span>

                <span
                  className={clsx(
                    'mt-3 block font-display text-lg font-bold leading-snug transition-colors duration-500',
                    courante ? 'text-brand-700' : 'text-ink-900'
                  )}
                >
                  {etape.libelle}
                </span>
                <span className="mt-1.5 block text-[15px] leading-snug text-ink-600">{etape.detail}</span>

                <span
                  aria-hidden
                  className={clsx(
                    'mt-3 block h-0.5 w-full origin-left rounded-full transition-transform duration-500',
                    courante ? 'scale-x-100 bg-brand-600' : 'scale-x-0 bg-transparent'
                  )}
                />
              </button>
            </li>
          );
        })}
      </ol>

      {/* Sans ce bouton, un defilement automatique n'offrirait aucun moyen de
          l'arreter. Il disparait quand le mouvement reduit est demande : il n'y
          a alors plus rien a mettre en pause. */}
      {mouvementReduit ? null : (
        <button
          type="button"
          onClick={() => setEnPause((v) => !v)}
          aria-label={enPause ? 'Reprendre le défilement des étapes' : 'Mettre en pause le défilement des étapes'}
          className="mt-8 inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink-200 bg-surface text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-700"
        >
          {enPause ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
        </button>
      )}
    </div>
  );
}
