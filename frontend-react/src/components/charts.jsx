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

/*
 * Palette des graphiques, verifiee plutot que choisie a l'oeil.
 *
 * Les six teintes categorielles passent les controles de separation pour
 * les trois formes de daltonisme : ecart minimal de 13,8 en protanopie,
 * 28,8 en vision normale (OKLab x100), contraste superieur a 3:1 sur la
 * surface claire.
 *
 * L'ancienne palette echouait ce controle. Le rouge #e11d48 et le vert
 * #059669 n'y etaient separes que de 5,8 en deuteranopie — soit
 * indistinguables — alors qu'ils portaient « risque eleve » et « risque
 * faible » dans la repartition des risques du tableau de bord. Le vert de
 * conformite devient donc un teal, et le rouge un rose profond.
 *
 * `brand` suit la charte Pantone : le bordeaux #921f18 etait le dernier
 * reste de l'ancienne identite dans les graphiques.
 */
export const COULEURS = {
  brand: '#61752a',
  brandClair: 'rgba(97, 117, 42, 0.18)',
  bleu: '#2563eb',
  bleuClair: 'rgba(37, 99, 235, 0.18)',
  ambre: '#ea580c',
  vert: '#0d9488',
  rouge: '#9f1239',
  violet: '#7c3aed',
  gris: '#94a3b8',
};

/*
 * Les trois etats de risque, en clair et en sombre.
 *
 * Deux jeux distincts, et non un jeu unique eclairci : la bande de
 * clarte acceptable sur fond sombre est plus etroite (L 0,48–0,67 contre
 * 0,43–0,77), et le rose profond du mode clair y tombe trop bas. Chaque
 * jeu a ete verifie contre sa propre surface.
 *
 * Le gris de « non evalue » ne fait pas partie de la palette : c'est une
 * absence de donnee, volontairement desaturee, et il n'a pas a tenir le
 * plancher de saturation des teintes qui portent un sens.
 */
const RISQUES_CLAIR = { eleve: '#9f1239', moyen: '#ea580c', faible: '#0d9488', nonEvalue: '#94a3b8' };
const RISQUES_SOMBRE = { eleve: '#e0435f', moyen: '#b8860b', faible: '#0fa896', nonEvalue: '#64748b' };

/** Les couleurs de risque du theme actif. */
export function useCouleursRisque() {
  const { estSombre } = useTheme();
  return estSombre ? RISQUES_SOMBRE : RISQUES_CLAIR;
}

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
