import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Plus, Sparkles, TriangleAlert } from 'lucide-react';
import clsx from 'clsx';
import { Alerte, Badge, Loader } from '../ui';
import { api, ApiError } from '../../lib/apiClient';

const TONS_NIVEAU = { CRITIQUE: 'rouge', MAJEURE: 'ambre', MODEREE: 'bleu', MINEURE: 'neutre' };
const RANG_NIVEAU = { CRITIQUE: 0, MAJEURE: 1, MODEREE: 2, MINEURE: 3 };

/** Priorité d'action déduite de la gravité de l'écart qui la motive. */
const PRIORITE_PAR_NIVEAU = {
  CRITIQUE: 'HAUTE',
  MAJEURE: 'HAUTE',
  MODEREE: 'MOYENNE',
  MINEURE: 'BASSE',
};

/**
 * Domaines les plus faibles de la mission et actions suggérées par l'IA.
 *
 * Les écarts sont regroupés par domaine plutôt que listés à plat : c'est au
 * niveau du domaine qu'une démarche se pilote, et une liste de quatre-vingts
 * critères ne dit pas où porter l'effort.
 *
 * Les suggestions ne sont pas inventées ici : elles proviennent des pistes
 * d'amélioration produites par le pipeline d'agents et recopiées dans la
 * description de chaque non-conformité.
 */
export default function VoletPlanAction({ entrepriseId, auditId, criteres, score, peutModifier }) {
  const [nonConformites, setNonConformites] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [creees, setCreees] = useState(() => new Set());
  const [enCours, setEnCours] = useState(null);

  const rafraichir = useCallback(() => {
    setChargement(true);
    api
      .get(`/api/v1/entreprises/${entrepriseId}/audits/${auditId}/non-conformites`)
      .then((liste) => setNonConformites(liste ?? []))
      .catch((err) => setErreur(err instanceof ApiError ? err.message : 'Chargement impossible'))
      .finally(() => setChargement(false));
  }, [entrepriseId, auditId]);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  /** Domaine de chaque critère de la mission, pour regrouper les écarts. */
  const domaineParCritere = useMemo(() => {
    const table = new Map();
    criteres.forEach((c) => table.set(c.id, c.domaineCode));
    return table;
  }, [criteres]);

  const domaines = useMemo(() => {
    if (!nonConformites) return [];
    const scoresParDomaine = new Map(
      (score?.domaines ?? []).map((d) => [d.domaineCode, d])
    );

    const groupes = new Map();
    nonConformites
      .filter((nc) => nc.statut === 'OUVERTE')
      .forEach((nc) => {
        const code = domaineParCritere.get(nc.auditCritereId) ?? '—';
        if (!groupes.has(code)) {
          const infos = scoresParDomaine.get(code);
          groupes.set(code, {
            code,
            nom: infos?.domaineNom ?? code,
            score: infos?.score == null ? null : Number(infos.score),
            ecarts: [],
          });
        }
        groupes.get(code).ecarts.push(nc);
      });

    // Le domaine le plus faible d'abord ; à score égal, celui qui porte les
    // écarts les plus graves.
    return [...groupes.values()]
      .map((g) => ({
        ...g,
        ecarts: [...g.ecarts].sort(
          (a, b) => (RANG_NIVEAU[a.niveau] ?? 9) - (RANG_NIVEAU[b.niveau] ?? 9)
        ),
        gravite: Math.min(...g.ecarts.map((e) => RANG_NIVEAU[e.niveau] ?? 9)),
      }))
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0) || a.gravite - b.gravite);
  }, [nonConformites, domaineParCritere, score]);

  async function creerAction(ecart) {
    setEnCours(ecart.id);
    setErreur(null);
    try {
      await api.post(
        `/api/v1/entreprises/${entrepriseId}/audits/${auditId}/non-conformites/${ecart.id}/actions`,
        {
          titre: `Traiter : ${ecart.critereLibelle}`.slice(0, 255),
          // La description reprend l'analyse de l'IA plutôt qu'un texte
          // générique : c'est elle qui indique quoi corriger.
          description: ecart.description ?? null,
          priorite: PRIORITE_PAR_NIVEAU[ecart.niveau] ?? 'MOYENNE',
        }
      );
      setCreees((precedent) => new Set(precedent).add(ecart.id));
      rafraichir();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Création de l’action impossible');
    } finally {
      setEnCours(null);
    }
  }

  if (chargement) return <Loader message="Analyse des écarts…" />;

  if (domaines.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-ink-200 px-4 py-10 text-center text-sm text-ink-500">
        Aucun écart ouvert sur cette mission — rien à corriger pour l’instant.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {erreur ? <Alerte ton="rouge">{erreur}</Alerte> : null}

      <p className="text-sm text-ink-500">
        Domaines classés du plus faible au plus solide. Les pistes proviennent de l’analyse IA de
        chaque critère.
      </p>

      {domaines.map((domaine) => (
        <section
          key={domaine.code}
          className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-ink-900" title={domaine.nom}>
                {domaine.nom}
              </h3>
              <p className="mt-0.5 text-xs text-ink-500">
                {domaine.ecarts.length} écart{domaine.ecarts.length > 1 ? 's' : ''} ouvert
                {domaine.ecarts.length > 1 ? 's' : ''}
              </p>
            </div>
            <span
              className={clsx(
                'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
                domaine.score == null
                  ? 'bg-ink-100 text-ink-600'
                  : domaine.score < 2.5
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
              )}
            >
              {domaine.score == null ? 'Non noté' : `${domaine.score.toFixed(2)} / 5`}
            </span>
          </div>

          <ul className="mt-4 space-y-3">
            {domaine.ecarts.map((ecart) => {
              const dejaCreee = creees.has(ecart.id) || ecart.nombreActionsCorrectives > 0;
              return (
                <li key={ecart.id} className="rounded-xl border border-ink-100 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900">
                        <span className="font-mono text-xs text-ink-400">{ecart.critereCode}</span>{' '}
                        {ecart.critereLibelle}
                      </p>
                    </div>
                    <Badge ton={TONS_NIVEAU[ecart.niveau] ?? 'neutre'}>{ecart.niveau}</Badge>
                  </div>

                  {ecart.description ? (
                    <div className="mt-3 flex gap-2">
                      <Sparkles
                        className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400"
                        aria-hidden
                      />
                      <p className="text-sm leading-relaxed text-ink-600">{ecart.description}</p>
                    </div>
                  ) : null}

                  {peutModifier ? (
                    <button
                      type="button"
                      onClick={() => creerAction(ecart)}
                      disabled={dejaCreee || enCours === ecart.id}
                      className={clsx(
                        'mt-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                        dejaCreee
                          ? 'cursor-default border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                          : 'border-ink-200 text-ink-700 hover:border-brand-300 hover:text-brand-700 disabled:opacity-60'
                      )}
                    >
                      {dejaCreee ? (
                        <>
                          <Check className="h-4 w-4" aria-hidden />
                          Action créée
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" aria-hidden />
                          {enCours === ecart.id ? 'Création…' : 'Créer l’action corrective'}
                        </>
                      )}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p className="flex items-start gap-2 text-xs text-ink-500">
        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Une action créée rejoint le plan d’actions de la mission, où elle peut être assignée et
        datée.
      </p>
    </div>
  );
}
