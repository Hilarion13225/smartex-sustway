import { Link } from 'react-router-dom';
import { BarChart3, ChevronDown, ClipboardCheck, FileText, Leaf, PlayCircle, Scale, Target, TrendingUp } from 'lucide-react';
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
    texte: 'Probabilité de conformité par critère, calculée par IA.',
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
 * /formules. Rendue dans LayoutPublic comme le reste de la vitrine — en-tête
 * et pied de page communs, thème clair/sombre hérité (tokens `ink`/`surface`).
 */
export default function Landing() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-halo-brand" aria-hidden />
      <span
        className="pointer-events-none absolute -left-32 top-24 h-80 w-80 rounded-full bg-brand-200/40 blur-3xl motion-safe:animate-respiration"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-brand-100/50 blur-3xl motion-safe:animate-respiration [animation-delay:2s]"
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {PARTICULES.map((particule, index) => (
          <span
            key={index}
            className="absolute rounded-full bg-brand-400/40 motion-safe:animate-respiration"
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

      <div className="relative mx-auto max-w-[70rem] px-5 pb-12 pt-8 text-center">
        {/* Emblème : sphère de données, jauge de conformité, bouclier de la
            marque et les quatre natures d'objets manipulées par le moteur. */}
        <div className="relative mx-auto aspect-[640/420] w-full max-w-3xl motion-safe:animate-apparition-douce">
          <svg viewBox="0 0 640 420" className="h-full w-full" aria-hidden>
            <defs>
              <linearGradient id="degradeBouclier" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#cf5c50" />
                <stop offset="55%" stopColor="#b3271e" />
                <stop offset="100%" stopColor="#921f18" />
              </linearGradient>
              <radialGradient id="lueurBouclier">
                <stop offset="0%" stopColor="#b3271e" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#b3271e" stopOpacity="0" />
              </radialGradient>
            </defs>

            <ellipse
              cx={CENTRE[0]}
              cy={CENTRE[1]}
              rx="188"
              ry="178"
              className="fill-none stroke-brand-200/50"
              strokeWidth="1"
            />
            <ellipse
              cx={CENTRE[0]}
              cy={CENTRE[1]}
              rx="118"
              ry="176"
              className="fill-none stroke-brand-200/35"
              strokeWidth="1"
            />

            {SPHERE.aretes.map((arete, index) => (
              <line
                key={index}
                x1={arete.a.x}
                y1={arete.a.y}
                x2={arete.b.x}
                y2={arete.b.y}
                stroke="#cf5c50"
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
                fill="#b3271e"
                fillOpacity={point.opacite}
              />
            ))}

            {GRADUATIONS.map((tick, index) => (
              <line
                key={index}
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                strokeWidth={tick.majeure ? 2.4 : 1.4}
                strokeLinecap="round"
                className={tick.majeure ? 'stroke-brand-500' : 'stroke-brand-400/70'}
              />
            ))}

            {NOEUDS_EMBLEME.map((noeud) => (
              <g key={noeud.libelle}>
                <line
                  x1={noeud.x}
                  y1={noeud.y}
                  x2={noeud.ancre[0]}
                  y2={noeud.ancre[1]}
                  className="stroke-brand-300"
                  strokeWidth="1"
                />
                <circle cx={noeud.ancre[0]} cy={noeud.ancre[1]} r="4.5" className="fill-brand-500" />
              </g>
            ))}

            <text x="212" y={CENTRE[1] + 42} className="fill-brand-600 text-[15px] font-semibold" textAnchor="middle">
              0 %
            </text>
            <text x="430" y={CENTRE[1] + 42} className="fill-brand-600 text-[15px] font-semibold" textAnchor="middle">
              100 %
            </text>

            <ellipse cx={CENTRE[0]} cy={CENTRE[1] + 96} rx="120" ry="34" fill="url(#lueurBouclier)" />

            <g transform={`translate(${CENTRE[0] - 64}, ${CENTRE[1] - 74})`}>
              <path d={CHEMIN_BOUCLIER} className="fill-surface" />
              <path d={CHEMIN_BOUCLIER} fill="none" stroke="url(#degradeBouclier)" strokeWidth="7" strokeLinejoin="round" />
              <path
                d="M64 42 C40 50 30 72 36 96 C60 100 80 82 80 60 C80 52 74 44 64 42 Z"
                fill="url(#degradeBouclier)"
              />
              <path
                d="M40 100 C48 84 58 70 74 58"
                fill="none"
                stroke="#fdf2f1"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </g>
          </svg>

          {NOEUDS_EMBLEME.map((noeud) => (
            <span
              key={noeud.libelle}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
              style={{ left: `${(noeud.x / 640) * 100}%`, top: `${(noeud.y / 420) * 100}%` }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-300 bg-surface text-brand-600 shadow-soft sm:h-14 sm:w-14">
                <noeud.icone className="h-4 w-4 sm:h-6 sm:w-6" strokeWidth={1.6} aria-hidden />
              </span>
              <span className="text-[0.5rem] font-semibold uppercase tracking-[0.2em] text-ink-500 sm:text-[0.7rem]">
                {noeud.libelle}
              </span>
            </span>
          ))}
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-600 dark:text-brand-400">
          Plateforme d’évaluation RSE intelligente
        </p>

        <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-bold leading-[1.08] text-ink-900 sm:text-5xl lg:text-[3.75rem]">
          Maîtrisez votre performance RSE.
          <br />
          Agissez avec <span className="text-brand-600 dark:text-brand-400">intelligence</span>.
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-600">
          {SMARTEX.produit} unifie référentiel, preuves documentaires et intelligence artificielle multi-agents pour
          évaluer, prioriser et améliorer votre performance RSE.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link to="/inscription" className="btn-vitrine px-8 py-3.5 text-base">
            Démarrer gratuitement
          </Link>
          <Link to="/methodologie" className="btn-vitrine-clair px-8 py-3.5 text-base">
            <PlayCircle className="h-5 w-5 text-brand-600" strokeWidth={1.6} aria-hidden />
            Voir la démo
          </Link>
        </div>

        <dl className="mt-14 grid gap-8 text-left sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-ink-100">
          {BENEFICES.map((benefice, index) => (
            <Revele key={benefice.titre} delai={index * 110}>
              <div className="flex gap-3 lg:px-6">
                <benefice.icone className="mt-0.5 h-8 w-8 shrink-0 text-brand-600 dark:text-brand-400" strokeWidth={1.5} aria-hidden />
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
          className="mt-12 inline-flex flex-col items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-brand-600 transition hover:text-brand-700 dark:text-brand-400"
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
