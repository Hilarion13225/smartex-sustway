import { useState } from 'react';
import { AlertTriangle, ArrowRight, Info, Sparkles } from 'lucide-react';
import JaugeCirculaire from './JaugeCirculaire';
import TracabiliteIa from './TracabiliteIa';
import Rectification from './Rectification';

/**
 * Carte d'analyse IA d'un critère : probabilité de conformité, justification et
 * détail (risque, pistes d'amélioration) repliés par défaut.
 *
 * L'analyse n'est pas recalculée à la volée pendant la saisie — le pipeline
 * d'agents écrit dans l'historique d'évaluation. Quand la saisie courante
 * s'écarte de l'analyse affichée, la carte le signale et propose de relancer.
 */
export default function CarteAnalyseIa({
  analyse,
  enCours,
  desynchronisee,
  erreur,
  peutAnalyser,
}) {
  const [detailOuvert, setDetailOuvert] = useState(false);

  return (
    <section className="rounded-2xl border border-ink-100 bg-surface p-6 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <h3 className="text-sm font-semibold text-ink-900">Analyse IA</h3>
      </div>

      <hr className="my-4 border-ink-100" />

      {erreur ? (
        <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {erreur}
        </p>
      ) : null}

      {!analyse && !enCours ? (
        <div className="py-2 text-center">
          <p className="text-sm text-ink-500">
            Aucune analyse IA sur ce critère pour l’instant.
          </p>
          <p className="mt-1.5 text-xs text-ink-400">
            L’analyse s’appuie sur les preuves déposées et les réponses au questionnaire.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-medium text-ink-700">Probabilité de conformité</h4>
            <span
              title="Probabilité, estimée par le pipeline d’agents IA, que le critère soit conforme au vu des éléments fournis."
              className="text-ink-400"
            >
              <Info className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">
                Probabilité, estimée par le pipeline d’agents IA, que le critère soit conforme au vu
                des éléments fournis.
              </span>
            </span>
          </div>

          <div className="mt-4">
            <JaugeCirculaire
              valeur={analyse?.score ?? 0}
              libelle={analyse?.niveau}
              enCours={enCours}
            />
          </div>

          {analyse?.confiance != null && !enCours ? (
            <p className="mt-3 text-center text-xs text-ink-400">
              Confiance de l’analyse : {analyse.confiance}%
            </p>
          ) : null}

          {analyse?.justification && !enCours ? (
            <div className="mt-5">
              <h4 className="text-sm font-medium text-ink-700">Justification IA</h4>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{analyse.justification}</p>

              <div className="mt-4">
                <Rectification
                  niveauDeclare={analyse.niveauDeclare}
                  niveauRetenu={analyse.niveauRetenu}
                  compact
                />
              </div>

              <div className="mt-3">
                <TracabiliteIa
                  couverturePreuve={analyse.couverturePreuve}
                  documents={analyse.documentsAnalyses}
                  compact
                />
              </div>

              {analyse.categorieRisque || analyse.pistesAmelioration ? (
                <>
                  <button
                    type="button"
                    onClick={() => setDetailOuvert((ouvert) => !ouvert)}
                    aria-expanded={detailOuvert}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400"
                  >
                    {detailOuvert ? 'Masquer l’analyse détaillée' : 'Voir l’analyse détaillée'}
                    <ArrowRight
                      className={`h-3.5 w-3.5 transition-transform ${detailOuvert ? 'rotate-90' : ''}`}
                      aria-hidden
                    />
                  </button>

                  {detailOuvert ? (
                    <div className="mt-3 space-y-3 border-t border-ink-100 pt-3">
                      {analyse.categorieRisque ? (
                        <div>
                          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                            Risque : {analyse.categorieRisque}
                          </p>
                          {analyse.justificationRisque ? (
                            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
                              {analyse.justificationRisque}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                      {analyse.pistesAmelioration ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                            Pistes d’amélioration
                          </p>
                          <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
                            {analyse.pistesAmelioration}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      {desynchronisee && !enCours ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          Vos dernières saisies ne sont pas prises en compte par cette analyse.
        </p>
      ) : null}

      {/* L'analyse ne se lance plus critère par critère : on répond et on
          dépose les preuves partout, puis on lance une fois depuis la mission
          (« Analyser la mission »). Attendre le service d'agents à chaque
          critère immobilisait l'auditeur au milieu de sa collecte. */}
      {peutAnalyser && !enCours ? (
        <p className="mt-4 text-xs text-ink-500">
          {desynchronisee
            ? 'La prochaine analyse de la mission reprendra ce critère avec vos dernières saisies.'
            : 'L’analyse IA se lance depuis la mission, une fois la collecte terminée.'}
        </p>
      ) : null}
    </section>
  );
}
