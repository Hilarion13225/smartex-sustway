import { GraphiqueAnneau } from '../charts';

/** Palette de la jauge : rempli en émeraude, reste en gris neutre. */
const COULEURS_JAUGE = ['#059669', '#e2e8f0'];
const COULEURS_JAUGE_CONFORMITE = ['#921f18', '#e2e8f0'];

const TONS_RISQUE = {
  ELEVE: { point: 'bg-brand-600', libelle: 'Élevé' },
  MOYEN: { point: 'bg-amber-500', libelle: 'Moyen' },
  FAIBLE: { point: 'bg-emerald-500', libelle: 'Faible' },
};

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
  const conformite =
    score?.scoreGlobal == null ? null : Math.round((Number(score.scoreGlobal) / 5) * 100);
  const domaines = score?.domaines ?? [];
  const ton = risque ? TONS_RISQUE[risque] : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,0.8fr)]">
      {/* --- Avancement --- */}
      <section className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-900">Progression globale</h2>
        <div className="mt-4">
          <Jauge pourcentage={progression} legende="Complété" couleurs={COULEURS_JAUGE} />
        </div>
        <p className="mt-3 text-center text-xs text-ink-500">
          {criteresEvalues} / {criteresTotal} critères évalués
        </p>
      </section>

      {/* --- Score par domaine --- */}
      <section className="min-w-0 rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-900">Par domaine</h2>
        {domaines.length === 0 ? (
          <p className="mt-4 text-xs text-ink-500">
            Les scores par domaine apparaîtront dès les premières évaluations.
          </p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {domaines.map((domaine) => {
              const part =
                domaine.score == null ? 0 : Math.round((Number(domaine.score) / 5) * 100);
              return (
                <li key={domaine.domaineCode} className="flex items-center gap-3">
                  <span
                    className="w-32 shrink-0 truncate text-xs text-ink-600"
                    title={domaine.domaineNom ?? domaine.domaineCode}
                  >
                    {domaine.domaineNom ?? domaine.domaineCode}
                  </span>
                  <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-ink-100">
                    <span
                      className="block h-full rounded-full bg-brand-600 transition-[width] duration-500"
                      style={{ width: `${part}%` }}
                    />
                  </span>
                  <span className="w-9 shrink-0 text-right text-xs font-medium tabular-nums text-ink-700">
                    {domaine.score == null ? '—' : `${part}%`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* --- Conformité et risque --- */}
      <div className="space-y-4">
        <section className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-ink-900">Conformité</h2>
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
        </section>

        <section className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-ink-900">Risque global</h2>
          {ton ? (
            <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-ink-800">
              <span className={`h-2.5 w-2.5 rounded-full ${ton.point}`} />
              {ton.libelle}
            </p>
          ) : (
            <p className="mt-3 text-sm text-ink-400">Non évalué</p>
          )}
          <p className="mt-1 text-xs text-ink-500">Déduit des non-conformités ouvertes.</p>
        </section>
      </div>
    </div>
  );
}
