import { BarChart3, ClipboardList, Database, FileText, Paperclip, Target } from 'lucide-react';
import { Apparition, Section, TitreSection } from './Section';
import {
  ApercuCampagnes,
  ApercuDonnees,
  ApercuPlansAction,
  ApercuPreuves,
  ApercuReporting,
  ApercuTableauDeBord,
} from './ApercusFonctionnalites';

/*
 * « Fonctionnalités » : six écrans, six phrases.
 *
 * Chaque entrée porte son aperçu produit plutôt qu'une illustration : c'est la
 * section où le visiteur doit cesser de lire une promesse et commencer à voir
 * un logiciel. Le texte y est donc court — l'écran dit le reste.
 */
const FONCTIONNALITES = [
  {
    numero: '01',
    titre: 'Campagnes & évaluations',
    texte: 'Organisez vos campagnes, définissez les périmètres et suivez leur avancement.',
    icone: Target,
    Apercu: ApercuCampagnes,
  },
  {
    numero: '02',
    titre: 'Données & indicateurs ESG',
    texte: 'Centralisez vos données environnementales, sociales et de gouvernance.',
    icone: Database,
    Apercu: ApercuDonnees,
  },
  {
    numero: '03',
    titre: 'Preuves & traçabilité',
    texte: 'Associez les justificatifs aux critères et exigences.',
    icone: Paperclip,
    Apercu: ApercuPreuves,
  },
  {
    numero: '04',
    titre: 'Tableaux de bord',
    texte: 'Visualisez vos scores, indicateurs, écarts et niveaux de progression.',
    icone: BarChart3,
    Apercu: ApercuTableauDeBord,
  },
  {
    numero: '05',
    titre: 'Plans d’action',
    texte: 'Responsables, échéances, priorités, statuts et progression, au même endroit.',
    icone: ClipboardList,
    Apercu: ApercuPlansAction,
  },
  {
    numero: '06',
    titre: 'Reporting',
    texte: 'Suivez, consolidez et exploitez vos informations extra-financières.',
    icone: FileText,
    Apercu: ApercuReporting,
  },
];

export default function SectionFonctionnalites() {
  return (
    <Section id="fonctionnalites" fond="blanc">
      <TitreSection
        surTitre="Fonctionnalités"
        titre="Les outils pour piloter votre démarche"
        sousTitre="SMARTEX SustWay centralise les informations nécessaires au pilotage de la performance durable : campagnes, données, preuves, scores, actions et reporting suivent le même fil."
      />

      {/* Deux colonnes seulement, et non trois : chaque carte contient un
          aperçu d'interface, qui devient illisible sous 380 px de large. */}
      <div className="mt-14 grid items-start gap-5 lg:grid-cols-2">
        {FONCTIONNALITES.map((fonctionnalite, index) => {
          const Icone = fonctionnalite.icone;
          const { Apercu } = fonctionnalite;
          return (
            // Le décalage ne court que sur deux crans : au sixième, un visiteur
            // qui descend vite attendrait une demi-seconde devant une carte
            // vide.
            <Apparition key={fonctionnalite.numero} delai={(index % 2) * 90}>
              <article className="flex h-full flex-col rounded-2xl border border-ink-200 bg-surface p-6 transition-shadow duration-200 hover:shadow-soft sm:p-7">
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icone className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold tabular-nums tracking-wide text-ink-400">
                      {fonctionnalite.numero}
                    </p>
                    <h3 className="mt-0.5 text-[21px] font-semibold leading-snug text-forest">{fonctionnalite.titre}</h3>
                  </div>
                </div>
                <p className="mt-4 text-[15px] leading-relaxed text-ink-600">{fonctionnalite.texte}</p>
                {/* `mt-auto` colle l'aperçu au bas de la carte : les titres sur
                    deux lignes ne décalent plus les écrans les uns par rapport
                    aux autres d'une colonne à l'autre. */}
                <div className="mt-auto pt-6">
                  <Apercu />
                </div>
              </article>
            </Apparition>
          );
        })}
      </div>
    </Section>
  );
}
