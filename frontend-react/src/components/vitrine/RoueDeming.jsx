/*
 * Roue de Deming (PDCA), dessinée en SVG plutôt qu'importée en image.
 *
 * L'illustration matricielle utilisée jusqu'ici portait son propre titre
 * incrusté, ne suivait pas la palette du site et se pixellisait dès qu'on
 * l'agrandissait. Ici la géométrie est calculée, les couleurs viennent des
 * jetons Tailwind du projet — donc réactives au thème clair/sombre — et le
 * tracé reste net à toutes les tailles, sans dépendance ajoutée.
 */

const CENTRE = 200;
const RAYON_EXT = 158;
const RAYON_INT = 100;
const RAYON_MED = (RAYON_EXT + RAYON_INT) / 2;

/*
 * Angles en degrés, dans le repère SVG : 0° à l'est, sens horaire (l'axe des
 * ordonnées descend). Les quatre temps occupent un quadrant chacun, séparés
 * par un jeu de 8° dans lequel se loge la pointe de flèche.
 *
 * Le bleu du temps « Do » est écrit en dur plutôt que pris au jeton `marine` :
 * celui-ci s'éclaircit en thème sombre, ce qui convient à de la titraille mais
 * transforme l'aplat en lavande pâle sous un texte blanc. Même raison que la
 * couleur figée du panneau de marque dans index.css.
 */
const TEMPS = [
  { code: 'Plan', lignes: ['Planifier'], debut: 184, fin: 266, segment: 'fill-brand-600', fleche: 'fill-[#1A2A63]' },
  {
    code: 'Do',
    // Deux lignes : « Mettre en œuvre » d'un seul tenant sort de l'anneau.
    lignes: ['Mettre en', 'œuvre'],
    debut: 274,
    fin: 356,
    segment: 'fill-[#1A2A63]',
    fleche: 'fill-emerald-600 dark:fill-emerald-500',
  },
  {
    code: 'Check',
    lignes: ['Évaluer'],
    debut: 4,
    fin: 86,
    segment: 'fill-emerald-600 dark:fill-emerald-500',
    fleche: 'fill-amber-500',
  },
  { code: 'Act', lignes: ['Agir'], debut: 94, fin: 176, segment: 'fill-amber-500', fleche: 'fill-brand-600' },
];

const enRadians = (degres) => (degres * Math.PI) / 180;
const point = (degres, rayon) => [
  CENTRE + rayon * Math.cos(enRadians(degres)),
  CENTRE + rayon * Math.sin(enRadians(degres)),
];

/** Tracé d'un segment d'anneau, du rayon intérieur au rayon extérieur. */
function cheminSegment(debut, fin) {
  const [xe0, ye0] = point(debut, RAYON_EXT);
  const [xe1, ye1] = point(fin, RAYON_EXT);
  const [xi1, yi1] = point(fin, RAYON_INT);
  const [xi0, yi0] = point(debut, RAYON_INT);
  const grandArc = fin - debut > 180 ? 1 : 0;
  return [
    `M ${xe0.toFixed(2)} ${ye0.toFixed(2)}`,
    `A ${RAYON_EXT} ${RAYON_EXT} 0 ${grandArc} 1 ${xe1.toFixed(2)} ${ye1.toFixed(2)}`,
    `L ${xi1.toFixed(2)} ${yi1.toFixed(2)}`,
    `A ${RAYON_INT} ${RAYON_INT} 0 ${grandArc} 0 ${xi0.toFixed(2)} ${yi0.toFixed(2)}`,
    'Z',
  ].join(' ');
}

/**
 * Roue PDCA. `titre` alimente le `<title>` du SVG, lu par les lecteurs
 * d'écran à la place du dessin.
 */
export default function RoueDeming({ className }) {
  return (
    <svg viewBox="0 0 400 400" role="img" aria-labelledby="roue-deming-titre" className={className}>
      <title id="roue-deming-titre">
        Roue de Deming : Plan (planifier), Do (mettre en œuvre), Check (évaluer), Act (agir), autour de
        l’amélioration continue.
      </title>

      {/* Cercle de fond, très discret : il ferme la composition sans se voir. */}
      <circle cx={CENTRE} cy={CENTRE} r={RAYON_EXT + 14} className="fill-ink-50 dark:fill-ink-100/40" />

      {TEMPS.map((temps) => {
        const milieu = (temps.debut + temps.fin) / 2;
        const [xTexte, yTexte] = point(milieu, RAYON_MED);
        // Pointe de flèche posée en fin de segment, orientée dans le sens de
        // rotation : c'est elle qui dit que le cycle tourne.
        const [xFleche, yFleche] = point(temps.fin + 4, RAYON_MED);

        return (
          <g key={temps.code}>
            <path d={cheminSegment(temps.debut, temps.fin)} className={temps.segment} />

            <text
              x={xTexte}
              y={yTexte - (temps.lignes.length > 1 ? 9 : 4)}
              textAnchor="middle"
              className="fill-white font-display text-[19px] font-extrabold"
            >
              {temps.code}
            </text>
            {temps.lignes.map((ligne, rang) => (
              <text
                key={ligne}
                x={xTexte}
                y={yTexte + (temps.lignes.length > 1 ? 8 : 14) + rang * 12}
                textAnchor="middle"
                className="fill-white/85 text-[10.5px] font-medium"
              >
                {ligne}
              </text>
            ))}

            {/* La pointe prend la couleur du temps qui suit : c'est ce qui la
                fait lire comme un enchaînement plutôt que comme un repère. */}
            <path
              d="M -7 -6 L 7 0 L -7 6 Z"
              transform={`translate(${xFleche.toFixed(2)} ${yFleche.toFixed(2)}) rotate(${temps.fin + 94})`}
              className={temps.fleche}
            />
          </g>
        );
      })}

      {/* Moyeu : le mot qui justifie la roue. */}
      <circle
        cx={CENTRE}
        cy={CENTRE}
        r={RAYON_INT - 12}
        className="fill-surface stroke-ink-100 dark:stroke-ink-200"
        strokeWidth="1.5"
      />
      <text
        x={CENTRE}
        y={CENTRE - 8}
        textAnchor="middle"
        className="fill-marine font-display text-[15px] font-extrabold tracking-[0.06em]"
      >
        AMÉLIORATION
      </text>
      <text
        x={CENTRE}
        y={CENTRE + 12}
        textAnchor="middle"
        className="fill-marine font-display text-[15px] font-extrabold tracking-[0.06em]"
      >
        CONTINUE
      </text>
      <line
        x1={CENTRE - 26}
        y1={CENTRE + 28}
        x2={CENTRE + 26}
        y2={CENTRE + 28}
        className="stroke-brand-500"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
