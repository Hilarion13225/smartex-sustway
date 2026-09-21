import { ClipboardCheck, Target, TrendingUp } from 'lucide-react';
import { Apparition, Section } from './Section';
import { ApercuCampagnes, ApercuPlansAction, ApercuTableauDeBord } from './ApercusFonctionnalites';

/*
 * Corps de la page « Fonctionnalités » : trois domaines, trois écrans.
 *
 * Ils alternent de part et d'autre de la page. Chaque aperçu dispose ainsi de
 * la moitié de la largeur plutôt que d'un quart, ce qui rend son interface
 * réellement lisible, et l'alternance donne un rythme de lecture là où des
 * cartes identiques donnaient un catalogue.
 *
 * Chaque domaine porte son ancre — `#evaluations`, `#objectifs-actions`,
 * `#performance-reporting` — que le menu déroulant de la barre vise
 * directement.
 *
 * Les capacités listées sous chaque description ne sont pas décoratives :
 * elles nomment ce que l'écran manipule, là où la phrase dit ce qu'il permet
 * de faire.
 *
 * Les trois entrées ouvrent en `h2` : ce sont les sections de la page, dont le
 * `h1` est porté par le bandeau de titre.
 */
const DOMAINES = [
  {
    ancre: 'evaluations',
    numero: '01',
    titre: 'Évaluations RSE & ESG',
    texte:
      'Organisez vos campagnes d’évaluation, définissez les périmètres et collectez l’ensemble des données extra-financières de l’organisation.',
    capacites: [
      'Campagnes d’évaluation',
      'Définition des périmètres',
      'Critères RSE & ESG',
      'Collecte des données',
      'Suivi des résultats',
    ],
    icone: ClipboardCheck,
    Apercu: ApercuCampagnes,
  },
  {
    ancre: 'objectifs-actions',
    numero: '02',
    titre: 'Objectifs & Actions',
    texte:
      'Transformez vos écarts en plans d’action concrets. Attribuez des responsabilités, fixez des échéances et suivez l’avancement de chaque initiative.',
    capacites: [
      'Définition des objectifs',
      'Plans d’action',
      'Responsabilités',
      'Échéances',
      'Priorisation',
      'Suivi de l’avancement',
    ],
    icone: Target,
    Apercu: ApercuPlansAction,
  },
  {
    ancre: 'performance-reporting',
    numero: '03',
    titre: 'Performance & Reporting',
    texte:
      'Centralisez vos indicateurs à travers des tableaux de bord dynamiques et générez des rapports de durabilité clairs pour vos parties prenantes et régulateurs.',
    capacites: [
      'Indicateurs de performance',
      'Tableaux de bord',
      'Suivi des objectifs',
      'Analyse de progression',
      'Reporting extra-financier',
      'Historique des performances',
    ],
    icone: TrendingUp,
    Apercu: ApercuTableauDeBord,
  },
];

export default function SectionFonctionnalites() {
  return (
    <>
      {DOMAINES.map((domaine, index) => {
        const Icone = domaine.icone;
        const { Apercu } = domaine;
        const inverse = index % 2 === 1;

        return (
          <Section key={domaine.ancre} id={domaine.ancre} fond={inverse ? 'mist' : 'blanc'}>
            <Apparition>
              <article className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                {/*
                 * L'ordre n'est inversé qu'à partir de 1024 px. En colonne, le
                 * texte passe toujours avant son aperçu : sur téléphone, une
                 * capture d'écran qui arrive avant la phrase qui l'explique
                 * n'est qu'une image de plus à faire défiler.
                 *
                 * `min-w-0` sur les deux colonnes : en une seule colonne, la
                 * grille prend la largeur de son contenu le plus large, et
                 * l'aperçu imposerait la sienne au texte.
                 */}
                <div className={`min-w-0 ${inverse ? 'lg:order-2' : ''}`}>
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icone className="h-[22px] w-[22px]" strokeWidth={1.75} aria-hidden />
                  </span>

                  <p className="mt-6 text-[12px] font-semibold tabular-nums tracking-wide text-ink-400">
                    {domaine.numero}
                  </p>
                  <h2 className="mt-1 text-[26px] font-semibold leading-snug tracking-[-0.02em] text-forest sm:text-[30px]">
                    {domaine.titre}
                  </h2>
                  <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-ink-600 sm:text-[17px]">
                    {domaine.texte}
                  </p>

                  <p className="mt-7 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                    Principales capacités
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {domaine.capacites.map((capacite) => (
                      <li
                        key={capacite}
                        className="rounded-full border border-ink-200 bg-surface px-3 py-1.5 text-[13px] font-medium text-ink-700"
                      >
                        {capacite}
                      </li>
                    ))}
                  </ul>
                </div>

                {/*
                 * L'aperçu est posé sur un aplat vert très dilué plutôt que sur
                 * le fond de la page : le cadre de l'application est lui-même
                 * blanc, et sans cet arrière-plan ses bords s'y confondraient.
                 */}
                <div className={`min-w-0 ${inverse ? 'lg:order-1' : ''}`}>
                  <div className="rounded-2xl bg-gradient-to-br from-brand-50 via-brand-50 to-growth/25 p-4 sm:p-6">
                    <Apercu />
                  </div>
                </div>
              </article>
            </Apparition>
          </Section>
        );
      })}
    </>
  );
}
