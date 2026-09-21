import { BarChart3, ClipboardList, FileText, Gauge, Layers, LineChart, TrendingUp } from 'lucide-react';
import { Apparition, Section } from './Section';
import FriseDemarche from './FriseDemarche';

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

        <FriseDemarche />
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
