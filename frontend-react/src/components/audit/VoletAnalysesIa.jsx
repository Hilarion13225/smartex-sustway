import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Badge, Loader } from '../ui';
import TracabiliteIa from './TracabiliteIa';
import Rectification from './Rectification';
import { analyseDepuisEvaluation } from './analyseCritere';
import { estAnalyse } from './statutsCritere';
import { api } from '../../lib/apiClient';

/** Découpe une justification en points : l'IA renvoie souvent des phrases enchaînées. */
function enPoints(texte) {
  if (!texte) return [];
  return texte
    .split(/(?<=\.)\s+/)
    .map((phrase) => phrase.trim())
    .filter(Boolean);
}

/**
 * Analyses produites par le pipeline d'agents sur la mission.
 *
 * Seuls les critères déjà évalués sont interrogés — l'API n'expose pas de
 * liste d'évaluations à l'échelle d'une mission, et questionner les critères
 * non évalués reviendrait à lancer autant de requêtes pour rien.
 */
export default function VoletAnalysesIa({ entrepriseId, auditId, criteres }) {
  const [analyses, setAnalyses] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    // Seuls les critères analysés portent une analyse : un critère simplement
    // déclaré attend encore la clôture.
    const evalues = criteres.filter(estAnalyse);
    if (evalues.length === 0) {
      setAnalyses([]);
      setChargement(false);
      return;
    }

    setChargement(true);
    Promise.all(
      evalues.map((critere) =>
        api
          .get(
            `/api/v1/entreprises/${entrepriseId}/audits/${auditId}/criteres/${critere.id}/evaluations`
          )
          .then((evaluations) => {
            const derniereIa = [...(evaluations ?? [])]
              .sort((a, b) => new Date(b.dateEvaluation) - new Date(a.dateEvaluation))
              .find((e) => e.source === 'IA');
            const analyse = analyseDepuisEvaluation(derniereIa);
            return analyse ? { critere, analyse } : null;
          })
          .catch(() => null)
      )
    )
      .then((resultats) => setAnalyses(resultats.filter(Boolean)))
      .finally(() => setChargement(false));
  }, [entrepriseId, auditId, criteres]);

  if (chargement) return <Loader message="Chargement des analyses…" />;

  if (!analyses || analyses.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-ink-200 px-4 py-10 text-center text-sm text-ink-500">
        Aucune analyse IA sur cette mission. Lancez-en une depuis un critère.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {analyses.map(({ critere, analyse }) => (
        <article
          key={critere.id}
          className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-ink-900">
                  Analyse IA — critère {critere.critereCode}
                </h3>
                <p className="mt-0.5 text-xs text-ink-500">{critere.critereLibelle}</p>
              </div>
            </div>
            <Badge ton="vert">Conformité probable : {analyse.score}%</Badge>
          </div>

          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Synthèse IA
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">{analyse.justification}</p>

              {analyse.pistesAmelioration ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
                    Axes d’amélioration
                  </p>
                  <ul className="mt-2 space-y-1">
                    {enPoints(analyse.pistesAmelioration).map((point) => (
                      <li key={point} className="flex gap-2 text-sm text-ink-700">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-500" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <Rectification
                niveauDeclare={analyse.niveauDeclare}
                niveauRetenu={analyse.niveauRetenu}
                compact
              />
              <TracabiliteIa
                couverturePreuve={analyse.couverturePreuve}
                documents={analyse.documentsAnalyses}
                compact
              />
              <dl className="space-y-2 rounded-xl border border-ink-100 p-4">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-xs text-ink-500">Niveau retenu</dt>
                <dd className="text-sm font-medium tabular-nums text-ink-900">
                  {analyse.niveau}
                </dd>
              </div>
              {analyse.confiance != null ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-xs text-ink-500">Confiance de l’IA</dt>
                  <dd className="text-sm font-medium tabular-nums text-ink-900">
                    {analyse.confiance}%
                  </dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <dt className="text-xs text-ink-500">Risque signalé</dt>
                <dd className="text-sm font-medium text-ink-900">
                  {analyse.categorieRisque ?? 'Aucun'}
                </dd>
              </div>
              </dl>
            </div>
          </div>

          <Link
            to={`/app/${entrepriseId}/audits/${auditId}/criteres/${critere.id}`}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400"
          >
            Voir le critère
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </article>
      ))}
    </div>
  );
}
