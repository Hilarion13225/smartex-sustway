import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { Alerte } from '../ui';
import { api, ApiError } from '../../lib/apiClient';

/** Cadence d'interrogation de l'avancement — une analyse par critère prend quelques secondes. */
const INTERVALLE_MS = 3000;

/**
 * Durée observée d'une analyse, pause comprise : le serveur espace les appels
 * au modèle pour rester sous son plafond de requêtes par minute (voir
 * AnalyseMissionService). Sert uniquement à annoncer un ordre de grandeur.
 */
const SECONDES_PAR_ANALYSE = 6;

/**
 * Fin de mission, en deux gestes séparés : analyser, puis clôturer.
 *
 * Ce sont deux décisions distinctes, portées par deux permissions distinctes
 * (`analyse:executer`, `audit:cloturer`). Lancer l'analyse fait travailler les
 * agents et peut être rejoué autant de fois qu'il le faut ; clôturer ne fait
 * qu'entériner le résultat et n'appelle jamais le modèle. Chaque bloc
 * n'apparaît qu'à qui détient la permission correspondante — une personne
 * habilitée à clôturer sans l'être à analyser ne voit que le second, et le
 * serveur lui dira si l'analyse reste à faire.
 */
export default function ClotureMission({
  entrepriseId,
  auditId,
  statut,
  renseignes,
  total,
  peutAnalyser,
  peutCloturer,
  surTermine,
}) {
  const [avancement, setAvancement] = useState(null);
  const [conditions, setConditions] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [lancement, setLancement] = useState(false);
  const [cloture, setCloture] = useState(false);
  const minuteur = useRef(null);

  const base = `/api/v1/entreprises/${entrepriseId}/audits/${auditId}`;
  const cheminAnalyse = `${base}/analyse`;
  const cheminCloture = `${base}/cloture`;

  const interroger = useCallback(async () => {
    try {
      const etat = await api.get(cheminAnalyse);
      setAvancement(etat);
      return etat;
    } catch {
      return null;
    }
  }, [cheminAnalyse]);

  const relireConditions = useCallback(async () => {
    try {
      setConditions(await api.get(cheminCloture));
    } catch {
      setConditions(null);
    }
  }, [cheminCloture]);

  // Une analyse lancée depuis un autre écran, ou avant un rechargement de
  // page, doit rester visible : on interroge une fois au montage.
  useEffect(() => {
    interroger();
    relireConditions();
    return () => clearInterval(minuteur.current);
  }, [interroger, relireConditions]);

  useEffect(() => {
    if (!avancement || avancement.terminee) {
      clearInterval(minuteur.current);
      return undefined;
    }
    minuteur.current = setInterval(async () => {
      const etat = await interroger();
      if (etat?.terminee) {
        clearInterval(minuteur.current);
        relireConditions();
        surTermine?.();
      }
    }, INTERVALLE_MS);
    return () => clearInterval(minuteur.current);
  }, [avancement, interroger, relireConditions, surTermine]);

  async function lancerAnalyse() {
    setErreur(null);
    setLancement(true);
    try {
      setAvancement(await api.post(cheminAnalyse, {}));
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Analyse impossible');
    } finally {
      setLancement(false);
    }
  }

  async function cloturer() {
    setErreur(null);
    setCloture(true);
    try {
      await api.post(cheminCloture, {});
      surTermine?.();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Clôture impossible');
      relireConditions();
    } finally {
      setCloture(false);
    }
  }

  if (statut === 'TERMINE') {
    return (
      <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          Mission clôturée. Le score reflète l’analyse IA de l’ensemble des critères renseignés.
        </p>
      </div>
    );
  }

  const enCours = avancement && !avancement.terminee;
  const cloturable = conditions?.cloturable === true;

  return (
    <div className="space-y-4">
      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

      {peutAnalyser ? (
        <section className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <Sparkles className="h-4 w-4 text-brand-600" aria-hidden />
            Analyser la mission
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            L’IA analysera les {total} critères de la mission et confrontera chaque déclaration aux
            preuves déposées. L’analyse ne clôture rien : elle peut être relancée.
          </p>
          <p className="mt-1 text-xs text-ink-500">
            {renseignes} critère{renseignes > 1 ? 's' : ''} renseigné{renseignes > 1 ? 's' : ''} sur{' '}
            {total}. Les critères sans déclaration ni preuve resteront hors du score.
            {renseignes > 0 ? (
              <>
                {' '}
                Comptez environ {Math.max(1, Math.ceil((renseignes * SECONDES_PAR_ANALYSE) / 60))} minute
                {Math.ceil((renseignes * SECONDES_PAR_ANALYSE) / 60) > 1 ? 's' : ''} : les appels au
                modèle sont espacés pour rester sous son plafond de requêtes.
              </>
            ) : null}
          </p>

          {avancement ? (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-ink-600">
                <span className="inline-flex items-center gap-1.5">
                  {enCours ? (
                    <Sparkles className="h-3.5 w-3.5 animate-pulse text-brand-600" aria-hidden />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                  )}
                  {enCours ? 'Analyse en cours…' : 'Analyse terminée'}
                </span>
                <span className="tabular-nums">
                  {avancement.traites} / {avancement.total}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all duration-500"
                  style={{
                    width: `${avancement.total === 0 ? 0 : (avancement.traites / avancement.total) * 100}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-ink-500">
                {avancement.analyses} analysé{avancement.analyses > 1 ? 's' : ''} ·{' '}
                {avancement.sansElement} sans élément à analyser
                {avancement.echecs > 0 ? ` · ${avancement.echecs} en échec` : ''}
              </p>
            </div>
          ) : null}

          {!enCours ? (
            <button type="button" className="btn-primary mt-4" onClick={lancerAnalyse} disabled={lancement}>
              <Sparkles className="h-4 w-4" aria-hidden />
              {lancement ? 'Lancement…' : avancement ? 'Relancer l’analyse' : 'Lancer l’analyse'}
            </button>
          ) : null}
        </section>
      ) : null}

      {peutCloturer ? (
        <section className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <Lock className="h-4 w-4 text-brand-600" aria-hidden />
            Clôturer la mission
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            La clôture fige le score obtenu. Elle ne lance aucune analyse.
          </p>
          {!cloturable && conditions?.motif ? (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">{conditions.motif}</p>
          ) : null}
          <button
            type="button"
            className="btn-primary mt-4"
            onClick={cloturer}
            disabled={cloture || !cloturable}
          >
            <Lock className="h-4 w-4" aria-hidden />
            {cloture ? 'Clôture…' : 'Clôturer la mission'}
          </button>
        </section>
      ) : null}
    </div>
  );
}
