import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ClipboardCheck,
  Layers,
  Leaf,
  PlayCircle,
  Target,
  TrendingUp,
} from 'lucide-react';
import Revele from '../components/Revele';
import FondTech from '../components/FondTech';
import Embleme from '../components/Embleme';
import ModaleVideo from '../components/ModaleVideo';
import { useSombreForce } from '../theme/ThemeContext';
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
    texte: 'Visibilité continue, Profil RSE et ESG non figé',
  },
  {
    icone: Leaf,
    titre: 'Préparer votre éligibilité aux financements verts et éthique',
    texte: 'Indice de préparation aux standards des PTF.',
  },
];

/**
 * Noeuds de l'emblème, dans le repère du SVG (640 × 420) : `x`/`y` place la
 * pastille, `ancre` le point de raccordement sur la sphère.
 */

/**
 * Page d'entrée de la plateforme (URL racine). Volontairement réduite au seul
 * héros : la présentation détaillée vit sur /accueil, /methodologie et
 * /formules. Rendue dans LayoutPublic, qui masque le pied de page sur cette
 * route. Le thème sombre y est imposé — le décor « tech » (maillage émeraude,
 * impulsions) est conçu pour un fond sombre — et la bascule de thème est
 * masquée le temps de la visite ; la préférence de l'utilisateur est
 * conservée et reprend effet dès qu'il quitte la page.
 */
export default function Landing() {
  useSombreForce();
  const [videoOuverte, definirVideoOuverte] = useState(false);

  return (
    <section className="relative overflow-hidden">
      <FondTech />

      <div className="relative mx-auto max-w-[90rem] px-4 pb-8 pt-6 text-center sm:px-5 sm:pb-12 sm:pt-8">
        <Embleme />

        <h1
          className="mx-auto mt-4 max-w-4xl text-[1.65rem] font-bold leading-[1.15] text-ink-900 motion-safe:animate-apparition-bas sm:text-4xl lg:max-w-none lg:text-[1rem] lg:leading-[1.25]"
          style={{ animationDelay: '120ms' }}
        >
          Avec <span className="text-[#2e9e4b] dark:text-[#5fbd72]">SMARTEX SustWay</span>, évaluer et optimiser la démarche de maturité et la performance de votre entreprise<br /> en matière de bonnes pratiques de {' '}
          <span className="text-[#2e9e4b] dark:text-[#5fbd72]">RSE et ESG</span> en s’appuyant sur l’IA. <br />Indépendance, Robustesse et Transparence de la Solution.
        </h1>

        {/* <p
          className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ink-600 motion-safe:animate-apparition-bas sm:mt-5 sm:text-base"
          style={{ animationDelay: '240ms' }}
        >
          {SMARTEX.produit} unifie référentiels, preuves documentaires et intelligence artificielle multi-agents pour
          évaluer, prioriser et améliorer votre performance RSE et ESG.
        </p> */}

        <div
          className="mt-6 flex flex-wrap items-center justify-center gap-3 motion-safe:animate-apparition-bas sm:mt-9 sm:gap-4"
          style={{ animationDelay: '360ms' }}
        >
          <Link
            to="/accueil"
            className="btn-vitrine px-6 py-3 text-sm transition-transform duration-300 hover:-translate-y-0.5 sm:px-8 sm:py-3.5 sm:text-base"
          >
            Découvrir la solution
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
          <button
            type="button"
            onClick={() => definirVideoOuverte(true)}
            className="btn-vitrine-clair group px-6 py-3 text-sm transition-transform duration-300 hover:-translate-y-0.5 sm:px-8 sm:py-3.5 sm:text-base"
          >
            <PlayCircle
              className="h-4 w-4 text-brand-600 transition-transform duration-300 group-hover:scale-110 dark:text-brand-400 sm:h-5 sm:w-5"
              strokeWidth={1.6}
              aria-hidden
            />
            Lire la vidéo
          </button>
        </div>

        {videoOuverte ? (
          <ModaleVideo
            source="/videos/methodologie-overview.mp4"
            titre="Vidéo de présentation SMARTEX SustWay"
            surFermeture={() => definirVideoOuverte(false)}
          />
        ) : null}

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
