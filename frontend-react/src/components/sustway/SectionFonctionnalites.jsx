import { BarChart3, Database, FolderCheck, ListChecks } from 'lucide-react';
import { Apparition, Section } from './Section';
import {
  ApercuDonnees,
  ApercuPlansAction,
  ApercuPreuves,
  ApercuTableauDeBord,
} from './ApercusFonctionnalites';

/*
 * Corps de la page « Fonctionnalités » : quatre temps, quatre écrans.
 *
 * Ils suivent l'ordre dans lequel une évaluation se déroule réellement —
 * rassembler les données, les justifier, les lire, puis agir — et non un
 * classement par famille de fonctionnalités. Un visiteur qui découvre la
 * plateforme cherche à savoir ce qu'il aura à faire, dans quel ordre ; le
 * classement par famille répond à une autre question, celle d'un utilisateur
 * qui connaît déjà l'outil.
 *
 * Les quatre aperçus existaient déjà dans `ApercusFonctionnalites.jsx` : ce
 * découpage est celui pour lequel ils avaient été dessinés.
 *
 * Ils alternent de part et d'autre de la page. Chaque aperçu dispose ainsi de
 * la moitié de la largeur plutôt que d'un quart, ce qui rend son interface
 * réellement lisible, et l'alternance donne un rythme de lecture là où des
 * cartes identiques donnaient un catalogue.
 *
 * Chaque temps porte son ancre — `#collecte-des-donnees`, `#documenter`,
 * `#analyse-resultats`, `#remedier-piloter` — que le menu déroulant de la
 * barre vise directement.
 *
 * Les capacités listées sous chaque description ne sont pas décoratives :
 * elles nomment ce que l'écran manipule, là où la phrase dit ce qu'il permet
 * de faire.
 *
 * Les quatre entrées ouvrent en `h2` : ce sont les sections de la page, dont
 * le `h1` est porté par le bandeau de titre.
 */
const DOMAINES = [
  {
    ancre: 'collecte-des-donnees',
    numero: '01',
    titre: 'Collecte des données',
    texte:
      'Organisez vos campagnes d’évaluation, définissez les périmètres et rassemblez en un seul endroit l’ensemble des données extra-financières de l’organisation.',
    capacites: [
      'Campagnes d’évaluation',
      'Définition des périmètres',
      'Critères RSE & ESG',
      'Questionnaires',
      'Collecte des données',
    ],
    icone: Database,
    Apercu: ApercuDonnees,
  },
  {
    ancre: 'documenter',
    numero: '02',
    titre: 'Documenter',
    texte:
      'Déposez les pièces qui justifient chaque réponse. Chaque preuve est rattachée au critère qu’elle sert et reste consultable, ce qui rend l’évaluation vérifiable plutôt que déclarative.',
    capacites: [
      'Preuves documentaires',
      'Dépôt des pièces',
      'Rattachement aux critères',
      'Traçabilité',
      'Historique des versions',
    ],
    icone: FolderCheck,
    Apercu: ApercuPreuves,
  },
  {
    ancre: 'analyse-resultats',
    numero: '03',
    titre: 'Analyse & Résultats',
    texte:
      'Vos données deviennent des résultats lisibles : scores par domaine, conformités et écarts, niveaux de maturité et progression dans le temps, réunis sur des tableaux de bord dynamiques.',
    capacites: [
      'Indicateurs de performance',
      'Tableaux de bord',
      'Conformités et écarts',
      'Niveaux de maturité',
      'Analyse de progression',
      'Reporting extra-financier',
    ],
    icone: BarChart3,
    Apercu: ApercuTableauDeBord,
  },
  {
    ancre: 'remedier-piloter',
    numero: '04',
    titre: 'Remédier & Piloter',
    texte:
      'Transformez vos écarts en plans d’action concrets. Attribuez des responsabilités, fixez des échéances et suivez l’avancement de chaque initiative.',
    capacites: [
      'Plans d’action',
      'Objectifs',
      'Responsabilités',
      'Échéances',
      'Priorisation',
      'Suivi de l’avancement',
    ],
    icone: ListChecks,
    Apercu: ApercuPlansAction,
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
