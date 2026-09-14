import { useState } from 'react';

/*
 * Roue de Deming (PDCA), dessinée en SVG plutôt qu'importée en image.
 *
 * L'illustration matricielle utilisée jusqu'ici portait son propre titre
 * incrusté, ne suivait pas la palette du site et se pixellisait dès qu'on
 * l'agrandissait. Ici la géométrie est calculée et le tracé reste net à toutes
 * les tailles, sans dépendance ajoutée.
 *
 * Les aplats sont écrits en dur plutôt que pris aux jetons du thème : une
 * surface qui porte du texte blanc doit garder le même contraste en clair
 * comme en sombre, alors que `marine` et consorts s'éclaircissent avec le
 * thème — même raison que la couleur figée du panneau de marque dans
 * index.css. Les teintes restent celles de la palette du projet (bordeaux
 * `brand`, marine) et non le rouge et le bleu vifs de la maquette.
 */

const CENTRE = 200;
const RAYON_EXT = 150;
const RAYON_INT = 64;
const RAYON_FLECHE = RAYON_EXT + 26;

/*
 * Icône, code et libellé s'empilent verticalement autour d'un point unique posé
 * au milieu de la couronne. Les échelonner le long du rayon paraissait logique
 * mais les faisait se chevaucher : dans un quadrant diagonal, la direction du
 * centre est oblique alors que le texte, lui, reste horizontal.
 */
const RAYON_ANCRE = (RAYON_EXT + RAYON_INT) / 2;

/*
 * Angles en degrés, dans le repère SVG : 0° à l'est, sens horaire (l'axe des
 * ordonnées descend). Chaque temps occupe un quadrant, séparé des voisins par
 * un large jeu qui dessine la croix blanche de la maquette.
 */
const TEMPS = [
  {
    code: 'Plan',
    libelle: ['Planifier'],
    numero: '01',
    debut: 186,
    fin: 264,
    couleur: '#921f18',
    texte: 'Cadrer le périmètre, les critères applicables et les objectifs de la mission.',
    // Feuille de route : un document.
    icone: 'M -9 -12 H 3 L 9 -6 V 12 H -9 Z M -4 -3 H 4 M -4 2 H 4 M -4 7 H 1',
  },
  {
    code: 'Do',
    libelle: ['Mettre en', 'œuvre'],
    numero: '02',
    debut: 276,
    fin: 354,
    couleur: '#1a2a63',
    texte: 'Collecter les preuves documentaires et lancer l’évaluation.',
    // Mise en œuvre : un engrenage.
    icone:
      'M -3 -12 H 3 L 4 -8 L 7 -7 L 10 -9 L 14 -5 L 12 -2 V 2 L 14 5 L 10 9 L 7 7 L 4 8 L 3 12 H -3 L -4 8 L -7 7 L -10 9 L -14 5 L -12 2 V -2 L -14 -5 L -10 -9 L -7 -7 L -4 -8 Z M 0 -4.5 A 4.5 4.5 0 1 0 0.01 -4.5',
  },
  {
    code: 'Check',
    libelle: ['Évaluer'],
    numero: '03',
    debut: 6,
    fin: 84,
    couleur: '#047857',
    texte: 'Mesurer les écarts, les non-conformités et le degré de maturité atteint.',
    // Mesure : un histogramme.
    icone: 'M -11 12 V 2 H -5 V 12 Z M -3 12 V -6 H 3 V 12 Z M 5 12 V -12 H 11 V 12 Z',
  },
  {
    code: 'Act',
    libelle: ['Agir'],
    numero: '04',
    debut: 96,
    fin: 174,
    couleur: '#c2410c',
    texte: 'Corriger, capitaliser les bonnes pratiques, puis repartir sur un cycle mieux informé.',
    // Reprise du cycle : deux flèches en boucle.
    icone:
      'M -11 -1 A 11 11 0 0 1 6 -9 M 6 -9 L -0.5 -10.5 M 6 -9 L 4.5 -2.5 M 11 1 A 11 11 0 0 1 -6 9 M -6 9 L 0.5 10.5 M -6 9 L -4.5 2.5',
  },
];

const enRadians = (degres) => (degres * Math.PI) / 180;
const point = (degres, rayon) => [
  CENTRE + rayon * Math.cos(enRadians(degres)),
  CENTRE + rayon * Math.sin(enRadians(degres)),
];

/** Tracé d'un secteur d'anneau, du rayon intérieur au rayon extérieur. */
function cheminSegment(debut, fin) {
  const [xe0, ye0] = point(debut, RAYON_EXT);
  const [xe1, ye1] = point(fin, RAYON_EXT);
  const [xi1, yi1] = point(fin, RAYON_INT);
  const [xi0, yi0] = point(debut, RAYON_INT);
  return [
    `M ${xe0.toFixed(2)} ${ye0.toFixed(2)}`,
    `A ${RAYON_EXT} ${RAYON_EXT} 0 0 1 ${xe1.toFixed(2)} ${ye1.toFixed(2)}`,
    `L ${xi1.toFixed(2)} ${yi1.toFixed(2)}`,
    `A ${RAYON_INT} ${RAYON_INT} 0 0 0 ${xi0.toFixed(2)} ${yi0.toFixed(2)}`,
    'Z',
  ].join(' ');
}

/** Arc extérieur, posé à cheval sur la jonction entre deux temps. */
function cheminFleche(fin) {
  const [x0, y0] = point(fin - 34, RAYON_FLECHE);
  const [x1, y1] = point(fin + 24, RAYON_FLECHE);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${RAYON_FLECHE} ${RAYON_FLECHE} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/**
 * La roue seule, sans les fiches.
 *
 * `actif` éclaire un temps et met les autres en retrait ; `surSurvol` remonte
 * le temps pointé à la composition, pour qu'elle éclaire la fiche jumelle.
 */
export function Roue({ className, actif = null, surSurvol }) {
  return (
    <svg viewBox="0 0 400 400" role="img" aria-labelledby="roue-deming-titre" className={className}>
      <title id="roue-deming-titre">
        Roue de Deming : Plan (planifier), Do (mettre en œuvre), Check (évaluer), Act (agir), autour de
        l’amélioration continue.
      </title>

      <circle cx={CENTRE} cy={CENTRE} r={RAYON_EXT + 42} className="fill-ink-50/70 dark:fill-ink-100/25" />

      {TEMPS.map((temps) => {
        const milieu = (temps.debut + temps.fin) / 2;
        const [ancreX, ancreY] = point(milieu, RAYON_ANCRE);
        const [xPointe, yPointe] = point(temps.fin + 24, RAYON_FLECHE);

        return (
          <g
            key={temps.code}
            className="roue-temps"
            data-actif={actif === temps.code ? '' : undefined}
            onMouseEnter={surSurvol ? () => surSurvol(temps.code) : undefined}
            onMouseLeave={surSurvol ? () => surSurvol(null) : undefined}
          >
            {/* Contour de même couleur, joint arrondi : c'est ce qui adoucit
                les angles du secteur, un `rx` n'existant pas sur un chemin. */}
            <path
              d={cheminSegment(temps.debut, temps.fin)}
              fill={temps.couleur}
              stroke={temps.couleur}
              strokeWidth="12"
              strokeLinejoin="round"
            />

            <path
              d={temps.icone}
              transform={`translate(${ancreX.toFixed(2)} ${(ancreY - 26).toFixed(2)}) scale(0.85)`}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <text
              x={ancreX}
              y={ancreY + 8}
              textAnchor="middle"
              className="font-display text-[22px] font-extrabold"
              fill="#ffffff"
            >
              {temps.code}
            </text>
            {temps.libelle.map((ligne, rang) => {
              return (
                <text
                  key={ligne}
                  x={ancreX}
                  y={ancreY + 24 + rang * 12}
                  textAnchor="middle"
                  className="text-[11.5px] font-medium"
                  fill="#ffffff"
                  fillOpacity="0.85"
                >
                  {ligne}
                </text>
              );
            })}

            {/* Arc extérieur : c'est lui qui dit que le cycle tourne. Il porte
                la couleur du temps qu'il quitte et pointe vers le suivant. */}
            <path
              d={cheminFleche(temps.fin)}
              fill="none"
              stroke={temps.couleur}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              d="M -7 -6 L 6 0 L -7 6 Z"
              transform={`translate(${xPointe.toFixed(2)} ${yPointe.toFixed(2)}) rotate(${temps.fin + 114})`}
              fill={temps.couleur}
            />
          </g>
        );
      })}

      {/* Moyeu : le mot qui justifie la roue. */}
      <circle
        cx={CENTRE}
        cy={CENTRE}
        r={RAYON_INT}
        className="fill-surface stroke-ink-100 dark:stroke-ink-200"
        strokeWidth="1.5"
      />
      <text
        x={CENTRE}
        y={CENTRE - 8}
        textAnchor="middle"
        className="fill-marine font-display text-[12.5px] font-extrabold tracking-[0.04em]"
      >
        AMÉLIORATION
      </text>
      <text
        x={CENTRE}
        y={CENTRE + 9}
        textAnchor="middle"
        className="fill-marine font-display text-[12.5px] font-extrabold tracking-[0.04em]"
      >
        CONTINUE
      </text>
      <line
        x1={CENTRE - 20}
        y1={CENTRE + 25}
        x2={CENTRE + 20}
        y2={CENTRE + 25}
        className="stroke-brand-500"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/*
 * Une fiche d'étape. Plus de carte ni de pastille colorée : un filet de la
 * couleur du quartier, qui sert de légende à la roue, puis le numéro, le nom
 * et le texte. Les quatre fiches sont identiques, y compris celles de gauche.
 */
function Fiche({ temps, actif, surSurvol }) {
  return (
    <div
      className="fiche-temps border-t-2 pt-4"
      style={{ borderTopColor: temps.couleur }}
      data-actif={actif ? '' : undefined}
      onMouseEnter={() => surSurvol(temps.code)}
      onMouseLeave={() => surSurvol(null)}
    >
      <p className="flex items-baseline gap-3">
        <span className="text-sm font-medium tabular-nums text-ink-400">{temps.numero}</span>
        <span className="font-display text-xl font-bold text-ink-900">{temps.code}</span>
        <span className="text-[15px] text-ink-500">{temps.libelle.join(' ')}</span>
      </p>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{temps.texte}</p>
    </div>
  );
}

/**
 * Composition complète : la roue encadrée des quatre fiches d'étape.
 *
 * Les fiches sont posées dans l'ordre 01→04 dans le DOM et placées ensuite à
 * la grille : sur téléphone elles se lisent donc dans l'ordre du cycle, alors
 * qu'une colonne de gauche suivie d'une colonne de droite aurait donné
 * 01, 04, 02, 03.
 *
 * Pointer une fiche éclaire son quartier, pointer un quartier éclaire sa
 * fiche : le lien entre le texte et le dessin se voit au lieu de se deviner.
 * Toute l'information reste lisible sans ce survol, d'où l'absence d'équivalent
 * clavier — il n'y a rien à atteindre qui ne soit déjà affiché.
 */
export default function RoueDeming({ className }) {
  const [plan, faire, verifier, agir] = TEMPS;
  const [actif, definirActif] = useState(null);

  return (
    <div
      data-temps-actif={actif ?? undefined}
      className={`grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:grid-rows-2 lg:gap-x-8 lg:gap-y-6 ${
        className ?? ''
      }`}
    >
      <Roue
        actif={actif}
        surSurvol={definirActif}
        className="mx-auto h-auto w-full max-w-[23rem] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:w-[23rem]"
      />

      <div className="lg:col-start-1 lg:row-start-1">
        <Fiche temps={plan} actif={actif === plan.code} surSurvol={definirActif} />
      </div>
      <div className="lg:col-start-3 lg:row-start-1">
        <Fiche temps={faire} actif={actif === faire.code} surSurvol={definirActif} />
      </div>
      <div className="lg:col-start-3 lg:row-start-2">
        <Fiche temps={verifier} actif={actif === verifier.code} surSurvol={definirActif} />
      </div>
      <div className="lg:col-start-1 lg:row-start-2">
        <Fiche temps={agir} actif={actif === agir.code} surSurvol={definirActif} />
      </div>
    </div>
  );
}
