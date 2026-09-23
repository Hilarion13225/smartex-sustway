import { BarChart3, Database, FolderCheck, ListChecks } from 'lucide-react';
import { Apparition, Section } from './Section';
import BoutonDemo from './BoutonDemo';
import {
  ApercuDonnees,
  ApercuPlansAction,
  ApercuPreuves,
  ApercuTableauDeBord,
} from './ApercusFonctionnalites';

/*
 * Corps de la page « Fonctionnalités » : quatre temps et un appel à
 * l'action.
 *
 * L'introduction — texte descriptif et demande de démonstration — est
 * remontée dans le bandeau de titre, où elle prolonge l'accroche. Sous
 * le bandeau, dans une section blanche, elle se lisait comme un second
 * départ.
 *
 * Les quatre temps suivent l'ordre dans lequel une évaluation se déroule —
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
 * Chaque temps porte son ancre — `#collecter-les-donnees`, `#documenter`,
 * `#analyse-resultats`, `#remedier-piloter` — que le menu déroulant de la
 * barre vise directement.
 *
 * Le descriptif de chaque temps tient en trois phrases séparées, et non en un
 * paragraphe : ce sont trois choses distinctes que la plateforme permet, et
 * les enchaîner les ferait lire comme une seule.
 *
 * Les mots-clés sous chaque descriptif nomment ce que l'écran manipule, là où
 * les phrases disent ce qu'il permet de faire.
 */
const DOMAINES = [
  {
    ancre: 'collecter-les-donnees',
    numero: '01',
    titre: 'Collecter les données',
    sousTitre: 'Organisez vos campagnes et collectez vos données RSE, ESG & DD',
    phrases: [
      'Créez vos campagnes d’évaluation en quelques clics et définissez précisément leurs périmètres.',
      'Déployez des questionnaires ciblés auprès des bonnes parties prenantes : ressources humaines, achats, environnement, direction.',
      'Collectez l’ensemble des données qualitatives et quantitatives nécessaires à votre démarche extra-financière, de manière centralisée.',
    ],
    capacites: ['Créer', 'Planifier', 'Affecter', 'Collecter'],
    icone: Database,
    Apercu: ApercuDonnees,
  },
  {
    ancre: 'documenter',
    numero: '02',
    titre: 'Documenter',
    sousTitre: 'Gardez chaque élément justificatif sous contrôle',
    phrases: [
      'Centralisez et sécurisez l’ensemble de vos pièces justificatives : politiques RSE, ESG & DD, chartes d’éthique, factures énergétiques, rapports d’audit.',
      'Associez chaque preuve directement aux contrôles et aux critères évalués.',
      'Garantissez une traçabilité irréprochable et un niveau de preuve prêt pour les audits externes et les exigences réglementaires.',
    ],
    capacites: ['Preuves', 'Justificatifs', 'Traçabilité', 'Conformité'],
    icone: FolderCheck,
    Apercu: ApercuPreuves,
  },
  {
    ancre: 'analyse-resultats',
    numero: '03',
    titre: 'Analyse & Résultats',
    sousTitre: 'Visualisez ce qui compte et transformez vos indicateurs',
    phrases: [
      'Analysez vos scores de maturité et vos niveaux de performance à travers des tableaux de bord dynamiques et visuels.',
      'Restituez l’information clé sous forme de rapports de durabilité clairs, adaptés aux attentes des parties prenantes, des régulateurs et de la direction.',
      'Identifiez instantanément les forces, les faiblesses et les zones de vulnérabilité extra-financière de l’organisation.',
    ],
    capacites: ['Scores', 'Maturité', 'Indicateurs', 'Restitution', 'Reporting'],
    icone: BarChart3,
    Apercu: ApercuTableauDeBord,
  },
  {
    ancre: 'remedier-piloter',
    numero: '04',
    titre: 'Remédier & Piloter',
    sousTitre: 'Faites travailler les équipes ensemble et pilotez la trajectoire durable',
    phrases: [
      'Transformez les écarts et les axes d’amélioration identifiés en plans d’action concrets et assignables.',
      'Désignez des responsables, fixez des échéances précises et suivez l’avancement de chaque initiative.',
      'Pilotez l’amélioration continue de votre posture globale de développement durable sur le long terme.',
    ],
    capacites: ['Plans d’action', 'Responsables', 'Échéances', 'Pilotage continu'],
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
                  <p className="mt-3 max-w-xl text-[17px] font-medium leading-snug text-brand-700">
                    {domaine.sousTitre}
                  </p>

                  <div className="mt-5 max-w-xl space-y-3">
                    {domaine.phrases.map((phrase) => (
                      <p key={phrase} className="text-[16px] leading-relaxed text-ink-600">
                        {phrase}
                      </p>
                    ))}
                  </div>

                  <ul className="mt-7 flex flex-wrap gap-2">
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

      {/*
       * L'appel à l'action de fin.
       *
       * Sur fond Forest, comme les bandeaux de la charte : la page se referme
       * sur une plage sombre qui la sépare du pied.
       */}
      <Section fond="forest" contenuClassName="lg:py-20">
        <Apparition className="mx-auto max-w-2xl text-center">
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-white sm:text-[34px]">
            Découvrez SMARTEX SustWay en action
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-white/75">
            Demandez une démonstration et découvrez comment la plateforme peut s’intégrer à votre processus de pilotage
            RSE, ESG & DD.
          </p>
          {/* Blanc sur le fond Forest : le vert de marque ne s'y détache qu'à
              2,03:1, là où un composant d'interface en demande trois. */}
          <BoutonDemo variante="clair" className="mt-8" />
        </Apparition>
      </Section>
    </>
  );
}
