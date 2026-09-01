import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  ClipboardCheck,
  FileText,
  Leaf,
  Scale,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import Revele from '../components/Revele';
import { SMARTEX } from '../config/smartex';

/**
 * Feuilles du fond du héros : position de départ, taille, vitesse, dérive
 * horizontale (--dx) et décalage. Délais négatifs pour que certaines soient
 * déjà « en vol » au chargement plutôt que de toutes partir du bas ensemble.
 */
const FEUILLES = [
  { gauche: '6%', taille: 18, duree: 19, delai: -3, dx: 55 },
  { gauche: '18%', taille: 13, duree: 24, delai: -14, dx: -35 },
  { gauche: '32%', taille: 22, duree: 21, delai: -8, dx: 40 },
  { gauche: '47%', taille: 15, duree: 26, delai: -1, dx: -50 },
  { gauche: '61%', taille: 20, duree: 18, delai: -11, dx: 30 },
  { gauche: '74%', taille: 14, duree: 23, delai: -6, dx: -60 },
  { gauche: '88%', taille: 21, duree: 20, delai: -16, dx: 45 },
];

/**
 * Bénéfices résumés sous le héros — une ligne par promesse, volontairement
 * courte : le détail est développé sur /accueil et /methodologie.
 */
const BENEFICES = [
  {
    icone: ClipboardCheck,
    titre: 'Évaluez votre conformité',
    texte: 'Probabilité de conformité par critère, calculée par l’IA.',
  },
  {
    icone: Target,
    titre: 'Priorisez vos actions',
    texte: 'Non-conformités classées par risque et criticité.',
  },
  {
    icone: TrendingUp,
    titre: 'Suivez votre progression',
    texte: 'Historique de score : une trajectoire, pas une photo ponctuelle.',
  },
  {
    icone: Leaf,
    titre: 'Ouvrez-vous aux financements verts',
    texte: 'Indice de préparation aux standards IFC/SFI.',
  },
];

/**
 * Noeuds de l'emblème du héros, positionnés dans le repère du SVG
 * (640 × 420) : `x`/`y` place la pastille, `ancre` le point de la ligne qui
 * la relie au cercle central.
 */
const NOEUDS_EMBLEME = [
  { icone: FileText, libelle: 'Documents', x: 100, y: 90, ancre: [215, 152] },
  { icone: ClipboardCheck, libelle: 'Preuves', x: 540, y: 90, ancre: [425, 152] },
  { icone: Scale, libelle: 'Conformité', x: 88, y: 272, ancre: [196, 268] },
  { icone: BarChart3, libelle: 'Scoring', x: 552, y: 272, ancre: [444, 268] },
];

/** Graduations de la jauge semi-circulaire du héros. */
const GRADUATIONS = Array.from({ length: 45 }, (_, index) => {
  const angle = Math.PI - (index * Math.PI) / 44;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x1: 320 + cos * 150,
    y1: 320 - sin * 150,
    x2: 320 + cos * (index % 5 === 0 ? 174 : 166),
    y2: 320 - sin * (index % 5 === 0 ? 174 : 166),
  };
});

/** Semis de points du fond de l'emblème (positions figées, rendu stable entre deux visites). */
const POINTS_RESEAU = [
  [70, 60],
  [150, 40],
  [240, 110],
  [320, 55],
  [400, 110],
  [490, 40],
  [570, 60],
  [40, 180],
  [120, 230],
  [230, 250],
  [320, 200],
  [410, 250],
  [520, 230],
  [600, 180],
  [90, 360],
  [200, 390],
  [320, 370],
  [440, 390],
  [550, 360],
];

/**
 * Page d'entrée de la plateforme (URL racine). Volontairement réduite au seul
 * héros : la présentation détaillée vit sur /accueil, /methodologie et
 * /formules. Rendue dans LayoutPublic comme le reste de la vitrine — en-tête
 * et pied de page communs, thème clair/sombre hérité (tokens `ink`/`surface`).
 */
export default function Landing() {
  return (
    <div>
      {/* ---------------------------------------------------------------- Héros */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-halo-brand" aria-hidden />
        <span
          className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-brand-300/25 blur-3xl motion-safe:animate-respiration"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-emerald-300/25 blur-3xl motion-safe:animate-respiration [animation-delay:2s]"
          aria-hidden
        />

        {/* Feuilles qui montent doucement — le motif « croissance / durabilité »
            de la marque, en mouvement plutôt qu'en icône figée. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {FEUILLES.map((feuille, index) => (
            <Leaf
              key={index}
              className="absolute bottom-0 text-emerald-500/50 motion-safe:animate-derive-feuille dark:text-emerald-400/40"
              style={{
                left: feuille.gauche,
                width: feuille.taille,
                height: feuille.taille,
                animationDuration: `${feuille.duree}s`,
                animationDelay: `${feuille.delai}s`,
                '--dx': `${feuille.dx}px`,
              }}
              strokeWidth={1.5}
            />
          ))}
        </div>

        <div className="relative mx-auto max-w-[70rem] px-5 pb-14 pt-12 text-center lg:pt-16">
          {/* Emblème : jauge de conformité, bouclier de la marque et les quatre
              natures d'objets manipulées par le moteur d'évaluation. */}
          <div className="relative mx-auto aspect-[640/420] w-full max-w-3xl motion-safe:animate-apparition-douce">
            <svg viewBox="0 0 640 420" className="h-full w-full" aria-hidden>
              {POINTS_RESEAU.map(([x, y], index) => (
                <circle key={index} cx={x} cy={y} r={index % 3 === 0 ? 3 : 2} className="fill-brand-300/60" />
              ))}

              <path
                d="M 145 320 A 175 175 0 0 1 495 320"
                className="stroke-brand-200/70"
                strokeWidth="1"
                fill="none"
              />
              {GRADUATIONS.map((tick, index) => (
                <line
                  key={index}
                  x1={tick.x1}
                  y1={tick.y1}
                  x2={tick.x2}
                  y2={tick.y2}
                  strokeWidth={index % 5 === 0 ? 2 : 1}
                  className={index <= 30 ? 'stroke-brand-500' : 'stroke-brand-200'}
                />
              ))}

              {NOEUDS_EMBLEME.map((noeud) => (
                <g key={noeud.libelle}>
                  <line
                    x1={noeud.x}
                    y1={noeud.y}
                    x2={noeud.ancre[0]}
                    y2={noeud.ancre[1]}
                    className="stroke-brand-200"
                    strokeWidth="1"
                  />
                  <circle cx={noeud.ancre[0]} cy={noeud.ancre[1]} r="4" className="fill-brand-400" />
                </g>
              ))}

              <text x="150" y="346" className="fill-brand-600 text-[13px] font-medium" textAnchor="middle">
                0 %
              </text>
              <text x="492" y="346" className="fill-brand-600 text-[13px] font-medium" textAnchor="middle">
                100 %
              </text>
            </svg>

            <span
              className="pointer-events-none absolute left-1/2 top-[70%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-400/25 blur-3xl motion-safe:animate-respiration"
              aria-hidden
            />
            <span className="absolute left-1/2 top-[70%] -translate-x-1/2 -translate-y-1/2 motion-safe:animate-flottement" aria-hidden>
              <span className="relative block">
                <Shield className="h-28 w-28 text-brand-600 sm:h-36 sm:w-36" strokeWidth={1.25} />
                <Leaf
                  className="absolute left-1/2 top-[44%] h-11 w-11 -translate-x-1/2 -translate-y-1/2 -rotate-12 fill-brand-500/20 text-brand-600 sm:h-14 sm:w-14"
                  strokeWidth={1.5}
                />
              </span>
            </span>

            {NOEUDS_EMBLEME.map((noeud) => (
              <span
                key={noeud.libelle}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
                style={{ left: `${(noeud.x / 640) * 100}%`, top: `${(noeud.y / 420) * 100}%` }}
              >
                <span className="rounded-full border border-brand-200 bg-surface/90 p-2 text-brand-600 shadow-soft backdrop-blur sm:p-2.5">
                  <noeud.icone className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                </span>
                <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-ink-500 sm:text-[0.65rem]">
                  {noeud.libelle}
                </span>
              </span>
            ))}
          </div>

          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.28em] text-brand-600 dark:text-brand-400">
            Plateforme d’évaluation RSE intelligente
          </p>

          <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-semibold leading-[1.1] text-ink-900 sm:text-5xl lg:text-[3.5rem]">
            Maîtrisez votre performance RSE.
            <br />
            Agissez avec <span className="text-brand-600 dark:text-brand-400">intelligence</span>.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-600">
            {SMARTEX.produit} unifie référentiel sectoriel, preuves documentaires et pipeline IA multi-agents pour évaluer,
            prioriser et améliorer votre performance RSE. {SMARTEX.promesseFinancement}
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link to="/inscription" className="btn-vitrine group px-6 py-3">
              Créer un compte
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>
            <Link to="/methodologie" className="btn-vitrine-clair px-6 py-3">
              <Sparkles className="h-4 w-4 text-brand-500" aria-hidden />
              Voir la méthodologie
            </Link>
          </div>

          <dl className="mt-14 grid gap-6 border-t border-ink-100 pt-10 text-left sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-ink-100">
            {BENEFICES.map((benefice, index) => (
              <Revele key={benefice.titre} delai={index * 110}>
                <div className="flex gap-3 lg:px-5">
                  <benefice.icone className="mt-0.5 h-6 w-6 shrink-0 text-brand-600 dark:text-brand-400" strokeWidth={1.6} aria-hidden />
                  <div>
                    <dt className="text-sm font-semibold text-ink-900">{benefice.titre}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-ink-500">{benefice.texte}</dd>
                  </div>
                </div>
              </Revele>
            ))}
          </dl>

          <Link
            to="/accueil"
            className="mt-12 inline-flex flex-col items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-brand-600 transition hover:text-brand-700 dark:text-brand-400"
          >
            Découvrir
            <ChevronDown className="h-5 w-5 motion-safe:animate-bounce" aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}
