import { BarChart3, ClipboardList, Database, FileText, Paperclip, Target } from 'lucide-react';
import { Apparition, Section } from './Section';
import {
  ApercuCampagnes,
  ApercuDonnees,
  ApercuPlansAction,
  ApercuPreuves,
  ApercuReporting,
  ApercuTableauDeBord,
} from './ApercusFonctionnalites';

/*
 * Corps de la page « Fonctionnalités » : six écrans, six phrases.
 *
 * Les six entrées alternent de part et d'autre de la page — texte à gauche
 * puis à droite — au lieu d'être rangées dans une grille de cartes. Deux
 * raisons : chaque aperçu dispose ainsi de la moitié de la page plutôt que
 * d'un quart, ce qui rend son interface réellement lisible ; et l'alternance
 * donne un rythme de lecture là où six cartes identiques donnaient un
 * catalogue.
 *
 * Les mots-clés sous chaque description ne sont pas décoratifs : ils nomment
 * ce que l'écran manipule, là où la phrase dit ce qu'il permet de faire.
 *
 * Les six entrées ouvrent en `h2` : ce sont les sections de la page, dont le
 * `h1` est porté par le bandeau de titre.
 */
const FONCTIONNALITES = [
  {
    numero: '01',
    titre: 'Campagnes & évaluations',
    texte: 'Organisez vos campagnes, définissez les périmètres et suivez leur avancement.',
    motsCles: ['Périmètres', 'Avancement', 'Statuts'],
    icone: Target,
    Apercu: ApercuCampagnes,
  },
  {
    numero: '02',
    titre: 'Données & indicateurs ESG',
    texte: 'Centralisez vos données environnementales, sociales et de gouvernance.',
    motsCles: ['Environnement', 'Social', 'Gouvernance'],
    icone: Database,
    Apercu: ApercuDonnees,
  },
  {
    numero: '03',
    titre: 'Preuves & traçabilité',
    texte: 'Associez les justificatifs aux critères et exigences.',
    motsCles: ['Justificatifs', 'Critères', 'Vérification'],
    icone: Paperclip,
    Apercu: ApercuPreuves,
  },
  {
    numero: '04',
    titre: 'Tableaux de bord',
    texte: 'Visualisez vos scores, indicateurs, écarts et niveaux de progression.',
    motsCles: ['Scores', 'Écarts', 'Progression'],
    icone: BarChart3,
    Apercu: ApercuTableauDeBord,
  },
  {
    numero: '05',
    titre: 'Plans d’action',
    texte: 'Responsables, échéances, priorités, statuts et progression, au même endroit.',
    motsCles: ['Responsables', 'Échéances', 'Priorités'],
    icone: ClipboardList,
    Apercu: ApercuPlansAction,
  },
  {
    numero: '06',
    titre: 'Reporting',
    texte: 'Suivez, consolidez et exploitez vos informations extra-financières.',
    motsCles: ['Consolidation', 'Extra-financier', 'Export'],
    icone: FileText,
    Apercu: ApercuReporting,
  },
];

export default function SectionFonctionnalites() {
  return (
    <Section fond="blanc">
      {/* `space-y` généreux : l'alternance ne se lit que si deux entrées
          consécutives ne se touchent pas. Sous 1024 px, où tout s'empile en
          une colonne, l'écart reste le seul séparateur entre deux blocs. */}
      <div className="space-y-20 lg:space-y-28">
        {FONCTIONNALITES.map((fonctionnalite, index) => {
          const Icone = fonctionnalite.icone;
          const { Apercu } = fonctionnalite;
          const inverse = index % 2 === 1;

          return (
            <Apparition key={fonctionnalite.numero}>
              <article className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                {/*
                 * L'ordre n'est inversé qu'à partir de 1024 px. En colonne, le
                 * texte passe toujours avant son aperçu : sur téléphone, une
                 * capture d'écran qui arrive avant la phrase qui l'explique
                 * n'est qu'une image de plus à faire défiler.
                 */}
                {/* `min-w-0` sur les deux colonnes : en une seule colonne, la
                    grille prend la largeur de son contenu le plus large, et
                    l'aperçu imposait la sienne au texte — mesuré à 320 px de
                    fenêtre, la colonne de texte occupait 370 px. */}
                <div className={`min-w-0 ${inverse ? 'lg:order-2' : ''}`}>
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icone className="h-[22px] w-[22px]" strokeWidth={1.75} aria-hidden />
                  </span>

                  <p className="mt-6 text-[12px] font-semibold tabular-nums tracking-wide text-ink-400">
                    {fonctionnalite.numero}
                  </p>
                  <h2 className="mt-1 text-[26px] font-semibold leading-snug tracking-[-0.02em] text-forest sm:text-[30px]">
                    {fonctionnalite.titre}
                  </h2>
                  <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-ink-600 sm:text-[17px]">
                    {fonctionnalite.texte}
                  </p>

                  <ul className="mt-6 flex flex-wrap gap-2">
                    {fonctionnalite.motsCles.map((mot) => (
                      <li
                        key={mot}
                        className="rounded-full border border-ink-200 bg-ink-50 px-3 py-1.5 text-[13px] font-medium text-ink-700"
                      >
                        {mot}
                      </li>
                    ))}
                  </ul>
                </div>

                {/*
                 * L'aperçu est posé sur un aplat vert très dilué plutôt que sur
                 * le blanc de la page : le cadre de l'application est lui-même
                 * blanc, et sans cet arrière-plan ses bords se confondaient
                 * avec la page. Le dégradé donne au bloc une direction, qui
                 * suit celle de la lecture.
                 */}
                <div className={`min-w-0 ${inverse ? 'lg:order-1' : ''}`}>
                  <div className="rounded-2xl bg-gradient-to-br from-brand-50 via-brand-50 to-growth/25 p-4 sm:p-6">
                    <Apercu />
                  </div>
                </div>
              </article>
            </Apparition>
          );
        })}
      </div>
    </Section>
  );
}
