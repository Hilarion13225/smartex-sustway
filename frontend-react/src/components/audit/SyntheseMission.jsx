import { GraphiqueAnneau } from '../charts';
import { Card } from '../ui';

import { formaterScore } from '../../lib/scoreAffiche';

/** Palette de la jauge : rempli en émeraude, reste en gris neutre. */
const COULEURS_JAUGE = ['#059669', '#e2e8f0'];
const COULEURS_JAUGE_CONFORMITE = ['#921f18', '#e2e8f0'];

const TONS_RISQUE = {
  ELEVE: { point: 'bg-brand-600', libelle: 'Élevé' },
  MOYEN: { point: 'bg-amber-500', libelle: 'Moyen' },
  FAIBLE: { point: 'bg-emerald-500', libelle: 'Faible' },
};

/** Affiche une somme sans décimale inutile : « 69 » plutôt que « 69,0 ». */
function nombre(valeur) {
  if (valeur == null) return '—';
  const n = Number(valeur);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Anneau compact avec sa valeur au centre. */
function Jauge({ pourcentage, legende, couleurs }) {
  return (
    <div className="relative mx-auto h-32 w-32">
      <GraphiqueAnneau
        labels={['Atteint', 'Restant']}
        data={[pourcentage, Math.max(0, 100 - pourcentage)]}
        couleurs={couleurs}
        legende={false}
      />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold tabular-nums text-ink-900">{pourcentage}%</span>
        <span className="text-[11px] text-ink-500">{legende}</span>
      </div>
    </div>
  );
}

/**
 * Bandeau de synthèse d'une mission : avancement, score par domaine,
 * conformité et niveau de risque.
 *
 * Le score par domaine est ramené en pourcentage alors qu'il est noté sur 5
 * (RG31) : mis côte à côte avec un taux d'avancement, deux échelles
 * différentes se liraient mal.
 */
export default function SyntheseMission({ score, risque, criteresTotal, criteresEvalues }) {
  const progression =
    criteresTotal > 0 ? Math.round((criteresEvalues / criteresTotal) * 100) : 0;
  // V74-C3-B11 : sans critère évalué, le score 0 du serveur n'est pas une conformité nulle.
  const conformite =
    (score?.nombreCriteresEvalues ?? 0) > 0 ? Math.round((Number(score.scoreGlobal) / 5) * 100) : null;
  const domaines = score?.domaines ?? [];
  // Servi par l'API depuis toujours, jamais lu jusqu'ici. Une évaluation en
  // revue n'est ni évaluée ni « non évaluée » : elle disparaissait des deux
  // compteurs, et la mission paraissait plus avancée qu'elle ne l'était.
  const enRevue = score?.nombreCriteresEnRevue ?? 0;
  const noteTotale = score?.noteTotale ?? null;
  const coefficientTotal = score?.coefficientTotal ?? null;
  const ton = risque ? TONS_RISQUE[risque] : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.8fr)_minmax(0,0.8fr)]">
      {/* --- Avancement --- */}
      <Card className="p-5">
        <h2 className="text-base font-semibold text-ink-900">Progression globale</h2>
        <div className="mt-4">
          <Jauge pourcentage={progression} legende="Complété" couleurs={COULEURS_JAUGE} />
        </div>
        <p className="mt-3 text-center text-xs text-ink-500">
          {criteresEvalues} / {criteresTotal} critères évalués
        </p>
        {enRevue > 0 ? (
          <p className="mt-1 text-center text-xs font-medium text-violet-700 dark:text-violet-300">
            {enRevue} en attente de revue
          </p>
        ) : null}
      </Card>

      {/* --- Score par domaine --- */}
      <Card className="min-w-0 p-5">
        <h2 className="text-base font-semibold text-ink-900">Par domaine</h2>
        {domaines.length === 0 ? (
          <p className="mt-4 text-xs text-ink-500">
            Les scores par domaine apparaîtront dès les premières évaluations.
          </p>
        ) : (
          /* Mêmes colonnes que la grille d'évaluation : note totale,
             coefficient total, puis le score qui en découle. */
          <div className="mt-4 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink-100">
                  <th className="th">Domaine</th>
                  <th className="th text-right">Note totale</th>
                  <th className="th text-right">Coef. total</th>
                  <th className="th text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {domaines.map((domaine) => (
                  <tr key={domaine.domaineCode}>
                    <td
                      className="td max-w-[14rem] truncate"
                      title={domaine.domaineNom ?? domaine.domaineCode}
                    >
                      {domaine.domaineNom ?? domaine.domaineCode}
                    </td>
                    <td className="td text-right tabular-nums">
                      {nombre(domaine.noteTotale)}
                    </td>
                    <td className="td text-right tabular-nums">
                      {nombre(domaine.coefficientTotal)}
                    </td>
                    <td className="td text-right font-semibold tabular-nums text-ink-900">
                      {domaine.score == null || domaine.nombreCriteresEvalues === 0 ? '—' : formaterScore(domaine.score)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {noteTotale != null ? (
                <tfoot>
                  <tr className="border-t-2 border-ink-200">
                    <td className="td font-semibold text-ink-900">Ensemble de la mission</td>
                    <td className="td text-right font-semibold tabular-nums">{nombre(noteTotale)}</td>
                    <td className="td text-right font-semibold tabular-nums">
                      {nombre(coefficientTotal)}
                    </td>
                    <td className="td text-right font-bold tabular-nums text-ink-900">
                      {score?.scoreGlobal == null || score.nombreCriteresEvalues === 0 ? '—' : formaterScore(score.scoreGlobal)}
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        )}
      </Card>

      {/* --- Conformité et risque --- */}
      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="text-base font-semibold text-ink-900">Conformité</h2>
          {conformite == null ? (
            <p className="mt-4 text-xs text-ink-500">Aucune évaluation.</p>
          ) : (
            <>
              <div className="mt-3">
                <Jauge
                  pourcentage={conformite}
                  legende={conformite >= 75 ? 'Élevée' : conformite >= 50 ? 'Moyenne' : 'Faible'}
                  couleurs={COULEURS_JAUGE_CONFORMITE}
                />
              </div>
              <p className="mt-2 text-center text-[11px] text-ink-500">Score moyen pondéré</p>
            </>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold text-ink-900">Risque global</h2>
          {ton ? (
            <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-ink-800">
              <span className={`h-2.5 w-2.5 rounded-full ${ton.point}`} />
              {ton.libelle}
            </p>
          ) : (
            <p className="mt-3 text-sm text-ink-500">Non évalué</p>
          )}
          <p className="mt-1 text-xs text-ink-500">Déduit des non-conformités ouvertes.</p>
        </Card>
      </div>
    </div>
  );
}
