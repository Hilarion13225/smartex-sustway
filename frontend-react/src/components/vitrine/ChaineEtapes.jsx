import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Pause, Play } from 'lucide-react';
import clsx from 'clsx';

const INTERVALLE = 5000;

/**
 * Chaîne d'étapes : jalons numérotés sur un rail en pointillés, horizontaux sur
 * grand écran, empilés sur téléphone.
 *
 * Structure reprise du composant « 8bit Timeline Horizontal » de 21st.dev,
 * comme le panneau mobile l'avait été de son « Header 3 ». Son habillage
 * pixel-art et sa dépendance à `cn`/`@/lib/utils` sont écartés : la vitrine a
 * déjà sa palette en variables CSS et utilise `clsx`. Les jetons sémantiques du
 * composant d'origine (`border-border`, `bg-background`, `text-muted-foreground`)
 * sont traduits vers ceux du projet.
 *
 * Ce qui a été ajouté : l'avance automatique et les états. Le composant
 * d'origine est statique, tous ses jalons se ressemblent.
 *
 * Aucun texte n'est jamais masqué : les sept intitulés et leurs détails restent
 * lisibles en permanence, seul l'accent se déplace. Une étape « à venir » est
 * donc moins appuyée, jamais absente — ce qui vaut pour un moteur de recherche,
 * une impression, et quiconque ne verra jamais l'animation.
 *
 * Le défilement automatique obéit aux règles qui l'encadrent : arrêt au survol
 * et au focus, bouton pause, et aucun démarrage quand le visiteur a demandé
 * moins d'animations.
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

  // Une étape choisie à la main reste affichée : reprendre aussitôt donnerait
  // l'impression que le clic n'a pas été pris en compte.
  const choisir = useCallback((index) => {
    setActif(index);
    setEnPause(true);
  }, []);

  const surBlur = (evenement) => {
    if (!conteneur.current?.contains(evenement.relatedTarget)) setSuspendu(false);
  };

  // Le rail s'arrete au centre des jalons extremes : une demi-cellule de
  // retrait de chaque cote, soit 50 / n pour n cellules de largeur egale.
  const marge = 50 / etapes.length;
  const progression = (actif / Math.max(1, etapes.length - 1)) * (100 - 2 * marge);

  return (
    <div
      ref={conteneur}
      className="mt-12"
      onMouseEnter={() => setSuspendu(true)}
      onMouseLeave={() => setSuspendu(false)}
      onFocus={() => setSuspendu(true)}
      onBlur={surBlur}
    >
      <div className="relative">
        {/* Rail en pointillés, derrière les jalons. Il court du centre du premier
            jalon au centre du dernier — d'où le retrait d'une demi-cellule de
            chaque côté — et ne relie que ce qui est sur une même ligne : sous
            `md` la chaîne se lit de haut en bas. */}
        <span
          aria-hidden
          className="absolute top-7 hidden border-t-2 border-dashed border-ink-300 md:block"
          style={{ left: `${marge}%`, right: `${marge}%` }}
        />
        {/* Portion franchie du rail. Un seul accent sur cette vitrine : le
            bordeaux, decline en deux intensites plutot qu'en deux teintes. */}
        <span
          aria-hidden
          className="absolute top-7 hidden border-t-2 border-brand-600 transition-all duration-500 md:block"
          style={{ left: `${marge}%`, width: `${progression}%` }}
        />

        <ol className="relative flex flex-col gap-10 md:flex-row md:gap-0">
          {etapes.map((etape, index) => {
            const franchie = index < actif;
            const courante = index === actif;
            return (
              <li key={etape.libelle} className="flex flex-1 justify-center">
                <button
                  type="button"
                  onClick={() => choisir(index)}
                  aria-current={courante ? 'step' : undefined}
                  className="group flex w-full flex-col items-center px-1 text-center md:max-w-[11rem]"
                >
                  <span
                    className={clsx(
                      'relative z-10 mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-[4px] border-2 font-display text-lg font-bold tabular-nums transition-all duration-500',
                      courante && 'scale-105 border-brand-600 bg-brand-600 text-white shadow-soft',
                      franchie && !courante && 'border-brand-600 bg-surface text-brand-700',
                      !courante && !franchie && 'border-ink-300 bg-surface text-ink-500'
                    )}
                  >
                    {franchie && !courante ? <Check className="h-6 w-6" aria-hidden /> : index + 1}
                  </span>

                  <span
                    className={clsx(
                      'block font-display text-lg font-bold leading-snug transition-colors duration-500',
                      courante ? 'text-brand-700' : 'text-ink-900'
                    )}
                  >
                    {etape.libelle}
                  </span>
                  <span className="mt-1.5 block text-[15px] leading-snug text-ink-600">{etape.detail}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Sans ce bouton, un défilement automatique n'offrirait aucun moyen de
          l'arrêter. Il disparaît quand le mouvement réduit est demandé : il n'y
          a alors plus rien à mettre en pause. */}
      {mouvementReduit ? null : (
        <button
          type="button"
          onClick={() => setEnPause((v) => !v)}
          aria-label={enPause ? 'Reprendre le défilement des étapes' : 'Mettre en pause le défilement des étapes'}
          className="mt-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink-200 bg-surface text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-700"
        >
          {enPause ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
        </button>
      )}
    </div>
  );
}
