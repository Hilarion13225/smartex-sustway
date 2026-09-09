import {
  Bell,
  FileText,
  FolderOpen,
  Gauge,
  LayoutDashboard,
  ListChecks,
  Target,
  ClipboardList,
} from 'lucide-react';

/*
 * Aperçu du produit affiché dans le héros de la page d'accueil.
 *
 * Dessiné en HTML/CSS plutôt que posé en capture d'écran : l'image reste nette
 * à toute densité d'affichage, suit le thème clair/sombre, ne pèse rien au
 * chargement, et les chiffres se mettent à jour en éditant ce fichier plutôt
 * qu'en refaisant une capture. Les valeurs sont illustratives — c'est une
 * vitrine, pas une lecture de l'API.
 */

const NAVIGATION = [
  { icone: LayoutDashboard, libelle: 'Tableau de bord', actif: true },
  { icone: ClipboardList, libelle: 'Missions' },
  { icone: FileText, libelle: 'Questionnaires' },
  { icone: FolderOpen, libelle: 'Documents' },
  { icone: Gauge, libelle: 'Résultats' },
  { icone: Target, libelle: 'Plan d’action' },
  { icone: ListChecks, libelle: 'Rapports' },
];

const DOMAINES = [
  { libelle: 'Gouvernance', valeur: 78, couleur: 'bg-emerald-500' },
  { libelle: 'Social', valeur: 65, couleur: 'bg-amber-500' },
  { libelle: 'Environnement', valeur: 70, couleur: 'bg-violet-500' },
  { libelle: 'Éthique', valeur: 62, couleur: 'bg-emerald-500' },
  { libelle: 'Achats responsables', valeur: 56, couleur: 'bg-amber-500' },
  { libelle: 'Engagement sociétal', valeur: 68, couleur: 'bg-emerald-500' },
];

const EVOLUTION = [
  { annee: '2022', valeur: 45 },
  { annee: '2023', valeur: 50 },
  { annee: '2024', valeur: 72 },
];

/** Anneau de progression du score global. */
function Anneau({ valeur }) {
  const rayon = 26;
  const perimetre = 2 * Math.PI * rayon;
  return (
    <div className="relative h-[68px] w-[68px]">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={rayon} fill="none" strokeWidth="7" className="stroke-ink-100" />
        <circle
          cx="32"
          cy="32"
          r={rayon}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          className="stroke-emerald-500"
          strokeDasharray={perimetre}
          strokeDashoffset={perimetre * (1 - valeur / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-ink-900">
        {valeur}%
      </span>
    </div>
  );
}

/** Courbe d'évolution du score, tracée à la main : trois points suffisent. */
function Courbe() {
  const points = EVOLUTION.map((point, index) => {
    const x = 8 + index * 42;
    const y = 46 - (point.valeur / 100) * 34;
    return { ...point, x, y };
  });

  return (
    <div>
      <svg viewBox="0 0 100 52" className="h-[52px] w-full" aria-hidden>
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-emerald-500"
        />
        {points.map((p) => (
          <circle key={p.annee} cx={p.x} cy={p.y} r="2.6" className="fill-emerald-500" />
        ))}
        <text x={points[2].x - 6} y={points[2].y - 6} className="fill-emerald-600 text-[7px] font-semibold">
          72%
        </text>
      </svg>
      <div className="flex justify-between text-[7px] text-ink-400">
        {EVOLUTION.map((point) => (
          <span key={point.annee}>
            {point.valeur}% {point.annee}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Vignette de statistique du bandeau supérieur. */
function Vignette({ libelle, valeur, detail, children }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-surface p-2.5">
      <p className="text-[8px] font-medium text-ink-500">{libelle}</p>
      {children ?? (
        <>
          <p className="mt-1 text-lg font-bold leading-none text-ink-900">{valeur}</p>
          <p className="mt-1 text-[8px] text-ink-400">{detail}</p>
        </>
      )}
    </div>
  );
}

export default function MaquetteTableauBord() {
  return (
    <div className="w-full">
      {/* Écran */}
      <div className="rounded-t-2xl border-x border-t border-ink-200 bg-ink-100 p-2.5 pb-0 dark:bg-ink-200/40">
        <div className="overflow-hidden rounded-t-lg border border-ink-100 bg-ink-50">
          <div className="flex">
            {/* Barre latérale */}
            <aside className="hidden w-[92px] shrink-0 border-r border-ink-100 bg-surface p-2 sm:block">
              <p className="px-1 text-[9px] font-extrabold leading-tight text-ink-900">
                SMARTEX
                <span className="block text-brand-600">SustWay</span>
              </p>
              <ul className="mt-3 space-y-0.5">
                {NAVIGATION.map((entree) => (
                  <li
                    key={entree.libelle}
                    className={
                      entree.actif
                        ? 'flex items-center gap-1.5 rounded-md bg-brand-50 px-1.5 py-1 text-[8px] font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                        : 'flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[8px] text-ink-500'
                    }
                  >
                    <entree.icone className="h-2.5 w-2.5 shrink-0" aria-hidden />
                    <span className="truncate">{entree.libelle}</span>
                  </li>
                ))}
              </ul>
            </aside>

            {/* Contenu */}
            <div className="min-w-0 flex-1 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold text-ink-900">Vue d’ensemble</p>
                  <p className="text-[8px] text-ink-400">Année 2024</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Bell className="h-2.5 w-2.5 text-ink-400" aria-hidden />
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[7px] font-bold text-white">
                    YK
                  </span>
                  <div className="hidden leading-tight sm:block">
                    <p className="text-[8px] font-semibold text-ink-900">Yao Konan</p>
                    <p className="text-[7px] text-ink-400">Entreprise ABC</p>
                  </div>
                </div>
              </div>

              <div className="mt-2.5 grid grid-cols-3 gap-2">
                <Vignette libelle="Score de maturité">
                  <div className="mt-1 flex items-center gap-1.5">
                    <Anneau valeur={72} />
                    <span className="text-[8px] font-medium text-emerald-600">
                      Niveau
                      <br />
                      Avancé
                    </span>
                  </div>
                </Vignette>
                <Vignette libelle="Domaines évalués" valeur="6 / 6" detail="Complétés" />
                <Vignette libelle="Actions prioritaires" valeur="12" detail="À traiter" />
              </div>

              <div className="mt-2 grid grid-cols-[1.35fr_1fr] gap-2">
                <div className="rounded-lg border border-ink-100 bg-surface p-2.5">
                  <p className="text-[8px] font-semibold text-ink-900">Performance par domaine</p>
                  <ul className="mt-1.5 space-y-1">
                    {DOMAINES.map((domaine) => (
                      <li key={domaine.libelle} className="flex items-center gap-1.5">
                        <span className="w-[54px] shrink-0 truncate text-[7px] text-ink-500">{domaine.libelle}</span>
                        <span className="h-1 flex-1 overflow-hidden rounded-full bg-ink-100">
                          <span
                            className={`block h-full rounded-full ${domaine.couleur} motion-safe:animate-trace-jauge`}
                            style={{ width: `${domaine.valeur}%` }}
                          />
                        </span>
                        <span className="w-[18px] shrink-0 text-right text-[7px] font-semibold text-ink-600">
                          {domaine.valeur}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border border-ink-100 bg-surface p-2.5">
                  <p className="text-[8px] font-semibold text-ink-900">Évolution de la maturité</p>
                  <div className="mt-1">
                    <Courbe />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Socle, volontairement plus large que l'écran comme sur un portable */}
      <div className="relative -mx-[3.5%] h-3 rounded-b-xl bg-gradient-to-b from-ink-200 to-ink-300">
        <span className="absolute left-1/2 top-0 h-[3px] w-14 -translate-x-1/2 rounded-b-full bg-ink-400/50" aria-hidden />
      </div>
    </div>
  );
}
