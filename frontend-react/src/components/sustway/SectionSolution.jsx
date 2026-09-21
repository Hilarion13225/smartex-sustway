import { Activity, BarChart3, ClipboardList, FileText, Gauge, Layers, LineChart, Search, Target, TrendingUp } from 'lucide-react';
import { Apparition, Section } from './Section';

/*
 * Corps de la page « Solution » : la méthodologie, en cinq temps puis en trois
 * domaines, et ce qu'elle produit.
 *
 * La page répond à une question précise — comment le produit s'y prend — et
 * s'arrête là. Les écrans qui exécutent cette méthodologie sont le sujet de la
 * page « Fonctionnalités », vers laquelle celle-ci renvoie sans en montrer le
 * contenu.
 *
 * Le titre de la page est porté par son bandeau ; les trois blocs ci-dessous
 * ouvrent donc en `h2`, et leurs entrées en `h3`.
 */
const ETAPES = [
  { numero: '01', titre: 'Diagnostiquer', texte: 'Évaluer les écarts.', icone: Search, progression: 20 },
  { numero: '02', titre: 'Structurer', texte: 'Définir le cadre.', icone: Layers, progression: 40 },
  { numero: '03', titre: 'Piloter', texte: 'Suivre les données.', icone: Activity, progression: 60 },
  { numero: '04', titre: 'Optimiser', texte: 'Améliorer les actions.', icone: TrendingUp, progression: 80 },
  { numero: '05', titre: 'Mesurer', texte: 'Mesurer les progrès.', icone: Target, progression: 100 },
];

const DOMAINES = [
  { titre: 'Structurer', icone: Layers, elements: ['Référentiels', 'Objectifs', 'Indicateurs'] },
  { titre: 'Piloter', icone: Gauge, elements: ['Indicateurs ESG', 'Données', 'Tableaux de bord'] },
  { titre: 'Optimiser', icone: TrendingUp, elements: ['Plans d’action', 'Écarts', 'Amélioration'] },
];

const LIVRABLES = [
  { titre: 'Tableau de bord ESG', icone: BarChart3 },
  { titre: 'Rapport de durabilité', icone: FileText },
  { titre: 'Analyse d’impact', icone: LineChart },
  { titre: 'Plan d’action', icone: ClipboardList },
  { titre: 'Suivi de progression', icone: TrendingUp },
];

function TitreBloc({ children, sousTitre }) {
  return (
    <div className="mb-10 max-w-3xl">
      <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-forest sm:text-[30px]">
        {children}
      </h2>
      {sousTitre ? <p className="mt-3 text-[16px] leading-relaxed text-ink-600">{sousTitre}</p> : null}
    </div>
  );
}

export default function SectionSolution() {
  return (
    <>
      <Section fond="blanc">
        <TitreBloc sousTitre="Cinq temps qui s’enchaînent, du constat initial à la mesure des progrès.">
          La démarche en cinq temps
        </TitreBloc>

        {/*
         * Une colonne par étape à partir de 1024 px, deux sur tablette, une
         * seule sur téléphone : à cinq de front sous 1024 px, chaque carte
         * tomberait à 130 px de large et son intitulé se couperait en deux.
         */}
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {ETAPES.map((etape, index) => {
            const Icone = etape.icone;
            return (
              <Apparition key={etape.numero} delai={index * 90}>
                <li className="group h-full rounded-2xl border border-ink-200 bg-surface p-5 transition-all duration-200 hover:border-brand-200 hover:shadow-soft">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors duration-200 group-hover:bg-brand-600 group-hover:text-white">
                      <Icone className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="text-[13px] font-semibold tabular-nums text-ink-300">{etape.numero}</span>
                  </div>
                  <h3 className="mt-4 text-[17px] font-semibold text-forest">{etape.titre}</h3>
                  <p className="mt-1.5 text-[14px] text-ink-600">{etape.texte}</p>
                  {/* Indicateur de progression : il ne mesure rien, il situe
                      l'étape dans la démarche. D'où l'absence de chiffre — un
                      pourcentage ici se lirait comme une donnée. */}
                  <span aria-hidden className="mt-5 block h-1 w-full overflow-hidden rounded-full bg-ink-100">
                    <span className="block h-full rounded-full bg-brand-500" style={{ width: `${etape.progression}%` }} />
                  </span>
                </li>
              </Apparition>
            );
          })}
        </ol>
      </Section>

      <Section fond="mist">
        <TitreBloc sousTitre="Ce que la plateforme couvre, du cadre de référence jusqu’à l’action corrective.">
          Trois domaines couverts
        </TitreBloc>

        <div className="grid gap-4 md:grid-cols-3">
          {DOMAINES.map((domaine, index) => {
            const Icone = domaine.icone;
            return (
              <Apparition key={domaine.titre} delai={index * 110}>
                <div className="h-full rounded-2xl border border-ink-200 bg-surface p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icone className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <h3 className="mt-4 text-[20px] font-semibold text-forest">{domaine.titre}</h3>
                  <ul className="mt-4 space-y-2.5">
                    {domaine.elements.map((element) => (
                      <li key={element} className="flex items-center gap-2.5 text-[15px] text-ink-700">
                        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-growth" />
                        {element}
                      </li>
                    ))}
                  </ul>
                </div>
              </Apparition>
            );
          })}
        </div>
      </Section>

      {/* Les livrables, sur le sable de la charte : le changement de fond
          marque la bascule du discours de méthodologie au discours de résultat. */}
      <Section fond="sable">
        <TitreBloc sousTitre="Les productions de la démarche, disponibles à mesure que les données sont saisies.">
          Ce que vous obtenez
        </TitreBloc>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {LIVRABLES.map((livrable, index) => {
            const Icone = livrable.icone;
            return (
              <Apparition key={livrable.titre} delai={index * 70}>
                <li className="flex h-full items-center gap-3 rounded-xl border border-ink-200 bg-surface px-4 py-4 lg:flex-col lg:items-start lg:gap-3">
                  <Icone className="h-[18px] w-[18px] shrink-0 text-brand-600" strokeWidth={1.75} aria-hidden />
                  <span className="text-[14px] font-medium leading-snug text-ink-800">{livrable.titre}</span>
                </li>
              </Apparition>
            );
          })}
        </ul>
      </Section>
    </>
  );
}
