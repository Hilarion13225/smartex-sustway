import { BarChart3, ClipboardCheck, FileText, Scale } from 'lucide-react';

/**
 * Emblème de la marque : sphère de données, jauge de conformité, bouclier et
 * les quatre natures d'objets que manipule le moteur.
 *
 * Il vivait dans la page d'entrée, seul endroit qui l'affichait. La page
 * d'accueil le reprend désormais : recopié, ce dessin de cent soixante-dix
 * lignes aurait fini par diverger entre les deux, et une retouche de la
 * marque n'aurait porté que sur l'une.
 *
 * `largeur` est passée en classes plutôt que fixée ici : la page d'entrée lui
 * donne toute la place, le héros de l'accueil le veut assez compact pour
 * tenir au-dessus du titre sans pousser les boutons hors de la fenêtre.
 *
 * `compact` réduit les quatre pastilles et leurs libellés, qui ne sont pas
 * dans le tracé et ne suivent donc pas l'échelle du `viewBox`. Leurs tailles
 * répondent à la largeur de l'écran, pas à celle de l'emblème : sur un grand
 * écran, des pastilles de 56 px autour d'un emblème réduit à 280 px
 * l'écrasaient au lieu de l'entourer.
 *
 * `aria-hidden` sur le tracé : c'est une illustration. Les quatre libellés qui
 * l'entourent — Documents, Preuves, Conformité, Scoring — sont du vrai texte
 * et restent lus.
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

const CHEMIN_BOUCLIER = 'M64 6 L120 30 V74 C120 111 96 133 64 143 C32 133 8 111 8 74 V30 Z';

export default function Embleme({ largeur = 'max-w-xs sm:max-w-xl lg:max-w-3xl', compact = false }) {
  return (
      <div className={`relative mx-auto aspect-[640/420] w-full motion-safe:animate-apparition-douce ${largeur}`}>
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
              className={`flex items-center justify-center rounded-full border border-brand-300 bg-surface text-brand-600 shadow-soft motion-safe:animate-flottement dark:border-brand-500/60 dark:text-brand-400 ${
                compact ? 'h-6 w-6 sm:h-7 sm:w-7' : 'h-7 w-7 sm:h-10 sm:w-10 lg:h-14 lg:w-14'
              }`}
              style={{ animationDelay: `${index * 900}ms` }}
            >
              <noeud.icone
                className={compact ? 'h-3 w-3 sm:h-3.5 sm:w-3.5' : 'h-3 w-3 sm:h-4 sm:w-4 lg:h-6 lg:w-6'}
                strokeWidth={1.6}
                aria-hidden
              />
            </span>
            <span
              className={`font-semibold uppercase text-ink-500 ${
                compact
                  ? 'text-[0.4rem] tracking-[0.12em] sm:text-[0.45rem]'
                  : 'text-[0.45rem] tracking-[0.15em] sm:text-[0.7rem] sm:tracking-[0.2em]'
              }`}
            >
              {noeud.libelle}
            </span>
          </span>
        ))}
      </div>
  );
}
