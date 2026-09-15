import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Download, Medal } from 'lucide-react';
import clsx from 'clsx';
import Revele from '../components/Revele';
import { Alerte, Loader, Vide } from '../components/ui';
import { api } from '../lib/apiClient';
import { useApiAuth } from '../auth/useApiAuth';
import { exporterCsv } from '../lib/export';
import { formaterScore } from '../lib/scoreAffiche';

/** Teinte de la médaille des trois premiers rangs. */
const MEDAILLES = ['text-amber-500', 'text-ink-400', 'text-amber-700'];

/**
 * Classement des organisations, global et par domaine.
 *
 * Chaque organisation est représentée par sa mission la plus récente : c'est
 * l'état courant de sa démarche, alors qu'agréger toutes ses missions
 * mélangerait des évaluations séparées par des années.
 *
 * Les organisations sans mission évaluée ne sont pas classées mais restent
 * listées à part — les masquer laisserait croire qu'elles n'existent pas.
 */
export default function Classement() {
  const { entreprises } = useApiAuth();

  const [lignes, setLignes] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [domaineChoisi, setDomaineChoisi] = useState('');

  const charger = useCallback(async () => {
    setChargement(true);
    const resultats = await Promise.all(
      entreprises.map(async (entreprise) => {
        const audits = await api.get(`/api/v1/entreprises/${entreprise.id}/audits`).catch(() => []);
        // Mission la plus récente : celle qui décrit l'état courant.
        const derniere = [...(audits ?? [])].sort(
          (a, b) => new Date(b.dateDebut) - new Date(a.dateDebut)
        )[0];
        if (!derniere) return { entreprise, mission: null, score: null };
        const score = await api
          .get(`/api/v1/entreprises/${entreprise.id}/audits/${derniere.id}/score`)
          .catch(() => null);
        return { entreprise, mission: derniere, score };
      })
    );
    setLignes(resultats);
    setChargement(false);
  }, [entreprises]);

  useEffect(() => {
    charger();
  }, [charger]);

  /** Domaines proposés au classement : ceux d'au moins une mission évaluée. */
  const domaines = useMemo(() => {
    const connus = new Map();
    (lignes ?? []).forEach((l) =>
      (l.score?.domaines ?? []).forEach((d) => {
        if (!connus.has(d.domaineCode)) connus.set(d.domaineCode, d.domaineNom ?? d.domaineCode);
      })
    );
    return [...connus.entries()].map(([code, nom]) => ({ code, nom }));
  }, [lignes]);

  const { classees, nonClassees } = useMemo(() => {
    const avec = [];
    const sans = [];

    (lignes ?? []).forEach((l) => {
      if (!l.score || l.score.nombreCriteresEvalues === 0) {
        sans.push(l);
        return;
      }
      if (!domaineChoisi) {
        avec.push({
          ...l,
          valeur: Number(l.score.scoreGlobal),
          note: Number(l.score.noteTotale ?? 0),
          coefficient: Number(l.score.coefficientTotal ?? 0),
          evalues: l.score.nombreCriteresEvalues,
          total: l.score.nombreCriteresTotal,
        });
        return;
      }
      const d = l.score.domaines?.find((x) => x.domaineCode === domaineChoisi);
      // Une organisation dont le domaine choisi n'est pas encore évalué n'est
      // pas comparable sur ce domaine : elle rejoint les non classées.
      if (!d || d.nombreCriteresEvalues === 0) {
        sans.push(l);
        return;
      }
      avec.push({
        ...l,
        valeur: Number(d.score),
        note: Number(d.noteTotale ?? 0),
        coefficient: Number(d.coefficientTotal ?? 0),
        evalues: d.nombreCriteresEvalues,
        total: d.nombreCriteresTotal,
      });
    });

    avec.sort((a, b) => b.valeur - a.valeur);
    return { classees: avec, nonClassees: sans };
  }, [lignes, domaineChoisi]);

  const intitule = domaineChoisi
    ? domaines.find((d) => d.code === domaineChoisi)?.nom ?? domaineChoisi
    : 'Score global';

  function exporter() {
    exporterCsv(
      'classement.csv',
      ['Rang', 'Organisation', 'Mission', 'Score', 'Note totale', 'Coefficient total', 'Critères évalués'],
      classees.map((l, index) => [
        index + 1,
        l.entreprise.raisonSociale,
        l.mission?.nom ?? '',
        formaterScore(l.valeur),
        l.note,
        l.coefficient,
        `${l.evalues}/${l.total}`,
      ])
    );
  }

  if (chargement) return <Loader message="Calcul du classement…" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ink-900">Classement</h1>
          <p className="mt-1 text-sm text-ink-500">
            Organisations classées sur leur mission la plus récente, globalement ou domaine par
            domaine.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          {/* Largeur bornée : les noms de domaines du référentiel Smartex font
              plusieurs lignes, et un select en largeur automatique étirerait
              la page bien au-delà de l'écran sur mobile. */}
          <select
            className="input w-full sm:w-56"
            aria-label="Classer sur un domaine"
            value={domaineChoisi}
            onChange={(e) => setDomaineChoisi(e.target.value)}
          >
            <option value="">Score global</option>
            {domaines.map((d) => (
              <option key={d.code} value={d.code}>
                {d.nom}
              </option>
            ))}
          </select>
          <button type="button" className="btn-secondary" onClick={exporter}>
            <Download className="h-4 w-4" aria-hidden />
            Exporter
          </button>
        </div>
      </div>

      {classees.length === 0 ? (
        <Vide message="Aucune organisation n’a de mission évaluée sur ce périmètre." />
      ) : (
        <Revele>
          <section className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-ink-900">{intitule}</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              {classees.length} organisation{classees.length > 1 ? 's' : ''} classée
              {classees.length > 1 ? 's' : ''}
            </p>

            <div className="mt-4 hidden overflow-x-auto lg:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ink-100">
                    <th className="th w-12">Rang</th>
                    <th className="th">Organisation</th>
                    <th className="th">Mission</th>
                    <th className="th text-right">Note</th>
                    <th className="th text-right">Coef.</th>
                    <th className="th text-right">Score</th>
                    <th className="th text-right">Évalués</th>
                    <th className="th sr-only">Ouvrir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {classees.map((l, index) => (
                    <tr key={l.entreprise.id} className="transition-colors hover:bg-ink-50">
                      <td className="td">
                        <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums text-ink-900">
                          {index < 3 ? (
                            <Medal className={clsx('h-4 w-4', MEDAILLES[index])} aria-hidden />
                          ) : null}
                          {index + 1}
                        </span>
                      </td>
                      <td className="td max-w-[14rem] truncate font-medium text-ink-900">
                        {l.entreprise.raisonSociale}
                      </td>
                      <td className="td max-w-[12rem] truncate text-ink-600">
                        {l.mission?.nom ?? '—'}
                      </td>
                      <td className="td text-right tabular-nums">{l.note}</td>
                      <td className="td text-right tabular-nums">{l.coefficient}</td>
                      <td className="td text-right font-semibold tabular-nums text-ink-900">
                        {formaterScore(l.valeur)} / 5
                      </td>
                      <td className="td text-right tabular-nums text-ink-500">
                        {l.evalues}/{l.total}
                      </td>
                      <td className="td text-right">
                        <Link
                          to={`/app/${l.entreprise.id}/audits/${l.mission.id}`}
                          aria-label={`Ouvrir la mission de ${l.entreprise.raisonSociale}`}
                          className="inline-flex rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-brand-600"
                        >
                          <ArrowRight className="h-4 w-4" aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sous `lg` : une carte par organisation. */}
            <ul className="mt-4 space-y-3 lg:hidden">
              {classees.map((l, index) => (
                <li key={l.entreprise.id}>
                  <Link
                    to={`/app/${l.entreprise.id}/audits/${l.mission.id}`}
                    className="block rounded-2xl border border-ink-100 p-4 transition-colors hover:border-brand-200 hover:bg-ink-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-ink-900">
                          {index < 3 ? (
                            <Medal className={clsx('h-4 w-4', MEDAILLES[index])} aria-hidden />
                          ) : null}
                          {index + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink-900">
                            {l.entreprise.raisonSociale}
                          </span>
                          <span className="block truncate text-xs text-ink-500">
                            {l.mission?.nom}
                          </span>
                        </span>
                      </div>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-ink-900">
                        {formaterScore(l.valeur)} / 5
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-ink-500">
                      Note {l.note} · coefficient {l.coefficient} · {l.evalues}/{l.total} critères
                      évalués
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </Revele>
      )}

      {nonClassees.length > 0 ? (
        <Revele delai={60}>
          <Alerte ton="neutre">
            {nonClassees.length} organisation{nonClassees.length > 1 ? 's ne sont' : ' n’est'} pas
            classée{nonClassees.length > 1 ? 's' : ''} sur ce périmètre, faute de critère évalué :{' '}
            {nonClassees.map((l) => l.entreprise.raisonSociale).join(', ')}.
          </Alerte>
        </Revele>
      ) : null}
    </div>
  );
}
