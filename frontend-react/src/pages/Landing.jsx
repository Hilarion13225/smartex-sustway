import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  Building2,
  ChevronDown,
  ClipboardCheck,
  FileSearch,
  FileText,
  Gauge,
  Leaf,
  LineChart,
  ListTodo,
  Scale,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '../components/ui';
import Revele from '../components/Revele';
import CompteurAnime from '../components/CompteurAnime';
import SectionFormules from '../components/SectionFormules';
import AppelAction from '../components/AppelAction';
import banniereMethodologie from '../assets/methodologie/banniere.jpg';
import { REFERENTIELS_EVALUABLES, SMARTEX } from '../config/smartex';

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

/** Chiffres factuels du référentiel et du pipeline — pas des données de démonstration. */
const CHIFFRES = [
  { libelle: 'Critères évaluables', valeur: 87, icone: ClipboardCheck },
  { libelle: 'Domaines RSE', valeur: 6, icone: Gauge },
  { libelle: 'Agents IA', valeur: 7, icone: Bot },
];

/**
 * Aperçu produit du héros : un critère tel qu'il apparaît après passage du
 * pipeline. Valeurs d'illustration assumées (le héros est une vitrine, pas
 * un écran connecté), volontairement cohérentes entre elles — probabilité
 * élevée, confiance au-dessus du seuil de revue.
 */
const APERCU_CRITERE = {
  code: 'ENV-04',
  intitule: 'Suivi et réduction des consommations énergétiques',
  probabilite: 78,
  confiance: 86,
};

const APERCU_DOMAINES = [
  { nom: 'Gouvernance', score: 72 },
  { nom: 'Social et sociétal', score: 64 },
  { nom: 'Environnement', score: 81 },
  { nom: 'Éthique des affaires', score: 58 },
];

const PROMESSES = [
  {
    icone: Bot,
    titre: 'L’analyse est faite pour vous',
    texte:
      'Sept agents lisent les preuves déposées, les confrontent à vos réponses déclaratives et produisent une probabilité de conformité assortie d’un indice de confiance.',
  },
  {
    icone: ListTodo,
    titre: 'Les priorités sont déjà classées',
    texte:
      'Le risque attendu croise la non-conformité probable et la criticité du critère dans votre secteur : le plan d’actions sort trié, pas à trier.',
  },
  {
    icone: Leaf,
    titre: 'Le dossier bailleur est préparé',
    texte:
      'Un indice mesure votre alignement aux standards de performance IFC/SFI et pointe les pièces manquantes — une mesure d’alignement, pas une garantie d’éligibilité.',
  },
];

/**
 * Bénéfices résumés sous le héros — une ligne par promesse, volontairement
 * courte : le détail est développé plus bas dans la page.
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

const ETAPES = [
  {
    icone: Building2,
    titre: 'Décrivez votre entreprise',
    texte: 'Secteur, taille et sites : le questionnaire ne retient que les critères réellement applicables.',
  },
  {
    icone: FileSearch,
    titre: 'Répondez et déposez vos preuves',
    texte: 'Réponse déclarative, scénario textuel et documents à l’appui — un même document peut servir plusieurs critères.',
  },
  {
    icone: Bot,
    titre: 'Laissez l’IA évaluer',
    texte: 'Cohérence réponse/preuve, probabilité de conformité, niveau d’engagement et indice de confiance par critère.',
  },
  {
    icone: LineChart,
    titre: 'Pilotez et rapportez',
    texte: 'Score pondéré, non-conformités priorisées, plan d’actions suivi et rapports exportables.',
  },
];

/**
 * Page d'entrée de la plateforme (URL racine). Rendue dans LayoutPublic
 * comme le reste de la vitrine : en-tête et pied de page communs, thème
 * clair/sombre hérité (tokens `ink`/`surface`). La présentation détaillée
 * de la méthode reste sur /accueil et /methodologie.
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
            <Link to="/connexion" className="btn-vitrine-fantome px-5 py-3">
              Se connecter
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

          <a
            href="#apercu"
            className="mt-12 inline-flex flex-col items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-brand-600 transition hover:text-brand-700 dark:text-brand-400"
          >
            Découvrir
            <ChevronDown className="h-5 w-5 motion-safe:animate-bounce" aria-hidden />
          </a>
        </div>

        {/* Bandeau défilant des référentiels réellement chargés dans la plateforme. */}
        <div className="relative border-y border-ink-100 bg-surface/70 py-4">
          <div className="masque-lateral overflow-hidden">
            <div className="flex w-max gap-3 motion-safe:animate-defilement">
              {[...REFERENTIELS_EVALUABLES, ...REFERENTIELS_EVALUABLES].map((referentiel, index) => (
                <span
                  key={`${referentiel.code}-${index}`}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-ink-100 bg-surface px-4 py-1.5 text-xs font-medium text-ink-600"
                >
                  <Sparkles className="h-3.5 w-3.5 text-brand-500" aria-hidden />
                  {referentiel.nom}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- Aperçu produit */}
      <section id="apercu" className="mx-auto max-w-[90rem] scroll-mt-24 px-5 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <Revele>
            <Badge ton="vert" icone={BadgeCheck}>
              {SMARTEX.accroche} — par {SMARTEX.editeur}
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold text-ink-900">
              Chaque critère porte sa preuve, sa probabilité et sa confiance
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-600">
              {SMARTEX.mission} Le questionnaire est composé pour votre secteur, les preuves sont analysées par l’IA et le
              score reste explicable jusqu’au rapport.
            </p>

            <dl className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {CHIFFRES.map((chiffre, index) => (
                <Revele key={chiffre.libelle} delai={index * 120}>
                  <div className="group rounded-2xl border border-ink-100 bg-surface/80 px-4 py-4 shadow-soft backdrop-blur transition duration-300 hover:border-brand-200 motion-safe:hover:-translate-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-xs uppercase tracking-wide text-ink-500">{chiffre.libelle}</dt>
                      <chiffre.icone
                        className="h-4 w-4 text-brand-500 transition-transform duration-300 group-hover:scale-110"
                        aria-hidden
                      />
                    </div>
                    <dd className="mt-2 text-3xl font-semibold text-brand-700 dark:text-brand-400">
                      <CompteurAnime valeur={chiffre.valeur} />
                    </dd>
                  </div>
                </Revele>
              ))}
            </dl>
          </Revele>

          {/* Aperçu produit : un critère évalué, tel que rendu dans l'espace connecté. */}
          <Revele delai={150}>
            <div className="relative motion-safe:animate-flottement">
              <div className="carte-verre relative overflow-hidden p-6">
                <span
                  className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-brand-400 to-transparent"
                  aria-hidden
                />

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Critère {APERCU_CRITERE.code}</p>
                    <p className="mt-1 text-sm font-semibold text-ink-900">{APERCU_CRITERE.intitule}</p>
                  </div>
                  <Badge ton="vert" icone={ShieldCheck}>
                    Preuve vérifiée
                  </Badge>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-ink-100 bg-surface p-4">
                    <p className="text-xs uppercase tracking-wide text-ink-500">Probabilité de conformité</p>
                    <p className="mt-1 text-3xl font-semibold text-ink-900">
                      <CompteurAnime valeur={APERCU_CRITERE.probabilite} suffixe=" %" />
                    </p>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 motion-safe:animate-trace-jauge"
                        style={{ width: `${APERCU_CRITERE.probabilite}%` }}
                      />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-ink-100 bg-surface p-4">
                    <p className="text-xs uppercase tracking-wide text-ink-500">Indice de confiance</p>
                    <p className="mt-1 text-3xl font-semibold text-ink-900">
                      <CompteurAnime valeur={APERCU_CRITERE.confiance} suffixe=" %" />
                    </p>
                    <p className="mt-3 text-xs leading-relaxed text-ink-500">
                      Au-dessus du seuil : aucune revue manuelle déclenchée.
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-ink-100 bg-surface p-4">
                  <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-500">
                    <Gauge className="h-3.5 w-3.5 text-brand-500" aria-hidden />
                    Score par domaine
                  </p>
                  <ul className="mt-3 space-y-2.5">
                    {APERCU_DOMAINES.map((domaine) => (
                      <li key={domaine.nom} className="flex items-center gap-3">
                        <span className="w-36 shrink-0 truncate text-xs text-ink-600">{domaine.nom}</span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                          <span
                            className="block h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 motion-safe:animate-trace-jauge"
                            style={{ width: `${domaine.score}%` }}
                          />
                        </span>
                        <span className="w-9 shrink-0 text-right text-xs font-semibold text-ink-900">{domaine.score}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Revele>
        </div>
      </section>

      {/* ------------------------------------------------------------ Promesses */}
      <section className="bg-ink-50 py-20">
        <div className="mx-auto max-w-[90rem] px-5">
          <Revele className="max-w-2xl">
            <Badge ton="bleu" icone={Sparkles}>
              Ce que vous obtenez
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold text-ink-900">
              Une évaluation qui s’explique, ligne par ligne
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              Aucune note n’est posée sans justification : la preuve, l’agent qui l’a analysée, la probabilité obtenue et le
              poids du critère restent consultables du dépôt jusqu’au rapport.
            </p>
          </Revele>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {PROMESSES.map((promesse, index) => (
              <Revele key={promesse.titre} delai={index * 120}>
                <article className="carte-vitrine group h-full">
                  <span className="puce-icone">
                    <promesse.icone className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-ink-900">{promesse.titre}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{promesse.texte}</p>
                </article>
              </Revele>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Parcours */}
      <section className="mx-auto max-w-[90rem] px-5 py-20">
        <Revele className="max-w-2xl">
          <Badge ton="ambre" icone={Target}>
            Comment ça se passe
          </Badge>
          <h2 className="mt-4 text-3xl font-semibold text-ink-900">Quatre étapes, du cadrage au rapport</h2>
        </Revele>

        <div className="mt-12 grid gap-6 lg:grid-cols-4">
          {ETAPES.map((etape, index) => (
            <Revele key={etape.titre} delai={index * 130}>
              <article className="carte-vitrine group h-full">
                <div className="flex items-center gap-3">
                  <span className="puce-icone">
                    <etape.icone className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-4xl font-semibold text-ink-100 transition-colors duration-300 group-hover:text-brand-100">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-ink-900">{etape.titre}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{etape.texte}</p>
              </article>
            </Revele>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- Méthodologie */}
      <section className="border-y border-ink-100 bg-ink-50 py-20">
        <div className="mx-auto grid max-w-[90rem] items-center gap-12 px-5 lg:grid-cols-2">
          <Revele>
            <div className="relative overflow-hidden rounded-3xl border border-ink-100 shadow-soft">
              <img
                src={banniereMethodologie}
                alt="Équipe en atelier d’évaluation de la performance durable"
                className="h-[22rem] w-full object-cover transition duration-700 motion-safe:hover:scale-105"
                loading="lazy"
              />
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1f2533]/70 via-transparent" aria-hidden />
            </div>
          </Revele>

          <Revele delai={120}>
            <Badge ton="neutre" icone={BadgeCheck}>
              Méthodologie {SMARTEX.produit}
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold text-ink-900">
              La rigueur d’un cabinet, la constance d’un outil
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-600">
              {SMARTEX.produit} industrialise le référentiel d’évaluation de {SMARTEX.editeur}. {SMARTEX.baseline} L’IA
              prépare, hiérarchise et documente ; vos équipes et nos experts décident. Chaque critère porte une criticité
              propre à votre secteur, et chaque évaluation reste rejouable.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/methodologie" className="btn-vitrine group">
                Découvrir la méthodologie
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </Link>
              <Link to="/accueil" className="btn-vitrine-clair">
                Explorer la plateforme
              </Link>
            </div>
          </Revele>
        </div>
      </section>

      {/* ------------------------------------------------------------ Formules */}
      <SectionFormules
        titre="Choisissez votre formule avant de créer votre compte"
        description="La formule sélectionnée est transmise à la création du compte et active immédiatement les fonctionnalités correspondantes."
      />

      <AppelAction />
    </div>
  );
}
