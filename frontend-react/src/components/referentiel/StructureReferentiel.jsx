import { ChevronRight } from 'lucide-react';
import { Card } from '../ui';

/**
 * Chaîne d'exploitation d'un référentiel, du cadre normatif à la
 * recommandation.
 *
 * Contenu explicatif et non données : il documente le modèle de la
 * plateforme. Les maillons déjà implémentés sont distingués de ceux qui ne le
 * sont pas encore, pour ne pas laisser croire qu'une étape absente existe.
 */
const MAILLONS = [
  { libelle: 'Référentiel', present: true },
  { libelle: 'Domaine', present: true },
  { libelle: 'Critère', present: true },
  { libelle: 'Question', present: true },
  { libelle: 'Preuves', present: true },
  { libelle: 'Analyse IA', present: true },
  { libelle: 'Score', present: true },
  { libelle: 'Non-conformité', present: true },
  { libelle: 'Recommandation', present: true },
];

export default function StructureReferentiel() {
  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold text-ink-900">Comment un référentiel est exploité</h2>
      <p className="mt-0.5 text-xs text-ink-500">
        Chaque maillon alimente le suivant : un critère devient une question posée en mission, dont
        les preuves nourrissent l’analyse, puis le score et le plan d’action.
      </p>

      <ol className="mt-4 flex flex-wrap items-center gap-1.5">
        {MAILLONS.map((maillon, index) => (
          <li key={maillon.libelle} className="flex items-center gap-1.5">
            <span className="rounded-lg border border-ink-200 bg-ink-50 px-2.5 py-1.5 text-xs font-medium text-ink-700">
              {maillon.libelle}
            </span>
            {index < MAILLONS.length - 1 ? (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-300" aria-hidden />
            ) : null}
          </li>
        ))}
      </ol>

      <p className="mt-4 text-xs text-ink-500">
        Les sous-domaines et les exigences détaillées ne sont pas encore modélisés : un critère porte
        aujourd’hui directement sa question et ses preuves attendues.
      </p>
    </Card>
  );
}
