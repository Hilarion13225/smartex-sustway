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
  brand: '#128257',
  brandClair: 'rgba(18, 130, 87, 0.18)',
  bleu: '#2563eb',
  bleuClair: 'rgba(37, 99, 235, 0.18)',
  ambre: '#d97706',
  rouge: '#e11d48',
  violet: '#7c3aed',
  gris: '#94a3b8',
};

const communes = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { boxWidth: 10, font: { size: 11 } } },
  },
};

export function GraphiqueBarres({ labels, series, horizontal = false, max }) {
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
        })),
      }}
      options={{
        ...communes,
        indexAxis: horizontal ? 'y' : 'x',
        scales: {
          x: { grid: { display: horizontal }, ticks: { font: { size: 11 } }, max: horizontal ? max : undefined },
          y: { grid: { color: '#eceef2' }, ticks: { font: { size: 11 } }, max: horizontal ? undefined : max, beginAtZero: true },
        },
      }}
    />
  );
}

export function GraphiqueRadar({ labels, series }) {
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
        })),
      }}
      options={{
        ...communes,
        scales: {
          r: {
            suggestedMin: 0,
            suggestedMax: 5,
            angleLines: { color: '#eceef2' },
            grid: { color: '#eceef2' },
            pointLabels: { font: { size: 10 } },
            ticks: { stepSize: 1, font: { size: 9 } },
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
        })),
      }}
      options={{
        ...communes,
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { grid: { color: '#eceef2' }, ticks: { font: { size: 11 } }, suggestedMin: 0, suggestedMax: 5 },
        },
      }}
    />
  );
}

export function GraphiqueAnneau({ labels, data, couleurs }) {
  return (
    <Doughnut
      data={{ labels, datasets: [{ data, backgroundColor: couleurs, borderWidth: 0, hoverOffset: 6 }] }}
      options={{
        ...communes,
        cutout: '62%',
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
      }}
    />
  );
}
