import { Link } from 'react-router-dom';
import { BarChart3, ChevronDown, ClipboardCheck, FileText, Layers, Leaf, Scale, Target, TrendingUp } from 'lucide-react';
import Revele from '../components/Revele';
import { SMARTEX } from '../config/smartex';

/**
 * Bénéfices résumés sous le héros — une ligne par promesse, volontairement
 * courte : le détail est développé sur /accueil et /methodologie.
 */
const BENEFICES = [
  {
    icone: ClipboardCheck,
    titre: 'Évaluez votre conformité',
    texte: 'Probabilité de conformité par critère.',
  },
  {
    icone: Target,
    titre: 'Priorisez vos actions',
    texte: 'Non-conformités classées par risque et criticité.',
  },
  {
    icone: TrendingUp,
    titre: 'Suivez votre progression',
    texte: 'Visibilité continue, pas une photo ponctuelle.',
  },
  {
    icone: Leaf,
    titre: 'Ouvrez-vous aux financements verts',
    texte: 'Indice de préparation aux standards IFC/SFI.',
  },
];

/**
 * Noeuds de l'emblème, dans le repère du SVG (640 × 420) : `x`/`y` place la
 * pastille, `ancre` le point de raccordement sur la sphère.
 */
const NOEUDS_EMBLEME = [
  { icone: FileText, libelle: 'Documents', x: 98, y: 78, ancre: [204, 142] },
  { icone: ClipboardCheck, libelle: 'Preuves', x: 542, y: 78, ancre: [436, 142] },
  { icone: Scale, libelle: 'Conformité', x: 98, y: 320, ancre: [204, 306] },
  { icone: BarChart3, libelle: 'Scoring', x: 542, y: 320, ancre: [436, 306] },
];

const CENTRE = [320, 232];

/** Origine des rotations SVG : le centre de l'emblème, en unités du viewBox. */
const ORIGINE_CENTRE = { transformOrigin: `${CENTRE[0]}px ${CENTRE[1]}px` };

/**
 * Sphère filaire entourant le bouclier : semis de points tirés d'une sphère
 * unité puis projetés, reliés dès qu'ils sont proches. Le tirage est
 * déterministe (générateur congruentiel à graine fixe) pour que le rendu soit
 * identique d'une visite à l'autre et entre le serveur et le client.
 */
const SPHERE = (() => {
  let graine = 20260901;
  const alea = () => {
    graine = (graine * 1103515245 + 12345) % 2147483648;
    return graine / 2147483648;
  };

  const rayon = 190;
  const points = Array.from({ length: 78 }, () => {
    const z = alea() * 2 - 1;
    const theta = alea() * Math.PI * 2;
    const anneau = Math.sqrt(1 - z * z);
    return {
      x: CENTRE[0] + rayon * anneau * Math.cos(theta),
      y: CENTRE[1] + rayon * z * 0.94,
      // Profondeur perçue : les points « devant » sont plus opaques.
      opacite: 0.25 + 0.55 * ((anneau * Math.sin(theta) + 1) / 2),
    };
  });

  const aretes = [];
  points.forEach((a, i) => {
    points.slice(i + 1).forEach((b) => {
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance < 66) {
        aretes.push({ a, b, opacite: 0.35 * (1 - distance / 66) });
      }
    });
  });

  return { points, aretes };
})();

/** Graduations de la jauge de conformité, de 0 % (gauche) à 100 % (droite). */
const GRADUATIONS = Array.from({ length: 49 }, (_, index) => {
  const angle = ((196 - (index * 212) / 48) * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const interieur = 132;
  const exterieur = index % 6 === 0 ? 158 : 149;
  return {
    x1: CENTRE[0] + cos * interieur,
    y1: CENTRE[1] - sin * interieur,
    x2: CENTRE[0] + cos * exterieur,
    y2: CENTRE[1] - sin * exterieur,
    majeure: index % 6 === 0,
  };
});

/** Poussière de points du fond du héros (positions figées). */
const PARTICULES = [
  { gauche: '4%', haut: '12%', taille: 7 },
  { gauche: '11%', haut: '46%', taille: 4 },
  { gauche: '8%', haut: '74%', taille: 6 },
  { gauche: '19%', haut: '22%', taille: 5 },
  { gauche: '26%', haut: '62%', taille: 3 },
  { gauche: '34%', haut: '9%', taille: 4 },
  { gauche: '44%', haut: '82%', taille: 5 },
  { gauche: '56%', haut: '14%', taille: 3 },
  { gauche: '66%', haut: '70%', taille: 6 },
  { gauche: '74%', haut: '30%', taille: 4 },
  { gauche: '83%', haut: '58%', taille: 7 },
  { gauche: '90%', haut: '18%', taille: 5 },
  { gauche: '95%', haut: '78%', taille: 4 },
];

const CHEMIN_BOUCLIER = 'M64 6 L120 30 V74 C120 111 96 133 64 143 C32 133 8 111 8 74 V30 Z';

/**
 * Page d'entrée de la plateforme (URL racine). Volontairement réduite au seul
 * héros : la présentation détaillée vit sur /accueil, /methodologie et
 * /formules. Rendue dans LayoutPublic, qui masque le pied de page sur cette
 * route ; le thème clair/sombre est hérité (tokens `ink`/`surface`).
 */
export default function Landing() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-halo-brand" aria-hidden />
      <span
        className="pointer-events-none absolute -left-32 top-24 h-80 w-80 rounded-full bg-brand-200/40 blur-3xl motion-safe:animate-respiration dark:bg-brand-800/40"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-brand-100/50 blur-3xl motion-safe:animate-respiration [animation-delay:2s] dark:bg-brand-900/50"
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {PARTICULES.map((particule, index) => (
          <span
            key={index}
            className="absolute rounded-full bg-brand-400/40 motion-safe:animate-respiration dark:bg-brand-400/30"
            style={{
              left: particule.gauche,
              top: particule.haut,
              width: particule.taille,
              height: particule.taille,
              animationDelay: `${index * 0.4}s`,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-[70rem] px-4 pb-8 pt-6 text-center sm:px-5 sm:pb-12 sm:pt-8">
        {/* Emblème : sphère de données, jauge de conformité, bouclier de la
            marque et les quatre natures d'objets manipulées par le moteur. */}
        <div className="relative mx-auto aspect-[640/420] w-full max-w-xs motion-safe:animate-apparition-douce sm:max-w-xl lg:max-w-3xl">
          <svg viewBox="0 0 640 420" className="h-full w-full" aria-hidden>
            <defs>
              <linearGradient id="degradeBouclier" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5fbd72" />
                <stop offset="55%" stopColor="#2e9e4b" />
                <stop offset="100%" stopColor="#1c7a37" />
              </linearGradient>
              <radialGradient id="lueurBouclier">
                <stop offset="0%" stopColor="#2e9e4b" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#2e9e4b" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Sphère : les anneaux tournent lentement en sens inverse l'un de
                l'autre, le semis de points dérive à son propre rythme. */}
            <g style={ORIGINE_CENTRE} className="motion-safe:animate-rotation">
              <ellipse
                cx={CENTRE[0]}
                cy={CENTRE[1]}
                rx="188"
                ry="178"
                className="fill-none stroke-brand-200/50 dark:stroke-brand-500/40"
                strokeWidth="1"
              />
              <ellipse
                cx={CENTRE[0]}
                cy={CENTRE[1]}
                rx="118"
                ry="176"
                className="fill-none stroke-brand-200/35 dark:stroke-brand-500/30"
                strokeWidth="1"
              />
            </g>

            <g style={ORIGINE_CENTRE} className="motion-safe:animate-rotation-inverse">
              {SPHERE.aretes.map((arete, index) => (
                <line
                  key={index}
                  x1={arete.a.x}
                  y1={arete.a.y}
                  x2={arete.b.x}
                  y2={arete.b.y}
                  className="stroke-brand-400 dark:stroke-brand-300"
                  strokeOpacity={arete.opacite}
                  strokeWidth="0.8"
                />
              ))}
              {SPHERE.points.map((point, index) => (
                <circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r={index % 4 === 0 ? 2.6 : 1.7}
                  className="fill-brand-500 dark:fill-brand-300"
                  fillOpacity={point.opacite}
                />
              ))}
            </g>

            {/* Graduations : allumées une à une, de 0 % vers 100 %. */}
            {GRADUATIONS.map((tick, index) => (
              <line
                key={index}
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                strokeWidth={tick.majeure ? 2.4 : 1.4}
                strokeLinecap="round"
                style={{ animationDelay: `${index * 28}ms` }}
                className={`motion-safe:animate-apparition-tick ${
                  tick.majeure ? 'stroke-brand-500 dark:stroke-brand-400' : 'stroke-brand-400/70 dark:stroke-brand-300/60'
                }`}
              />
            ))}

            {NOEUDS_EMBLEME.map((noeud, index) => (
              <g key={noeud.libelle} style={{ animationDelay: `${index * 260}ms` }} className="motion-safe:animate-apparition-tick">
                <line
                  x1={noeud.x}
                  y1={noeud.y}
                  x2={noeud.ancre[0]}
                  y2={noeud.ancre[1]}
                  className="stroke-brand-300 dark:stroke-brand-400/60"
                  strokeWidth="1"
                />
                <circle
                  cx={noeud.ancre[0]}
                  cy={noeud.ancre[1]}
                  r="4.5"
                  className="fill-brand-500 dark:fill-brand-400 motion-safe:animate-respiration"
                  style={{ transformOrigin: `${noeud.ancre[0]}px ${noeud.ancre[1]}px`, animationDelay: `${index * 700}ms` }}
                />
              </g>
            ))}

            <text
              x="212"
              y={CENTRE[1] + 42}
              className="fill-brand-600 text-[15px] font-semibold dark:fill-brand-300"
              textAnchor="middle"
            >
              0 %
            </text>
            <text
              x="430"
              y={CENTRE[1] + 42}
              className="fill-brand-600 text-[15px] font-semibold dark:fill-brand-300"
              textAnchor="middle"
            >
              100 %
            </text>

            <ellipse
              cx={CENTRE[0]}
              cy={CENTRE[1] + 96}
              rx="120"
              ry="34"
              fill="url(#lueurBouclier)"
              className="motion-safe:animate-respiration"
              style={{ transformOrigin: `${CENTRE[0]}px ${CENTRE[1] + 96}px` }}
            />

            {/* Le flottement est porté par un groupe interne : une animation CSS
                sur le groupe positionné écraserait son attribut `transform`. */}
            <g transform={`translate(${CENTRE[0] - 64}, ${CENTRE[1] - 74})`}>
              <g className="motion-safe:animate-flottement">
                <path d={CHEMIN_BOUCLIER} className="fill-surface" />
                <path
                  d={CHEMIN_BOUCLIER}
                  fill="none"
                  stroke="url(#degradeBouclier)"
                  strokeWidth="7"
                  strokeLinejoin="round"
                />
                <path
                  d="M64 42 C40 50 30 72 36 96 C60 100 80 82 80 60 C80 52 74 44 64 42 Z"
                  fill="url(#degradeBouclier)"
                />
                <path
                  d="M40 100 C48 84 58 70 74 58"
                  fill="none"
                  stroke="#f2fbf4"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </g>
            </g>
          </svg>

          {NOEUDS_EMBLEME.map((noeud, index) => (
            <span
              key={noeud.libelle}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
              style={{ left: `${(noeud.x / 640) * 100}%`, top: `${(noeud.y / 420) * 100}%` }}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full border border-brand-300 bg-surface text-brand-600 shadow-soft motion-safe:animate-flottement dark:border-brand-500/60 dark:text-brand-400 sm:h-10 sm:w-10 lg:h-14 lg:w-14"
                style={{ animationDelay: `${index * 900}ms` }}
              >
                <noeud.icone className="h-3 w-3 sm:h-4 sm:w-4 lg:h-6 lg:w-6" strokeWidth={1.6} aria-hidden />
              </span>
              <span className="text-[0.45rem] font-semibold uppercase tracking-[0.15em] text-ink-500 sm:text-[0.7rem] sm:tracking-[0.2em]">
                {noeud.libelle}
              </span>
            </span>
          ))}
        </div>

        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-brand-600 motion-safe:animate-apparition-bas dark:text-brand-400 sm:text-xs sm:tracking-[0.32em]">
          Plateforme d’évaluation RSE intelligente
        </p>

        <h1
          className="mx-auto mt-4 max-w-4xl text-[1.65rem] font-bold leading-[1.15] text-ink-900 motion-safe:animate-apparition-bas sm:text-4xl lg:max-w-none lg:whitespace-nowrap lg:text-[15px] lg:leading-none xl:text-[17px]"
          style={{ animationDelay: '120ms' }}
        >
          Mesurer et optimiser la démarche de maturité et la performance de votre entreprise en matière de{' '}
          <span className="text-brand-600 dark:text-brand-400">RSE et ESG</span> avec l’intelligence artificielle.
        </h1>

        <p
          className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ink-600 motion-safe:animate-apparition-bas sm:mt-5 sm:text-base"
          style={{ animationDelay: '240ms' }}
        >
          {SMARTEX.produit} unifie référentiels, preuves documentaires et intelligence artificielle multi-agents pour
          évaluer, prioriser et améliorer votre performance RSE et ESG.
        </p>

        <div
          className="mt-6 flex flex-wrap items-center justify-center gap-3 motion-safe:animate-apparition-bas sm:mt-9 sm:gap-4"
          style={{ animationDelay: '360ms' }}
        >
          <Link
            to="/accueil"
            className="btn-vitrine px-6 py-3 text-sm transition-transform duration-300 hover:-translate-y-0.5 sm:px-8 sm:py-3.5 sm:text-base"
          >
            Découvrir la plateforme
          </Link>
          <Link
            to="/formules"
            className="btn-vitrine-clair group px-6 py-3 text-sm transition-transform duration-300 hover:-translate-y-0.5 sm:px-8 sm:py-3.5 sm:text-base"
          >
            <Layers
              className="h-4 w-4 text-brand-600 transition-transform duration-300 group-hover:scale-110 dark:text-brand-400 sm:h-5 sm:w-5"
              strokeWidth={1.6}
              aria-hidden
            />
            Formule de collaboration
          </Link>
        </div>

        <dl className="mt-10 grid gap-6 text-left sm:mt-14 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-ink-100">
          {BENEFICES.map((benefice, index) => (
            <Revele key={benefice.titre} delai={index * 110}>
              <div className="group flex gap-3 lg:px-6">
                <benefice.icone
                  className="mt-0.5 h-8 w-8 shrink-0 text-brand-600 transition-transform duration-300 group-hover:scale-110 dark:text-brand-400"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <div>
                  <dt className="text-sm font-semibold text-ink-900">{benefice.titre}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-ink-500">{benefice.texte}</dd>
                </div>
              </div>
            </Revele>
          ))}
        </dl>

        <Link
          to="/methodologie"
          className="mt-8 inline-flex flex-col items-center gap-2 text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-brand-600 transition hover:text-brand-700 dark:text-brand-400 sm:mt-12 sm:text-[0.65rem] sm:tracking-[0.3em]"
        >
          Découvrir
          <span className="flex h-9 w-6 items-start justify-center rounded-full border-2 border-brand-400 pt-1.5">
            <span className="h-1.5 w-1 rounded-full bg-brand-500 motion-safe:animate-bounce" />
          </span>
          <ChevronDown className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
