import { useEffect, useState } from 'react';
import clsx from 'clsx';

/**
 * La chaîne de traitement, en frise numérotée, avec un accent qui avance.
 *
 * Les sept maillons sont affichés en entier, tout le temps : l'accent qui
 * circule ne fait que désigner, il ne masque rien. C'est la condition pour
 * qu'un rythme d'une seconde reste tenable — personne ne lit un paragraphe et
 * trois points en une seconde, mais tout le monde peut suivre un point lumineux
 * qui parcourt une frise déjà lisible.
 *
 * Le mouvement s'arrête de quatre façons, et ce n'est pas du zèle : WCAG 2.2.2
 * l'impose pour tout mouvement automatique dépassant cinq secondes, et un cycle
 * d'une seconde en dépasse bien plus. Il s'arrête donc au survol, au focus
 * clavier, par le bouton, et il ne démarre pas du tout sous « réduire les
 * animations » — la frise est alors simplement immobile, sans rien perdre.
 *
 * `repere` porte un fait vérifiable du produit et non une durée : nous n'avons
 * aucune mesure de temps par étape, et un « 2 min » inventé serait un
 * engagement que rien ne tient.
 */
const RYTHME = 1000;

export default function ChaineEtapes({ etapes }) {
  const [actif, setActif] = useState(0);
  const [enPause, setEnPause] = useState(false);
  const [suspendu, setSuspendu] = useState(false);
  const [mouvementReduit, setMouvementReduit] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const appliquer = () => setMouvementReduit(mq.matches);
    appliquer();
    mq.addEventListener('change', appliquer);
    return () => mq.removeEventListener('change', appliquer);
  }, []);

  useEffect(() => {
    if (enPause || suspendu || mouvementReduit) return undefined;
    const minuteur = setInterval(() => setActif((rang) => (rang + 1) % etapes.length), RYTHME);
    return () => clearInterval(minuteur);
  }, [enPause, suspendu, mouvementReduit, etapes.length]);

  return (
    <div
      onMouseEnter={() => setSuspendu(true)}
      onMouseLeave={() => setSuspendu(false)}
      onFocusCapture={() => setSuspendu(true)}
      onBlurCapture={() => setSuspendu(false)}
    >
      <ol className="mt-12 grid gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 xl:gap-x-5">
        {etapes.map((etape, index) => {
          const courant = index === actif && !mouvementReduit;
          return (
            <li key={etape.libelle} className="relative flex flex-col">
              {/* Le trait de liaison n'existe qu'en frise : empilés, les
                  maillons n'ont rien à relier. Il s'arrête au dernier. */}
              {index < etapes.length - 1 ? (
                <span
                  className="absolute left-7 top-[27px] hidden h-0.5 w-full overflow-hidden bg-ink-200 xl:block"
                  aria-hidden
                >
                  {/* Le segment franchi se peint en bordeaux : la progression
                      se lit alors sur la ligne elle-même, et pas seulement sur
                      la pastille allumée. Il se vide quand le cycle repart. */}
                  <span
                    className={clsx(
                      'block h-full origin-left bg-brand-600 transition-transform duration-500 ease-out',
                      index < actif ? 'scale-x-100' : 'scale-x-0'
                    )}
                  />
                </span>
              ) : null}

              {/* Le rang seul sur sa ligne : il tient la rangée des pastilles
                  bien alignée, quelle que soit la longueur des repères, et le
                  trait de liaison n'a plus rien à traverser.

                  C'est aussi la commande. Un bouton d'arrêt séparé faisait
                  double emploi avec la frise elle-même ; en cliquant une
                  pastille on fixe l'étape et le défilement s'arrête. Ce geste
                  existe au clavier comme au doigt, là où le survol ne vaut ni
                  pour l'un ni pour l'autre — c'est ce que WCAG 2.2.2 réclame. */}
              <button
                type="button"
                onClick={() => {
                  setActif(index);
                  setEnPause(true);
                }}
                aria-current={index === actif ? 'step' : undefined}
                className={clsx(
                  'relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300',
                  courant ? 'border-brand-600 bg-brand-600' : 'border-brand-600 bg-surface hover:bg-brand-50'
                )}
              >
                <span
                  className={clsx(
                    'font-display text-[15px] font-bold tabular-nums transition-colors duration-300',
                    courant ? 'text-white' : 'text-brand-600'
                  )}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="sr-only">
                  {etape.libelle}
                  {enPause ? '' : ' — arrête le défilement'}
                </span>
              </button>

              <p className="mt-5 flex items-center gap-2">
                {etape.icone ? (
                  <etape.icone className="h-[18px] w-[18px] shrink-0 text-ink-500" strokeWidth={1.75} aria-hidden />
                ) : null}
                <span className="font-display text-base font-bold text-ink-900">{etape.libelle}</span>
              </p>

              {etape.repere ? (
                <p className="mt-2">
                  <span className="inline-block rounded-full bg-ink-100 px-2.5 py-1 text-[13px] font-medium text-ink-600">
                    {etape.repere}
                  </span>
                </p>
              ) : null}

              <p className="mt-2.5 text-[15px] leading-relaxed text-ink-600">{etape.detail}</p>

              {etape.points?.length ? (
                <ul className="mt-4 flex flex-col gap-2 border-t border-ink-200 pt-4">
                  {etape.points.map((point) => (
                    <li key={point} className="flex gap-2.5 text-[14px] leading-snug text-ink-700">
                      <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-brand-600" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ol>

    </div>
  );
}
