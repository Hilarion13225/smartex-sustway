import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { Alerte } from '../ui';
import { api, ApiError } from '../../lib/apiClient';

/** Cadence d'interrogation de l'avancement — une analyse par critère prend quelques secondes. */
const INTERVALLE_MS = 3000;

/**
 * Durée observée d'une analyse, pause comprise : le serveur espace les appels
 * au modèle pour rester sous son plafond de requêtes par minute (voir
 * ClotureMissionService). Sert uniquement à annoncer un ordre de grandeur.
 */
const SECONDES_PAR_ANALYSE = 6;

/**
 * Clôture d'une mission : lance l'analyse IA de tous ses critères, puis fige
 * le résultat.
 *
 * Les déclarations et les preuves s'accumulent pendant la mission sans
 * produire de note ; c'est ici que l'ensemble est confronté aux agents et que
 * le score devient définitif. La passe s'exécutant en arrière-plan, son
 * avancement est interrogé jusqu'à la fin — sans quoi le superviseur n'aurait
 * aucun retour pendant plusieurs minutes.
 */
export default function ClotureMission({ entrepriseId, auditId, statut, renseignes, total, surTermine }) {
  const [avancement, setAvancement] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [lancement, setLancement] = useState(false);
  const minuteur = useRef(null);

  const chemin = `/api/v1/entreprises/${entrepriseId}/audits/${auditId}/cloture`;

  const interroger = useCallback(async () => {
    try {
      const etat = await api.get(chemin);
      setAvancement(etat);
      return etat;
    } catch {
      return null;
    }
  }, [chemin]);

  // Une clôture lancée depuis un autre écran, ou avant un rechargement de
  // page, doit rester visible : on interroge une fois au montage.
  useEffect(() => {
    interroger();
    return () => clearInterval(minuteur.current);
  }, [interroger]);

  useEffect(() => {
    if (!avancement || avancement.terminee) {
      clearInterval(minuteur.current);
      return undefined;
    }
    minuteur.current = setInterval(async () => {
      const etat = await interroger();
      if (etat?.terminee) {
        clearInterval(minuteur.current);
        surTermine?.();
      }
    }, INTERVALLE_MS);
    return () => clearInterval(minuteur.current);
  }, [avancement, interroger, surTermine]);

  async function lancer() {
    setErreur(null);
    setLancement(true);
    try {
      setAvancement(await api.post(chemin, {}));
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Clôture impossible');
    } finally {
      setLancement(false);
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

  return (
    <section className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
        <Lock className="h-4 w-4 text-brand-600" aria-hidden />
        Clôturer la mission
      </h2>
      <p className="mt-1 text-sm text-ink-500">
        L’IA analysera les {total} critères de la mission et confrontera chaque déclaration aux
        preuves déposées. Le score obtenu devient définitif.
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

      {erreur ? (
        <div className="mt-3">
          <Alerte ton="rouge">{erreur}</Alerte>
        </div>
      ) : null}

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
        <button type="button" className="btn-primary mt-4" onClick={lancer} disabled={lancement}>
          <Sparkles className="h-4 w-4" aria-hidden />
          {lancement ? 'Lancement…' : 'Lancer l’analyse et clôturer'}
        </button>
      ) : null}
    </section>
  );
}
