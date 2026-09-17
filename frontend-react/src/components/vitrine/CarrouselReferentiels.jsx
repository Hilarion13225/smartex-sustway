import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

/**
 * Les référentiels en éventail : la fiche au centre, ses voisines en retrait
 * de part et d'autre.
 *
 * La grille à filets qu'elle remplace donnait le même poids à six repères et
 * se parcourait d'un bloc. L'éventail en désigne un à la fois — ce qui
 * convient à des cadres qu'on découvre l'un après l'autre plutôt qu'on
 * compare.
 *
 * Les logos sont servis depuis `public/referentiels/`, non importés : un
 * fichier absent ne casse alors ni le build ni la page. Tant qu'il manque, la
 * fiche montre le nom du référentiel en grand, ce qui reste l'information
 * utile ; le logo viendra s'y ajouter le jour où il sera déposé.
 *
 * L'éventail tourne seul, une fiche toutes les trois secondes et demie. Le
 * rythme est plus lent que celui de la frise voisine parce qu'on ne fait pas
 * la même chose : là on suit un point qui avance sur un contenu déjà lu, ici
 * on lit la fiche qui vient de passer au centre.
 *
 * Il s'arrête de quatre façons, et aucune n'a demandé d'ajouter un bouton :
 * au survol, au focus clavier, et dès qu'on touche une flèche ou une fiche —
 * qui veut regarder n'a pas à lutter contre le mouvement. Sous « réduire les
 * animations », il ne démarre pas. C'est ce que réclame WCAG 2.2.2 pour tout
 * mouvement dépassant cinq secondes.
 *
 * Accessibilité : les fiches restent dans le document et gardent leur ordre de
 * lecture. Celles qui sont trop en retrait sont retirées du parcours clavier
 * plutôt que masquées, et le couple de boutons suffit à toutes les atteindre.
 */
export default function CarrouselReferentiels({ referentiels }) {
  const [actif, setActif] = useState(Math.floor(referentiels.length / 2));
  const [suspendu, setSuspendu] = useState(false);
  const [maintenu, setMaintenu] = useState(false);
  const [mouvementReduit, setMouvementReduit] = useState(false);
  const piste = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const appliquer = () => setMouvementReduit(mq.matches);
    appliquer();
    mq.addEventListener('change', appliquer);
    return () => mq.removeEventListener('change', appliquer);
  }, []);

  useEffect(() => {
    if (suspendu || maintenu || mouvementReduit) return undefined;
    const minuteur = setInterval(
      () => setActif((rang) => (rang + 1) % referentiels.length),
      3500
    );
    return () => clearInterval(minuteur);
  }, [suspendu, maintenu, mouvementReduit, referentiels.length]);

  // Choisir une fiche arrête le défilement pour de bon : on vient de dire
  // laquelle on veut lire, la faire filer serait la reprendre aussitôt.
  const allerA = (index) => {
    setMaintenu(true);
    setActif(Math.max(0, Math.min(referentiels.length - 1, index)));
  };

  const surTouche = (evenement) => {
    const cible = { ArrowRight: actif + 1, ArrowLeft: actif - 1, Home: 0, End: referentiels.length - 1 }[
      evenement.key
    ];
    if (cible === undefined) return;
    evenement.preventDefault();
    allerA(cible);
  };

  return (
    <div className="mt-12">
      <div
        ref={piste}
        onKeyDown={surTouche}
        onMouseEnter={() => setSuspendu(true)}
        onMouseLeave={() => setSuspendu(false)}
        onFocusCapture={() => setSuspendu(true)}
        onBlurCapture={() => setSuspendu(false)}
        className="relative h-[19rem] select-none overflow-hidden sm:h-[20rem]"
        role="group"
        aria-label="Référentiels et standards mobilisés"
      >
        {referentiels.map((reference, index) => {
          const ecart = index - actif;
          const loin = Math.abs(ecart);
          const visible = loin <= 2;
          return (
            <button
              key={reference.code}
              type="button"
              onClick={() => allerA(index)}
              tabIndex={visible ? 0 : -1}
              aria-current={index === actif ? 'true' : undefined}
              className={clsx(
                'absolute left-1/2 top-0 h-full w-[17rem] -translate-x-1/2 rounded-[16px] border p-6 text-left transition-all duration-500 ease-out will-change-[transform,filter] sm:w-[19rem] sm:p-7',
                index === actif
                  ? 'border-ink-200 bg-surface shadow-[0_2px_4px_rgb(var(--marine)/0.06),0_18px_40px_-20px_rgb(var(--marine)/0.28)]'
                  : 'border-ink-200 bg-ink-50'
              )}
              style={{
                transform: `translateX(calc(-50% + ${ecart * 62}%)) scale(${1 - loin * 0.08}) rotate(${ecart * 2.5}deg)`,
                zIndex: referentiels.length - loin,
                opacity: visible ? 1 - loin * 0.08 : 0,
                // Profondeur de champ : la fiche regardée est nette, les autres
                // se brouillent à mesure qu'elles s'éloignent. L'œil va d'abord
                // à ce qui est net, ce qui dit sans un mot laquelle on lit.
                filter: loin === 0 ? 'none' : `blur(${loin * 1.6}px)`,
                pointerEvents: visible ? 'auto' : 'none',
              }}
            >
              {/* Le logo occupe la moitié haute de la fiche : c'est lui qu'on
                  vient reconnaître, le texte ne fait que le nommer. La boîte a
                  une hauteur fixe et l'image s'y inscrit en entier, si bien
                  qu'un logo carré et un logo très large y paraissent de même
                  importance.

                  `onError` retire l'image plutôt que d'afficher une icône
                  cassée : tant qu'un fichier n'est pas déposé, la fiche se lit
                  sans lui. */}
              <span className="flex h-28 w-full items-center justify-center sm:h-32">
                <img
                  src={`/referentiels/${reference.code.toLowerCase().replace(/_/g, '-')}.png`}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className="max-h-full max-w-full object-contain"
                  onError={(evenement) => {
                    evenement.currentTarget.style.display = 'none';
                  }}
                />
              </span>

              <span className="mt-4 block font-display text-base font-bold leading-snug text-ink-900">
                {reference.nom}
              </span>
              <span className="mt-1.5 block text-[14px] leading-relaxed text-ink-600">{reference.texte}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => allerA(actif - 1)}
          disabled={actif === 0}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-300 text-ink-700 transition-colors hover:bg-ink-100 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span className="sr-only">Référentiel précédent</span>
        </button>
        <p className="text-sm tabular-nums text-ink-500">
          {actif + 1} / {referentiels.length}
        </p>
        <button
          type="button"
          onClick={() => allerA(actif + 1)}
          disabled={actif === referentiels.length - 1}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-300 text-ink-700 transition-colors hover:bg-ink-100 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
          <span className="sr-only">Référentiel suivant</span>
        </button>
      </div>
    </div>
  );
}
