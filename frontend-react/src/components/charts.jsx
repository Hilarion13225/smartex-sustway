import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line, Radar } from 'react-chartjs-2';
import { useTheme } from '../theme/ThemeContext';
import { formaterScore } from '../lib/scoreAffiche';

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  RadialLinearScale,
  Tooltip
);

export const COULEURS = {
  brand: '#921f18',
  brandClair: 'rgba(146, 31, 24, 0.18)',
  bleu: '#2563eb',
  bleuClair: 'rgba(37, 99, 235, 0.18)',
  ambre: '#d97706',
  vert: '#059669',
  rouge: '#e11d48',
  violet: '#7c3aed',
  gris: '#94a3b8',
};

/**
 * Infobulle d'une série déclarée `format: 'score'` (V74-C3-B5) : le score sur 5
 * s'y lit comme partout ailleurs — deux décimales, HALF_UP, point décimal —
 * et non avec le formatage par défaut de Chart.js (locale du navigateur, trois
 * décimales). Seul le texte change : le graphique garde la valeur brute.
 *
 * Toute autre série (effectifs, pourcentages) reçoit `undefined`, ce qui laisse
 * Chart.js produire son libellé habituel. Le format se déclare série par série
 * parce qu'un même composant porte des unités différentes selon l'écran.
 */
function libelleInfobulle(contexte) {
  if (contexte.dataset.formatInfobulle !== 'score') return undefined;
  const valeur = formaterScore(contexte.raw);
  return contexte.dataset.label ? `${contexte.dataset.label}: ${valeur}` : valeur;
}

const INFOBULLE = { callbacks: { label: libelleInfobulle } };

/**
 * Chart.js dessine sur un <canvas> : les couleurs sont des valeurs passées à
 * l'API JS, pas des classes CSS — `dark:` n'a donc aucune prise ici. Chaque
 * graphique lit le thème actif via useTheme() et recalcule ses couleurs de
 * grille/texte/légende en conséquence (les couleurs des séries elles-mêmes,
 * COULEURS ci-dessus, restent vives dans les deux thèmes, comme un badge de
 * couleur reste identifiable quel que soit le fond).
 */
function useOptionsCommunes() {
  const { estSombre } = useTheme();
  const texte = estSombre ? '#a8b1c5' : '#4d5a74';
  const grille = estSombre ? 'rgba(255, 255, 255, 0.08)' : '#eceef2';
  return {
    texte,
    grille,
    communes: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { boxWidth: 10, font: { size: 11 }, color: texte } },
      },
    },
  };
}

export function GraphiqueBarres({ labels, series, horizontal = false, max }) {
  const { communes, texte, grille } = useOptionsCommunes();
  return (
    <Bar
      data={{
        labels,
        datasets: series.map((serie) => ({
          label: serie.label,
          data: serie.data,
          backgroundColor: serie.couleur,
          borderRadius: 6,
          maxBarThickness: 34,
          formatInfobulle: serie.format,
        })),
      }}
      options={{
        ...communes,
        plugins: { ...communes.plugins, tooltip: INFOBULLE },
        indexAxis: horizontal ? 'y' : 'x',
        scales: {
          x: {
            grid: { display: horizontal, color: grille },
            ticks: { font: { size: 11 }, color: texte },
            max: horizontal ? max : undefined,
          },
          y: {
            grid: { color: grille },
            ticks: { font: { size: 11 }, color: texte },
            max: horizontal ? undefined : max,
            beginAtZero: true,
          },
        },
      }}
    />
  );
}

export function GraphiqueRadar({ labels, series }) {
  const { communes, texte, grille } = useOptionsCommunes();
  return (
    <Radar
      data={{
        labels,
        datasets: series.map((serie) => ({
          label: serie.label,
          data: serie.data,
          borderColor: serie.couleur,
          backgroundColor: serie.fond,
          pointBackgroundColor: serie.couleur,
          borderWidth: 2,
          formatInfobulle: serie.format,
        })),
      }}
      options={{
        ...communes,
        plugins: { ...communes.plugins, tooltip: INFOBULLE },
        scales: {
          r: {
            suggestedMin: 0,
            suggestedMax: 5,
            angleLines: { color: grille },
            grid: { color: grille },
            pointLabels: { font: { size: 10 }, color: texte },
            ticks: { stepSize: 1, font: { size: 9 }, color: texte, backdropColor: 'transparent' },
          },
        },
      }}
    />
  );
}

/**
 * `pointille` marque une série de référence (ex. moyenne sectorielle,
 * jamais mesurée directement) plutôt qu'une trajectoire réelle — même
 * distinction visuelle que "cible interne" dans les maquettes de
 * référence, mais nommée génériquement puisque réutilisée pour tout repère.
 */
export function GraphiqueLigne({ labels, series }) {
  const { communes, texte, grille } = useOptionsCommunes();
  return (
    <Line
      data={{
        labels,
        datasets: series.map((serie) => ({
          label: serie.label,
          data: serie.data,
          borderColor: serie.couleur,
          backgroundColor: serie.couleur,
          borderDash: serie.pointille ? [6, 4] : undefined,
          borderWidth: 2,
          pointRadius: 3,
          spanGaps: true,
          tension: 0.25,
          formatInfobulle: serie.format,
        })),
      }}
      options={{
        ...communes,
        plugins: { ...communes.plugins, tooltip: INFOBULLE },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 }, color: texte } },
          y: {
            grid: { color: grille },
            ticks: { font: { size: 11 }, color: texte },
            suggestedMin: 0,
            suggestedMax: 5,
          },
        },
      }}
    />
  );
}

export function GraphiqueAnneau({ labels, data, couleurs, legende = true }) {
  const { communes, texte } = useOptionsCommunes();
  return (
    <Doughnut
      data={{ labels, datasets: [{ data, backgroundColor: couleurs, borderWidth: 0, hoverOffset: 6 }] }}
      options={{
        ...communes,
        cutout: '62%',
        // Une jauge compacte affiche sa valeur en son centre : la légende y
        // viendrait la recouvrir.
        plugins: {
          legend: legende
            ? { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 }, color: texte } }
            : { display: false },
        },
      }}
    />
  );
}
