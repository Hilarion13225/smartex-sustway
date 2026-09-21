import {
  BarChart3,
  ChevronRight,
  ClipboardList,
  FileText,
  Gauge,
  Layers,
  LineChart,
  RefreshCw,
  Search,
  TrendingUp,
} from 'lucide-react';
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
  { numero: '01', titre: 'Diagnostiquer', texte: 'Évaluer les écarts.', icone: Search },
  { numero: '02', titre: 'Structurer', texte: 'Définir le cadre.', icone: Layers },
  { numero: '03', titre: 'Piloter', texte: 'Suivre les données.', icone: LineChart },
  { numero: '04', titre: 'Optimiser', texte: 'Améliorer les actions.', icone: RefreshCw },
  { numero: '05', titre: 'Mesurer', texte: 'Mesurer les progrès.', icone: BarChart3 },
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
         * Frise circulaire : cinq jalons posés sur un fil continu.
         *
         * Les cartes rectangulaires qui occupaient cette place disaient cinq
         * blocs juxtaposés ; le fil dit un enchaînement, ce qui est le sujet
         * de la section. Il change de teinte en chemin, du vert du produit à
         * l'or de la charte, et le point doré marque l'endroit où la bascule
         * s'opère — entre le pilotage, qui observe, et l'optimisation, qui
         * corrige.
         *
         * Le fil et ses repères ne sont dessinés qu'à partir de 1024 px : en
         * colonne, un trait horizontal ne relierait plus rien. En dessous, les
         * jalons s'empilent et gardent leur numéro, qui suffit à donner
         * l'ordre.
         */}
        <Apparition>
          <div className="relative">
            {/* Le fil part du centre du premier cercle et s'arrête à celui du
                dernier : `10 %`, soit la moitié d'une colonne sur cinq. Il
                dépasserait sinon des deux côtés de la frise. */}
            <span
              aria-hidden
              className="absolute left-[10%] right-[10%] top-[44px] hidden h-px -translate-y-1/2 bg-gradient-to-r from-brand-600 via-brand-500 to-attention lg:block"
            />

            {/* Chevrons posés à mi-distance entre deux cercles. Leur fond
                reprend celui de la section pour interrompre le fil derrière
                eux, plutôt que de se superposer à un trait qui les traverse. */}
            {[20, 40, 60, 80].map((position) => (
              <span
                key={position}
                aria-hidden
                style={{ left: `${position}%` }}
                className="absolute top-[44px] hidden h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-surface lg:flex"
              >
                <ChevronRight className="h-3.5 w-3.5 text-ink-300" strokeWidth={2.5} />
              </span>
            ))}

            {/* Le point de bascule, entre « Piloter » et « Optimiser ». Posé à
                57 % et non à 52 % : le cercle central, halo compris, s'étend
                jusqu'à 54,6 % de la largeur, et le point s'y cachait
                entièrement. */}
            <span
              aria-hidden
              className="absolute left-[57%] top-[44px] hidden h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-attention lg:block"
            />

            <ol className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-0">
              {ETAPES.map((etape) => {
                const Icone = etape.icone;
                return (
                  <li key={etape.numero} className="flex flex-col items-center px-2 text-center">
                    <div className="relative">
                      {/* `ring` plutôt qu'une ombre : il dessine le halo vert
                          très clair demandé et, étant opaque, il masque le fil
                          juste autour du cercle — le trait semble ainsi
                          s'arrêter à son bord. */}
                      <span className="flex h-[88px] w-[88px] items-center justify-center rounded-full border border-brand-600 bg-surface ring-8 ring-brand-50">
                        <Icone className="h-8 w-8 text-brand-700" strokeWidth={1.5} aria-hidden />
                      </span>
                      <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-attention text-[11px] font-bold tabular-nums text-white ring-4 ring-surface">
                        {etape.numero}
                      </span>
                    </div>

                    <p className="mt-7 text-[13px] font-bold uppercase tracking-[0.08em] text-ink-900">
                      {etape.titre}
                    </p>
                    <p className="mt-2 text-[14px] text-ink-500">{etape.texte}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </Apparition>
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
